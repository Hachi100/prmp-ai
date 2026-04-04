/**
 * Script de migration de la base de donnees
 * Active pgvector, cree l'index HNSW, configure l'audit trail
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../src/lib/db/schema";

async function main() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL non defini");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log("🗄️  Migration PRMP-Pro...");

  // 1. Activer pgvector
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
  console.log("✅ Extension pgvector activee");

  // 2. Activer uuid-ossp
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  console.log("✅ Extension uuid-ossp activee");

  // 3. Appliquer les migrations Drizzle
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("✅ Migrations Drizzle appliquees");

  // 4. Creer l'index HNSW sur les embeddings
  await pool.query(`
    CREATE INDEX IF NOT EXISTS chunks_juridiques_embedding_idx
    ON chunks_juridiques
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  `);
  console.log("✅ Index HNSW cree sur chunks_juridiques.embedding");

  // 5. Configurer l'audit trail (trigger PostgreSQL)
  await pool.query(`
    CREATE OR REPLACE FUNCTION fn_audit_trail()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trail (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'insert', row_to_json(NEW));
      ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'update', row_to_json(OLD), row_to_json(NEW));
      ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'delete', row_to_json(OLD));
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);
  console.log("✅ Fonction d'audit trail creee");

  // 6. Appliquer le trigger sur les tables principales
  const tablesPrincipales = [
    "marches",
    "contrats",
    "attributions",
    "evaluations",
    "daos",
  ];

  for (const table of tablesPrincipales) {
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_audit_${table} ON ${table};
      CREATE TRIGGER trg_audit_${table}
      AFTER INSERT OR UPDATE OR DELETE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION fn_audit_trail();
    `);
  }
  console.log(`✅ Triggers d'audit configures sur : ${tablesPrincipales.join(", ")}`);

  await pool.end();
  console.log("\n🚀 Migration terminee avec succes !");
}

main().catch((err) => {
  console.error("❌ Erreur de migration :", err);
  process.exit(1);
});
