/**
 * Tool Claude : calcul des delais legaux
 */

import type Anthropic from "@anthropic-ai/sdk";
import { calculerDelaisMarche } from "@/lib/rules/delais";
import type { ModePassation, OrganeControle, StatutProcedure } from "@/types/enums";

export const computeDeadlinesTool: Anthropic.Tool = {
  name: "calculer_delais",
  description:
    "Calcule les delais legaux d'une procedure de passation a partir d'une date de reference. Retourne toutes les echeances avec leur source juridique. Source : Decret 2020-600 Art. 3-8 ; Loi 2020-26 Art. 54.",
  input_schema: {
    type: "object",
    properties: {
      dateReference: {
        type: "string",
        description: "Date de reference au format ISO 8601 (ex: 2025-03-15)",
      },
      mode: {
        type: "string",
        enum: ["aoo", "aoo_prequalification", "ao_deux_etapes", "ao_concours", "ao_restreint", "gre_a_gre", "drp_travaux", "drp_fournitures", "drp_services", "dc", "sfqc", "sfq", "scbd", "smc", "sfqc_qualification", "sci", "entente_directe_pi"],
        description: "Mode de passation",
      },
      organeControle: {
        type: "string",
        enum: ["ccmp", "ddcmp", "dncmp"],
        description: "Organe de controle competent",
      },
      isCommunautaire: {
        type: "boolean",
        description: "Le marche est-il au-dessus des seuils UEMOA ?",
      },
    },
    required: ["dateReference", "mode", "organeControle"],
  },
};

export async function executeCalculerDelais(input: {
  dateReference: string;
  mode: string;
  organeControle: string;
  isCommunautaire?: boolean;
  statut?: string;
}): Promise<string> {
  const dateRef = new Date(input.dateReference);
  if (isNaN(dateRef.getTime())) {
    throw new Error(`Date invalide : ${input.dateReference}`);
  }

  const delais = calculerDelaisMarche(
    dateRef,
    input.mode as ModePassation,
    input.organeControle as OrganeControle,
    input.isCommunautaire ?? false
  );

  const delaisFormates = Object.entries(delais).map(([cle, delai]) => ({
    cle,
    libelle: delai.libelle,
    dateLimite: delai.dateLimite.toISOString().split("T")[0],
    jours: delai.jours,
    typeDelai: delai.typeDelai,
    estDepasse: delai.estDepasse,
    articleSource: delai.articleSource,
  }));

  const depassees = delaisFormates.filter((d) => d.estDepasse);

  return JSON.stringify({
    dateReference: input.dateReference,
    mode: input.mode,
    organeControle: input.organeControle,
    delais: delaisFormates,
    alertes:
      depassees.length > 0
        ? depassees.map((d) => `⚠️ DELAI DEPASSE : ${d.libelle} (echance : ${d.dateLimite}) — ${d.articleSource}`)
        : ["Aucun delai depasse."],
  });
}
