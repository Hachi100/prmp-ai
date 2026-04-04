/**
 * Script d'indexation RAG — lit TOUS les documents de data/
 * Formats supportes : PDF, DOCX, TXT, MD, JSON
 *
 * Usage :
 *   VOYAGE_API_KEY=votre-cle npx tsx scripts/index-documents.ts
 *   ou : npm run rag:index-all
 *
 * Structure attendue dans data/ :
 *   loi/          Loi 2020-26, Loi PPP
 *   decrets/      Decrets 2020-595 a 605
 *   manuels/      Manuel procedures, controle, recours
 *   circulaires/  Circulaires ARMP 2022-2025
 *   dao-types/    DAO-types officiels
 *   rapports-types/ Modeles de rapports
 *   avis-armp/    Avis et decisions ARMP
 *   jurisprudence/ Decisions de recours
 */

import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { existsSync } from "node:fs";

// Importation dynamique pour eviter les erreurs si les packages sont absents
let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | null = null;
let mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } | null = null;

async function loadParsers() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pdfParse = require("pdf-parse");
    console.log("  ✓ pdf-parse charge");
  } catch {
    console.log("  ⚠ pdf-parse non disponible — PDF ignores");
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mammoth = require("mammoth");
    console.log("  ✓ mammoth charge");
  } catch {
    console.log("  ⚠ mammoth non disponible — DOCX ignores");
  }
}

// Mapping dossier → source juridique
const DOSSIER_SOURCE: Record<string, string> = {
  loi: "Loi",
  decrets: "Decret",
  manuels: "Manuel ARMP",
  circulaires: "Circulaire ARMP",
  "dao-types": "DAO-type ARMP",
  "rapports-types": "Rapport-type ARMP",
  "avis-armp": "Avis ARMP",
  jurisprudence: "Jurisprudence ARMP",
};

interface ChunkInput {
  source: string;
  articleRef: string;
  titre: string;
  contenu: string;
}

/**
 * Decoupe un texte long en chunks de ~500 tokens (~2000 caracteres)
 * Essaie de couper aux paragraphes pour garder la coherence
 */
function chunkerTexte(texte: string, source: string, titre: string): ChunkInput[] {
  const CHUNK_SIZE = 1800; // caracteres
  const OVERLAP = 200;

  // Nettoyer le texte
  const propre = texte
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (propre.length <= CHUNK_SIZE) {
    return [{ source, articleRef: "—", titre, contenu: propre }];
  }

  const chunks: ChunkInput[] = [];
  const paragraphes = propre.split(/\n\n+/);
  let buffer = "";
  let chunkNum = 1;

  for (const para of paragraphes) {
    if (buffer.length + para.length > CHUNK_SIZE && buffer.length > 0) {
      chunks.push({
        source,
        articleRef: `Section ${chunkNum}`,
        titre: `${titre} — Partie ${chunkNum}`,
        contenu: buffer.trim(),
      });
      // Overlap : reprendre les derniers 200 caracteres
      buffer = buffer.slice(-OVERLAP) + "\n\n" + para;
      chunkNum++;
    } else {
      buffer = buffer ? buffer + "\n\n" + para : para;
    }
  }

  if (buffer.trim()) {
    chunks.push({
      source,
      articleRef: `Section ${chunkNum}`,
      titre: `${titre} — Partie ${chunkNum}`,
      contenu: buffer.trim(),
    });
  }

  return chunks;
}

/**
 * Detecte la reference juridique depuis le nom de fichier
 * Ex: "circulaire-2024-002.pdf" → "Circulaire ARMP 2024-002"
 */
function getArticleRef(filename: string): string {
  const name = basename(filename, extname(filename));
  // Extraire les numeros
  const match = name.match(/(\d{4}[-_]\d{3,}|\d{4})/);
  return match ? match[0].replace(/_/g, "-") : name;
}

async function lireDocument(filePath: string): Promise<string | null> {
  const ext = extname(filePath).toLowerCase();

  try {
    if (ext === ".txt" || ext === ".md") {
      return await readFile(filePath, "utf-8");
    }

    if (ext === ".json") {
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      // Si c'est un tableau de chunks, retourner null (traite separement)
      if (Array.isArray(data)) return null;
      // Sinon concatener les valeurs texte
      return JSON.stringify(data, null, 2);
    }

    if (ext === ".pdf" && pdfParse) {
      const buffer = await readFile(filePath);
      const result = await pdfParse(buffer);
      return result.text;
    }

    if ((ext === ".docx" || ext === ".doc") && mammoth) {
      const buffer = await readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    console.log(`    ⚠ Format non supporte : ${ext}`);
    return null;
  } catch (err) {
    console.log(`    ❌ Erreur lecture ${basename(filePath)} : ${err}`);
    return null;
  }
}

async function indexerDossier(
  dossierPath: string,
  sourcePrefix: string
): Promise<ChunkInput[]> {
  if (!existsSync(dossierPath)) return [];

  const files = await readdir(dossierPath);
  const chunks: ChunkInput[] = [];

  for (const file of files) {
    if (file.startsWith(".")) continue; // ignorer .gitkeep etc.

    const filePath = join(dossierPath, file);
    const ext = extname(file).toLowerCase();
    const titre = basename(file, ext).replace(/[-_]/g, " ");
    const source = `${sourcePrefix} — ${basename(file, ext)}`;
    const articleRef = getArticleRef(file);

    console.log(`  📄 ${file}`);

    // Traitement special pour JSON (peut etre des chunks pre-structures)
    if (ext === ".json") {
      try {
        const content = await readFile(filePath, "utf-8");
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          // Format pre-structure [{ source, articleRef, titre, contenu }]
          const jsonChunks = data as ChunkInput[];
          chunks.push(...jsonChunks);
          console.log(`     → ${jsonChunks.length} chunks JSON charges`);
          continue;
        }
      } catch {
        // pas du JSON valide, lire comme texte
      }
    }

    const texte = await lireDocument(filePath);
    if (!texte) continue;

    const fileChunks = chunkerTexte(texte, source, titre);
    // Mettre la vraie ref sur le premier chunk
    if (fileChunks[0]) fileChunks[0].articleRef = articleRef;
    chunks.push(...fileChunks);
    console.log(`     → ${fileChunks.length} chunk(s) generes`);
  }

  return chunks;
}

async function sauvegarderEnBase(chunks: ChunkInput[]): Promise<void> {
  // Import dynamique pour eviter les erreurs si DB non disponible
  try {
    const { db } = await import("../src/lib/db/index.js");
    const { sql } = await import("drizzle-orm");

    let inserted = 0;
    let errors = 0;

    for (const chunk of chunks) {
      try {
        await db.execute(sql`
          INSERT INTO chunks_juridiques (id, source, article_ref, titre, contenu, embedding, created_at)
          VALUES (
            gen_random_uuid(),
            ${chunk.source},
            ${chunk.articleRef},
            ${chunk.titre},
            ${chunk.contenu},
            '[]',
            now()
          )
          ON CONFLICT DO NOTHING
        `);
        inserted++;
      } catch {
        errors++;
      }
    }

    console.log(`\n  ✅ ${inserted} chunks inseres en base`);
    if (errors > 0) console.log(`  ⚠ ${errors} erreurs d'insertion`);
  } catch (err) {
    console.log(`  ⚠ DB non accessible — chunks non sauvegardes : ${err}`);
  }
}

async function main() {
  console.log("🔍 Indexation des documents juridiques PRMP-Pro\n");
  console.log("📦 Chargement des parsers...");
  await loadParsers();

  const dataDir = join(process.cwd(), "data");
  let totalChunks: ChunkInput[] = [];

  console.log("\n📂 Lecture des dossiers :\n");

  for (const [dossier, sourcePrefix] of Object.entries(DOSSIER_SOURCE)) {
    const dossierPath = join(dataDir, dossier);
    if (!existsSync(dossierPath)) continue;

    const files = await readdir(dossierPath).catch(() => []);
    const realFiles = files.filter(f => !f.startsWith("."));
    if (realFiles.length === 0) {
      console.log(`📁 ${dossier}/ — vide (aucun document deposé)`);
      continue;
    }

    console.log(`📁 ${dossier}/ (${realFiles.length} fichier(s)) :`);
    const chunks = await indexerDossier(dossierPath, sourcePrefix);
    totalChunks = [...totalChunks, ...chunks];
  }

  console.log(`\n📊 Total : ${totalChunks.length} chunks extraits`);

  if (totalChunks.length === 0) {
    console.log("\n⚠  Aucun document trouvé dans data/");
    console.log("   Déposez vos PDF/DOCX dans les sous-dossiers de data/");
    console.log("   Consultez data/README.md pour la structure attendue");
    process.exit(0);
  }

  // Sauvegarder en base (mode dégradé sans embeddings vectoriels)
  console.log("\n💾 Sauvegarde en base de données (mode dégradé — sans embeddings)...");
  await sauvegarderEnBase(totalChunks);

  // Si VOYAGE_API_KEY disponible, générer les embeddings
  const voyageKey = process.env["VOYAGE_API_KEY"];
  if (voyageKey && !voyageKey.startsWith("pa-placeholder")) {
    console.log("\n🧠 Génération des embeddings Voyage AI (voyage-3, 1024 dims)...");
    try {
      const { indexerTousTextes } = await import("../src/lib/ai/rag/indexer.js");
      const rapport = await indexerTousTextes(totalChunks);
      console.log(`  ✅ ${rapport.indexes} chunks indexés avec embeddings`);
      console.log(`  ❌ ${rapport.erreurs} erreurs`);
    } catch (err) {
      console.log(`  ⚠ Erreur embeddings : ${err}`);
    }
  } else {
    console.log("\n⚠  VOYAGE_API_KEY non configurée — embeddings non générés");
    console.log("   La recherche sémantique utilisera le mode dégradé (recherche textuelle)");
    console.log("   Ajoutez votre clé dans .env.local : VOYAGE_API_KEY=pa-...");
  }

  console.log("\n✅ Indexation terminée !");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
