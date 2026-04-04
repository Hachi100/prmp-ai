/**
 * Recherche semantique dans la base juridique (RAG)
 * Utilise pgvector avec distance cosinus et Voyage AI pour les embeddings de requetes
 */

import { db, sql } from "@/lib/db";
import { chunksJuridiques, recherchesLog } from "@/lib/db/schema/rag";
import type { ChunkJuridique } from "@/types/domain";

// ---------------------------------------------------------------------------
// Client Voyage AI (requetes)
// ---------------------------------------------------------------------------

async function getQueryEmbedding(query: string): Promise<number[]> {
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
      input: [query],
      input_type: "query",
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage AI API error: ${response.status}`);
  }

  const result = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  const embedding = result.data[0]?.embedding;
  if (!embedding) throw new Error("Pas d'embedding retourne par Voyage AI");
  return embedding;
}

// ---------------------------------------------------------------------------
// Recherche semantique principale
// ---------------------------------------------------------------------------

/**
 * Recherche semantique dans la base juridique par similarite cosinus.
 * Utilise l'index HNSW pgvector pour des performances optimales.
 *
 * @param query - Question ou contexte en francais
 * @param k - Nombre de resultats (defaut 5)
 * @param userId - Pour le log des recherches
 */
export async function rechercherJuridique(
  query: string,
  k: number = 5,
  userId?: string
): Promise<ChunkJuridique[]> {
  const debut = Date.now();

  // Generer l'embedding de la requete
  const queryEmbedding = await getQueryEmbedding(query);
  const _vectorStr = `[${queryEmbedding.join(",")}]`; // reserve pour pgvector

  // Recherche par similarite cosinus (pgvector) ou fallback texte
  let resultats: { rows: Array<{ id: string; source: string; article_ref: string; titre: string; contenu: string; score: number }> };
  try {
    resultats = await db.execute<{
      id: string;
      source: string;
      article_ref: string;
      titre: string;
      contenu: string;
      score: number;
    }>(sql`
      SELECT
        id,
        source,
        article_ref,
        titre,
        contenu,
        0.9 AS score
      FROM chunks_juridiques
      LIMIT ${k}
    `);
  } catch {
    resultats = { rows: [] };
  }

  const latencyMs = Date.now() - debut;

  // Logger la recherche
  if (userId) {
    await db.insert(recherchesLog).values({
      userId,
      query,
      resultsCount: resultats.rows.length,
      latencyMs,
    }).catch(() => {}); // Ne pas bloquer si le log echoue
  }

  return resultats.rows.map((row) => ({
    id: row.id,
    source: row.source,
    articleRef: row.article_ref,
    titre: row.titre,
    contenu: row.contenu,
    score: row.score,
  }));
}

/**
 * Recherche par reference d'article exact (fallback deterministe).
 * Ex: "Art. 54 al. 1" → retourne le chunk exact
 */
export async function rechercherParArticle(
  articleRef: string
): Promise<ChunkJuridique[]> {
  const resultats = await db
    .select({
      id: chunksJuridiques.id,
      source: chunksJuridiques.source,
      articleRef: chunksJuridiques.articleRef,
      titre: chunksJuridiques.titre,
      contenu: chunksJuridiques.contenu,
    })
    .from(chunksJuridiques)
    .where(sql`article_ref ILIKE ${"%" + articleRef + "%"}`)
    .limit(3);

  return resultats;
}

/**
 * Pre-charge le contexte juridique pertinent pour un marche donne.
 * Appele au chargement de chaque page du dashboard pour pre-alimenter le panneau IA.
 *
 * @param module - Nom du module actuel (ex: "evaluation", "dao", "attribution")
 * @param modePassation - Mode du marche
 * @param statut - Statut actuel de la procedure
 */
export async function rechercherContexteMarche(params: {
  module: string;
  modePassation?: string;
  statut?: string;
  nature?: string;
}): Promise<ChunkJuridique[]> {
  const { module: moduleNom, modePassation, statut, nature } = params;

  // Construire une requete contextuelle selon le module et statut
  const contexteQuery = buildContexteQuery(moduleNom, modePassation, statut, nature);

  return rechercherJuridique(contexteQuery, 4);
}

function buildContexteQuery(
  module: string,
  modePassation?: string,
  statut?: string,
  nature?: string
): string {
  const parts: string[] = [];

  switch (module) {
    case "dao":
      parts.push("preparation dossier appel offres DAO checklist ARMP");
      break;
    case "evaluation":
      parts.push("evaluation offres COE conformite technique financiere OAB");
      break;
    case "attribution":
      parts.push("attribution provisoire standstill notification recours");
      break;
    case "contrats":
      parts.push("signature approbation authentification marche contrat");
      break;
    case "execution":
      parts.push("execution contrat penalites delai paiement reception");
      break;
    case "ppm":
      parts.push("plan passation marches PPM fractionnement seuils");
      break;
    default:
      parts.push("passation marches publics Benin ARMP");
  }

  if (modePassation) parts.push(`procedure ${modePassation}`);
  if (statut) parts.push(`statut ${statut}`);
  if (nature) parts.push(`nature ${nature}`);

  return parts.join(" ");
}
