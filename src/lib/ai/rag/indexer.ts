/**
 * Pipeline d'indexation de la base juridique pour le RAG
 * Modele d'embedding : Voyage AI voyage-3 (dimension 1024)
 * Stockage : PostgreSQL + pgvector (table chunks_juridiques)
 */

import { db } from "@/lib/db";
import { chunksJuridiques } from "@/lib/db/schema/rag";
import type { NewChunkJuridique } from "@/lib/db/schema/rag";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChunkInput {
  source: string;
  articleRef: string;
  titre: string;
  contenu: string;
}

export interface IndexingReport {
  totalChunks: number;
  indexed: number;
  errors: number;
  sources: string[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Client Voyage AI
// ---------------------------------------------------------------------------

async function getEmbeddings(
  textes: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  const apiKey = process.env["VOYAGE_API_KEY"];
  if (!apiKey) throw new Error("VOYAGE_API_KEY non defini");

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: textes,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI API error: ${response.status} — ${error}`);
  }

  const result = (await response.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  // Trier par index pour garantir l'ordre
  return result.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

// ---------------------------------------------------------------------------
// Chunking des textes juridiques
// ---------------------------------------------------------------------------

/**
 * Decoupe un texte juridique en chunks par article.
 * Chaque chunk correspond a un article ou une section distincte.
 * Taille maximale : ~512 tokens (approx. 2000 caracteres)
 */
export function chunkerLegal(
  texte: string,
  source: string,
  articleRef: string,
  titre: string
): ChunkInput[] {
  const MAX_CHARS = 2000;

  if (texte.length <= MAX_CHARS) {
    return [{ source, articleRef, titre, contenu: texte.trim() }];
  }

  // Decoupe par paragraphes si le texte est trop long
  const paragraphes = texte
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: ChunkInput[] = [];
  let chunkActuel = "";
  let indexChunk = 0;

  for (const para of paragraphes) {
    if (chunkActuel.length + para.length > MAX_CHARS && chunkActuel.length > 0) {
      chunks.push({
        source,
        articleRef: indexChunk === 0 ? articleRef : `${articleRef} (suite ${indexChunk})`,
        titre: indexChunk === 0 ? titre : `${titre} (suite)`,
        contenu: chunkActuel.trim(),
      });
      chunkActuel = para;
      indexChunk++;
    } else {
      chunkActuel += (chunkActuel ? "\n\n" : "") + para;
    }
  }

  if (chunkActuel.trim()) {
    chunks.push({
      source,
      articleRef: indexChunk === 0 ? articleRef : `${articleRef} (suite ${indexChunk})`,
      titre: indexChunk === 0 ? titre : `${titre} (suite)`,
      contenu: chunkActuel.trim(),
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Indexation
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20; // Limite de l'API Voyage AI par requete

/**
 * Indexe un batch de chunks dans la base pgvector.
 * Les embeddings sont generes par Voyage AI voyage-3.
 */
export async function indexerChunks(chunks: ChunkInput[]): Promise<void> {
  if (chunks.length === 0) return;

  // Generer les embeddings en batch
  const textes = chunks.map((c) => `${c.titre}\n\n${c.contenu}`);
  const embeddings = await getEmbeddings(textes, "document");

  // Construire les enregistrements
  const records: NewChunkJuridique[] = chunks.map((chunk, i) => ({
    source: chunk.source,
    articleRef: chunk.articleRef,
    titre: chunk.titre,
    contenu: chunk.contenu,
    embedding: embeddings[i] ?? [],
    tokens: Math.ceil(textes[i]!.length / 4), // Approximation
  }));

  // Insertion en base (ignorer les doublons sur articleRef + source)
  await db.insert(chunksJuridiques).values(records).onConflictDoNothing();
}

/**
 * Indexe tous les documents d'un repertoire data/loi/
 * Point d'entree du script scripts/index-juridique.ts
 */
export async function indexerTousTextes(
  textes: ChunkInput[]
): Promise<IndexingReport> {
  const debut = Date.now();
  const sources = [...new Set(textes.map((t) => t.source))];
  let indexed = 0;
  let errors = 0;

  console.log(`📚 Indexation de ${textes.length} chunks juridiques...`);

  // Traitement par batches
  for (let i = 0; i < textes.length; i += BATCH_SIZE) {
    const batch = textes.slice(i, i + BATCH_SIZE);
    try {
      await indexerChunks(batch);
      indexed += batch.length;
      console.log(`  ✅ ${indexed}/${textes.length} chunks indexes`);
    } catch (err) {
      console.error(`  ❌ Erreur batch ${i}-${i + BATCH_SIZE}:`, err);
      errors += batch.length;
    }
  }

  return {
    totalChunks: textes.length,
    indexed,
    errors,
    sources,
    durationMs: Date.now() - debut,
  };
}
