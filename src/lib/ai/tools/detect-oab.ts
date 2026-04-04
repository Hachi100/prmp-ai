/**
 * Tool Claude : detection des offres anormalement basses
 */

import type Anthropic from "@anthropic-ai/sdk";
import { detecterOAB } from "@/lib/rules/oab";

export const detectOABTool: Anthropic.Tool = {
  name: "detecter_oab",
  description:
    "Detecte les offres anormalement basses (OAB) selon la formule legale : M = 0,80 x (0,6 x Fm + 0,4 x Fc). Toute offre inferieure a M est presumee OAB. Art. 81, Loi 2020-26.",
  input_schema: {
    type: "object",
    properties: {
      offres: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            soumissionnaireNom: { type: "string" },
            montantCorrige: { type: "number", description: "Montant corrige en FCFA HT" },
          },
          required: ["id", "soumissionnaireNom", "montantCorrige"],
        },
        description: "Liste des offres avec leurs montants corriges",
      },
      estimationAC: {
        type: "number",
        description: "Estimation previsionnelle de l'AC pour ce lot en FCFA HT",
      },
    },
    required: ["offres", "estimationAC"],
  },
};

export async function executeDetecterOAB(input: {
  offres: Array<{ id: string; soumissionnaireNom: string; montantCorrige: number }>;
  estimationAC: number;
}): Promise<string> {
  const resultat = detecterOAB(
    input.offres.map((o) => ({
      id: o.id,
      soumissionnaireNom: o.soumissionnaireNom,
      montantCorrige: BigInt(Math.round(o.montantCorrige)),
    })),
    BigInt(Math.round(input.estimationAC))
  );

  return JSON.stringify({
    seuilM: resultat.seuilM.toString(),
    fm: resultat.fm.toString(),
    fc: resultat.fc.toString(),
    formule: resultat.formule,
    offresOAB: resultat.offresOAB.map((o) => ({
      soumissionnaireNom: o.offre.soumissionnaireNom,
      montantCorrige: o.offre.montantCorrige.toString(),
      ecartPct: o.ecartPct,
      action: "Demander justifications ecrites OBLIGATOIREMENT avant tout rejet",
    })),
    totalOffres: input.offres.length,
    nombreOAB: resultat.offresOAB.length,
    articleSource: resultat.articleSource,
    avertissement:
      resultat.offresOAB.length > 0
        ? `🔴 BLOQUANT : ${resultat.offresOAB.length} offre(s) presumee(s) anormalement basse(s). Obligation legale de demander des justifications ecrites avant tout rejet (Art. 81, Loi 2020-26).`
        : "✅ Aucune offre anormalement basse detecee.",
  });
}
