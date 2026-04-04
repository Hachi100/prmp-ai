/**
 * Tool Claude : recherche semantique dans la base juridique
 */

import type Anthropic from "@anthropic-ai/sdk";
import { rechercherJuridique } from "@/lib/ai/rag/retriever";

export const searchJuridiqueTool: Anthropic.Tool = {
  name: "rechercher_juridique",
  description:
    "Effectue une recherche semantique dans la base juridique complete (Loi 2020-26, decrets, Manuel ARMP, circulaires). Retourne les passages les plus pertinents avec leurs references exactes.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Question ou contexte juridique a rechercher (en francais)",
      },
      k: {
        type: "number",
        description: "Nombre de resultats a retourner (defaut 4, max 10)",
      },
    },
    required: ["query"],
  },
};

export async function executeRechercherJuridique(input: {
  query: string;
  k?: number;
  userId?: string;
}): Promise<string> {
  const k = Math.min(input.k ?? 4, 10);
  const resultats = await rechercherJuridique(input.query, k, input.userId);

  if (resultats.length === 0) {
    return JSON.stringify({
      resultats: [],
      message: "Aucun resultat trouve dans la base juridique pour cette requete. Consultez directement la DNCMP ou l'ARMP.",
    });
  }

  return JSON.stringify({
    resultats: resultats.map((r) => ({
      articleRef: r.articleRef,
      source: r.source,
      titre: r.titre,
      extrait: r.contenu.substring(0, 500) + (r.contenu.length > 500 ? "..." : ""),
      scoreRelevance: r.score ? `${(r.score * 100).toFixed(1)}%` : "N/A",
    })),
    nombreResultats: resultats.length,
    note: "Citez toujours la source complete (articleRef + source) dans votre reponse.",
  });
}
