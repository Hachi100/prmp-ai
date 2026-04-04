/**
 * Tool Claude : calcul des penalites de retard
 */

import type Anthropic from "@anthropic-ai/sdk";
import { calculerPenalite, TAUX_JOURNALIER_DEFAULT } from "@/lib/rules/penalites";

export const computePenaltiesTool: Anthropic.Tool = {
  name: "calculer_penalites",
  description:
    "Calcule les penalites de retard et verifie le plafond de 10%. Formule : penalite = montantTTC x taux_journalier x jours_retard. Art. 113-114, Loi 2020-26.",
  input_schema: {
    type: "object",
    properties: {
      montantTTC: {
        type: "number",
        description: "Montant TTC du contrat en FCFA",
      },
      joursRetard: {
        type: "number",
        description: "Nombre de jours de retard",
      },
      tauxJournalier: {
        type: "number",
        description: "Taux journalier (defaut 1/2000 = 0.0005 pour services). Peut varier entre 1/5000 et 1/1000 selon le CCAP.",
      },
      montantCumulePrecedent: {
        type: "number",
        description: "Montant cumule des penalites deja appliquees (default 0)",
      },
    },
    required: ["montantTTC", "joursRetard"],
  },
};

export async function executeCalculerPenalites(input: {
  montantTTC: number;
  joursRetard: number;
  tauxJournalier?: number;
  montantCumulePrecedent?: number;
}): Promise<string> {
  const resultat = calculerPenalite({
    montantTTC: BigInt(Math.round(input.montantTTC)),
    joursRetard: input.joursRetard,
    tauxJournalier: input.tauxJournalier ?? TAUX_JOURNALIER_DEFAULT,
    montantCumulePrecedent: BigInt(Math.round(input.montantCumulePrecedent ?? 0)),
  });

  const niveau = resultat.declencheResiliation
    ? "🔴 BLOQUANT"
    : resultat.pourcentagePlafond >= 80
    ? "🟡 AVERTISSEMENT"
    : "🔵 SUGGESTION";

  return JSON.stringify({
    montantPenalite: resultat.montantPenalite.toString(),
    montantPenaliteFormate: `${Number(resultat.montantPenalite).toLocaleString("fr-FR")} FCFA`,
    montantCumule: resultat.montantCumule.toString(),
    montantCumuleFormate: `${Number(resultat.montantCumule).toLocaleString("fr-FR")} FCFA`,
    plafond10pct: resultat.plafond10pct.toString(),
    plafond10pctFormate: `${Number(resultat.plafond10pct).toLocaleString("fr-FR")} FCFA`,
    pourcentagePlafond: `${resultat.pourcentagePlafond.toFixed(2)}%`,
    declencheResiliation: resultat.declencheResiliation,
    articleSource: resultat.articleSource,
    alerte:
      resultat.declencheResiliation
        ? `${niveau} : Le plafond de 10% est atteint (${resultat.pourcentagePlafond.toFixed(2)}%). RESILIATION DE PLEIN DROIT (Art. 114, Loi 2020-26). Engager immediatement la procedure de resiliation.`
        : resultat.pourcentagePlafond >= 80
        ? `${niveau} : ${resultat.pourcentagePlafond.toFixed(2)}% du plafond de penalites atteint. Surveiller le retard de pres.`
        : `${niveau} : ${resultat.pourcentagePlafond.toFixed(2)}% du plafond de penalites atteint.`,
  });
}
