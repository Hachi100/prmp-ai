/**
 * Schema : Base juridique pour le RAG (Retrieval-Augmented Generation)
 * Source : Loi 2020-26 (127 articles) + Decrets + Manuel de Procedures
 *
 * Utilise pgvector pour la recherche semantique
 * Modele d'embedding : Voyage AI voyage-3 (dimension 1024)
 * Index HNSW pour les requetes de similarite cosinus
 */

import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

/**
 * Type personnalise pour pgvector
 * Dimension 1024 pour Voyage AI voyage-3
 * Stocke en JSONB si pgvector n'est pas disponible (mode degradé)
 */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "text"; // Utilise text en attendant pgvector (stocker JSON serialise)
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    try {
      return JSON.parse(value) as number[];
    } catch {
      return [];
    }
  },
});

/**
 * Chunks de textes juridiques indexes pour le RAG
 * Chaque chunk correspond a un article ou une section de texte juridique
 * Index HNSW sur le champ embedding pour la recherche semantique
 */
export const chunksJuridiques = pgTable("chunks_juridiques", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Source du texte (ex: "Loi 2020-26", "Decret 2020-599", "Manuel ARMP")
   */
  source: text("source").notNull(),
  /**
   * Reference de l'article (ex: "Art. 54 al. 1", "Section 2.4")
   */
  articleRef: text("article_ref").notNull(),
  titre: text("titre").notNull(),
  contenu: text("contenu").notNull(),
  /**
   * Vecteur d'embedding genere par Voyage AI voyage-3 (1024 dimensions)
   * Index HNSW avec distance cosinus pour la recherche semantique
   */
  embedding: vector("embedding").notNull(),
  /** Nombre de tokens du chunk (pour gestion du contexte) */
  tokens: integer("tokens"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Log des recherches juridiques
 * Utile pour ameliorer les requetes et detecter les lacunes
 */
export const recherchesLog = pgTable("recherches_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  query: text("query").notNull(),
  resultsCount: integer("results_count").notNull(),
  /** Temps de reponse en millisecondes */
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// SQL pour creer l'index HNSW (uniquement si pgvector est disponible)
export const createVectorIndexSQL = sql`SELECT 1`; // Desactive en mode degrade

// Relations
export const recherchesLogRelations = relations(recherchesLog, ({ one }) => ({
  user: one(users, {
    fields: [recherchesLog.userId],
    references: [users.id],
  }),
}));

export type ChunkJuridique = typeof chunksJuridiques.$inferSelect;
export type NewChunkJuridique = typeof chunksJuridiques.$inferInsert;
export type RechercheLog = typeof recherchesLog.$inferSelect;
