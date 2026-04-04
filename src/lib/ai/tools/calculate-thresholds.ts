/**
 * Tool Claude : calcul des seuils de passation et de controle
 */

import type Anthropic from "@anthropic-ai/sdk";
import { analyserSeuils } from "@/lib/rules/seuils";
import type { NatureMarche, TypeEntite } from "@/types/enums";

export const calculateThresholdsTool: Anthropic.Tool = {
  name: "calculer_seuils",
  description:
    "Calcule les seuils de passation applicables et determine l'organe de controle competent pour un marche selon son montant, sa nature et le type d'autorite contractante. Source : Decret 2020-599 Art. 1-8.",
  input_schema: {
    type: "object",
    properties: {
      montant: {
        type: "number",
        description: "Montant estimatif du marche en FCFA HT",
      },
      nature: {
        type: "string",
        enum: ["travaux", "fournitures", "services", "pi_cabinet", "pi_individuel"],
        description: "Nature du marche",
      },
      typeEntite: {
        type: "string",
        enum: ["ministere", "ep_epic", "ep_epa", "commune_statut", "commune_sans_statut", "prefecture", "autre"],
        description: "Type de l'autorite contractante",
      },
      hasCCMPDelegues: {
        type: "boolean",
        description: "Les membres du CCMP sont-ils delegues par l'ARMP ?",
      },
    },
    required: ["montant", "nature", "typeEntite"],
  },
};

export async function executeCalculerSeuils(input: {
  montant: number;
  nature: string;
  typeEntite: string;
  hasCCMPDelegues?: boolean;
}): Promise<string> {
  const resultat = analyserSeuils({
    montant: BigInt(Math.round(input.montant)),
    nature: input.nature as NatureMarche,
    typeEntite: input.typeEntite as TypeEntite,
    hasCCMPDelegues: input.hasCCMPDelegues ?? true,
  });

  return JSON.stringify({
    seuilPassation: resultat.seuilPassation.toString(),
    seuilControle: resultat.seuilControle.toString(),
    organeControle: resultat.organeControle,
    isCommunautaire: resultat.isCommunautaire,
    modesValides: resultat.modesValides,
    sourceJuridique: resultat.sourceJuridique,
    analyse:
      `Seuil de passation : ${Number(resultat.seuilPassation).toLocaleString("fr-FR")} FCFA HT. ` +
      `Organe de controle : ${resultat.organeControle.toUpperCase()}. ` +
      `${resultat.isCommunautaire ? "⚠️ Marche COMMUNAUTAIRE (seuils UEMOA depassés)." : "Marche national."} ` +
      `Modes valides : ${resultat.modesValides.join(", ")}.`,
  });
}
