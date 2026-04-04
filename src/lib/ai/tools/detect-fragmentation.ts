/**
 * Tool Claude : detection du fractionnement illegal
 */

import type Anthropic from "@anthropic-ai/sdk";
import { detecterFractionnement } from "@/lib/rules/fractionnement";
import type { NatureMarche, TypeEntite } from "@/types/enums";

export const detectFragmentationTool: Anthropic.Tool = {
  name: "detecter_fractionnement",
  description:
    "Detecte si un nouveau marche constitue un fractionnement illegal en cumulant les marches de meme nature pour la meme entite et le meme exercice. Art. 24 al. 7 et Art. 26, Loi 2020-26. Sanctions Art. 126 : 5-10 ans de prison et 50-500M FCFA d'amende.",
  input_schema: {
    type: "object",
    properties: {
      entiteId: {
        type: "string",
        description: "ID de l'autorite contractante",
      },
      typeEntite: {
        type: "string",
        enum: ["ministere", "ep_epic", "ep_epa", "commune_statut", "commune_sans_statut", "prefecture", "autre"],
      },
      nature: {
        type: "string",
        enum: ["travaux", "fournitures", "services", "pi_cabinet", "pi_individuel"],
      },
      montantNouveauMarche: {
        type: "number",
        description: "Montant du nouveau marche en FCFA HT",
      },
      directionBeneficiaire: {
        type: "string",
        description: "Direction ou service beneficiaire du marche",
      },
      exercice: {
        type: "number",
        description: "Annee budgetaire",
      },
      marchesExistants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            montant: { type: "number" },
            directionBeneficiaire: { type: "string" },
            nature: { type: "string" },
          },
          required: ["id", "montant", "directionBeneficiaire", "nature"],
        },
        description: "Liste des marches deja passes pour cette entite et cet exercice",
      },
    },
    required: ["entiteId", "typeEntite", "nature", "montantNouveauMarche", "directionBeneficiaire", "exercice", "marchesExistants"],
  },
};

export async function executeDetecterFractionnement(input: {
  entiteId: string;
  typeEntite: string;
  nature: string;
  montantNouveauMarche: number;
  directionBeneficiaire: string;
  exercice: number;
  marchesExistants: Array<{
    id: string;
    montant: number;
    directionBeneficiaire: string;
    nature: string;
  }>;
}): Promise<string> {
  const alertes = detecterFractionnement({
    entiteId: input.entiteId,
    typeEntite: input.typeEntite as TypeEntite,
    nature: input.nature as NatureMarche,
    montantNouveauMarche: BigInt(Math.round(input.montantNouveauMarche)),
    directionBeneficiaire: input.directionBeneficiaire,
    exercice: input.exercice,
    marchesExistants: input.marchesExistants.map((m) => ({
      id: m.id,
      montant: BigInt(Math.round(m.montant)),
      directionBeneficiaire: m.directionBeneficiaire,
      nature: m.nature as NatureMarche,
    })),
  });

  return JSON.stringify({
    fractionnementDetecte: alertes.some((a) => a.niveau === "bloquant"),
    nombreAlertes: alertes.length,
    alertes: alertes.map((a) => ({
      niveau: a.niveau,
      message: a.message,
      montantCumule: a.montantCumule.toString(),
      seuilPassation: a.seuilPassation.toString(),
      articleSource: a.articleSource,
    })),
    recommandation:
      alertes.some((a) => a.niveau === "bloquant")
        ? "🔴 BLOQUANT : Fractionnement detecte. Regroupez ces marches en un seul AO ou justifiez juridiquement leur separation. Consultez la DNCMP avant de proceder."
        : alertes.some((a) => a.niveau === "avertissement")
        ? "🟡 AVERTISSEMENT : Cumul approchant le seuil. Surveillance recommandee."
        : "✅ Aucun fractionnement detecte.",
  });
}
