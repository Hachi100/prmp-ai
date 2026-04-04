/**
 * Moteur de regles : Penalites de retard
 * Source : Art. 113-114, Loi 2020-26
 *
 * Art. 113 : mise en demeure 8 jours calendaires avant application des penalites
 * Art. 114 : plafond = 10% du montant TTC ; depassement = resiliation de plein droit
 *
 * Formule : penalite = montantTTC x taux_journalier x jours_retard
 * Taux par defaut : 1/2000 (CCAP type services)
 */

import { z } from "zod";
import type { PenaliteCalcul } from "@/types/domain";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Taux journalier par defaut — CCAP type services */
export const TAUX_JOURNALIER_DEFAULT = 1 / 2000; // 0.0005 = 1/2000e

/** Plafond des penalites : 10% du montant TTC — Art. 114, Loi 2020-26 */
export const PLAFOND_PENALITES_PCT = 0.10;

/** Delai de mise en demeure avant application des penalites : 8 jours calendaires — Art. 113 */
export const DELAI_MISE_EN_DEMEURE_CALENDAIRES = 8;

/** Plafond des avenants : 30% du montant initial — Art. 84, Loi 2020-26 */
export const PLAFOND_AVENANTS_PCT = 0.30;

/** Plafond de la sous-traitance : 40% de la valeur globale — Art. 101, Loi 2020-26 */
export const PLAFOND_SOUS_TRAITANCE_PCT = 0.40;

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

export const PenaliteInputSchema = z.object({
  montantTTC: z.bigint().positive("Le montant TTC doit etre positif"),
  joursRetard: z
    .number()
    .int()
    .positive("Le nombre de jours de retard doit etre positif"),
  tauxJournalier: z
    .number()
    .positive()
    .max(0.1, "Le taux journalier ne peut pas depasser 10%")
    .default(TAUX_JOURNALIER_DEFAULT),
  montantCumulePrecedent: z.bigint().nonnegative().default(0n),
});

export type PenaliteInput = z.infer<typeof PenaliteInputSchema>;

// ---------------------------------------------------------------------------
// Calcul des penalites
// ---------------------------------------------------------------------------

/**
 * Calcule les penalites de retard pour un contrat.
 * Art. 113-114, Loi 2020-26
 *
 * Formule : penalite = montantTTC x taux_journalier x jours_retard
 * Plafond : 10% du montant TTC — Art. 114
 */
export function calculerPenalite(input: PenaliteInput): PenaliteCalcul {
  const {
    montantTTC,
    joursRetard,
    tauxJournalier,
    montantCumulePrecedent,
  } = PenaliteInputSchema.parse(input);

  // Calcul du plafond : 10% du montant TTC — Art. 114
  const plafond10pct = (montantTTC * 10n) / 100n;

  // Penalite pour la periode : montantTTC x taux x jours
  // Conversion du taux (float) en fraction pour eviter les erreurs BigInt
  // taux_journalier = numerateur / denominateur
  const tauxNumerateur = Math.round(tauxJournalier * 10_000_000);
  const tauxDenominateur = 10_000_000;

  const montantPenalite =
    (montantTTC * BigInt(tauxNumerateur) * BigInt(joursRetard)) /
    BigInt(tauxDenominateur);

  // Cumul total
  const montantCumule = montantCumulePrecedent + montantPenalite;

  // Pourcentage du plafond atteint
  const pourcentagePlafond =
    Number((montantCumule * 10000n) / plafond10pct) / 100;

  // Resiliation de plein droit si penalite cumule >= plafond — Art. 114
  const declencheResiliation = montantCumule >= plafond10pct;

  return {
    montantPenalite,
    montantCumule,
    plafond10pct,
    pourcentagePlafond,
    declencheResiliation,
    articleSource: "Art. 113-114, Loi 2020-26",
  };
}

// ---------------------------------------------------------------------------
// Verification des avenants
// ---------------------------------------------------------------------------

export const AvenantInputSchema = z.object({
  montantInitial: z.bigint().positive(),
  montantCumulAvenants: z.bigint().nonnegative(),
  montantNouvelAvenant: z.bigint().positive(),
});

export type AvenantInput = z.infer<typeof AvenantInputSchema>;

/**
 * Verifie si un avenant respecte le plafond de 30% du montant initial.
 * Art. 84, Loi 2020-26
 */
export function verifierPlafondAvenant(input: AvenantInput): {
  nouveauCumul: bigint;
  pctCumule: number;
  depasse: boolean;
  montantMaxAutorise: bigint;
  articleSource: string;
} {
  const { montantInitial, montantCumulAvenants, montantNouvelAvenant } =
    AvenantInputSchema.parse(input);

  const nouveauCumul = montantCumulAvenants + montantNouvelAvenant;
  const montantMaxAutorise = (montantInitial * 30n) / 100n; // 30% — Art. 84
  const pctCumule = Number((nouveauCumul * 10000n) / montantInitial) / 100;

  return {
    nouveauCumul,
    pctCumule,
    depasse: nouveauCumul > montantMaxAutorise,
    montantMaxAutorise,
    articleSource: "Art. 84, Loi 2020-26 — Plafond avenants 30%",
  };
}

// ---------------------------------------------------------------------------
// Verification de la sous-traitance
// ---------------------------------------------------------------------------

/**
 * Verifie si le pourcentage de sous-traitance respecte le plafond de 40%.
 * Art. 101, Loi 2020-26
 */
export function verifierPlafondSousTraitance(
  montantTotal: bigint,
  montantSousTraite: bigint
): {
  pctSousTraitance: number;
  depasse: boolean;
  montantMaxAutorise: bigint;
  articleSource: string;
} {
  const montantMaxAutorise = (montantTotal * 40n) / 100n; // 40% — Art. 101
  const pctSousTraitance =
    Number((montantSousTraite * 10000n) / montantTotal) / 100;

  return {
    pctSousTraitance,
    depasse: montantSousTraite > montantMaxAutorise,
    montantMaxAutorise,
    articleSource: "Art. 101, Loi 2020-26 — Plafond sous-traitance 40%",
  };
}
