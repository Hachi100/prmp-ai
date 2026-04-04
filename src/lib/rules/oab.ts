/**
 * Moteur de regles : Offres Anormalement Basses (OAB)
 * Source : Art. 81, Loi 2020-26 ; Fiches memo ARMP
 *
 * Formule : M = 0.80 x (0.6 x Fm + 0.4 x Fc)
 * Fm = moyenne arithmetique des offres financieres corrigees
 * Fc = estimation previsionnelle de l'AC pour le lot considere
 *
 * Toute offre dont le montant est inferieur a M est presumee OAB.
 * Obligation de demander des justifications ecrites avant rejet.
 */

import { z } from "zod";
import type { OffreFinanciere, ResultatOAB } from "@/types/domain";

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

export const OABInputSchema = z.object({
  offres: z
    .array(
      z.object({
        id: z.string().uuid(),
        soumissionnaireNom: z.string().min(1),
        montantCorrige: z.bigint().positive(),
      })
    )
    .min(1, "Au moins une offre est requise"),
  estimationAC: z.bigint().positive("L'estimation AC doit etre positive"),
});

export type OABInput = z.infer<typeof OABInputSchema>;

// ---------------------------------------------------------------------------
// Calcul OAB
// ---------------------------------------------------------------------------

/**
 * Calcule le seuil M de l'offre anormalement basse.
 * Formule : M = 0.80 x (0.6 x Fm + 0.4 x Fc)
 * Art. 81, Loi 2020-26 ; Fiches memo ARMP
 *
 * Note : le calcul OAB n'est applicable que si le nombre d'offres >= 3.
 * En dessous de 3 offres, la procedure ARMP recommande de relancer l'AO.
 */
export function calculerSeuilOAB(
  offres: OffreFinanciere[],
  estimationAC: bigint
): ResultatOAB {
  if (offres.length === 0) {
    throw new Error("Impossible de calculer l'OAB sans offre");
  }

  // Fm = moyenne arithmetique des montants corriges
  const sommeMontants = offres.reduce(
    (acc, offre) => acc + offre.montantCorrige,
    0n
  );
  const fm = sommeMontants / BigInt(offres.length);
  const fc = estimationAC;

  // M = 0.80 x (0.6 x Fm + 0.4 x Fc)
  // Calcul en centimes pour eviter les erreurs d'arrondi avec BigInt
  // 0.6 x Fm + 0.4 x Fc = (6 x Fm + 4 x Fc) / 10
  // 0.80 x ... = 80/100 x ...
  const combinaison = (6n * fm + 4n * fc) / 10n;
  const seuilM = (80n * combinaison) / 100n;

  // Identification des offres OAB (montant < M)
  const offresOAB = offres
    .filter((offre) => offre.montantCorrige < seuilM)
    .map((offre) => ({
      offre,
      ecartPct: Number(
        ((seuilM - offre.montantCorrige) * 10000n) / seuilM
      ) / 100,
    }));

  const formule = `M = 0.80 × (0.6 × Fm + 0.4 × Fc) = 0.80 × (0.6 × ${fm.toLocaleString()} + 0.4 × ${fc.toLocaleString()}) = ${seuilM.toLocaleString()} FCFA`;

  return {
    seuilM,
    fm,
    fc,
    offresOAB,
    formule,
    articleSource: "Art. 81, Loi 2020-26 ; Fiches memo ARMP",
  };
}

/**
 * Detecte les offres OAB parmi une liste d'offres.
 * Retourne la liste des offres presumees anormalement basses.
 */
export function detecterOAB(
  offres: OffreFinanciere[],
  estimationAC: bigint
): ResultatOAB {
  const input = OABInputSchema.parse({
    offres: offres.map((o) => ({
      id: o.id,
      soumissionnaireNom: o.soumissionnaireNom,
      montantCorrige: o.montantCorrige,
    })),
    estimationAC,
  });

  return calculerSeuilOAB(
    input.offres.map((o) => ({
      id: o.id,
      soumissionnaireNom: o.soumissionnaireNom,
      montantCorrige: o.montantCorrige,
    })),
    input.estimationAC
  );
}

// ---------------------------------------------------------------------------
// Corrections arithmetiques
// ---------------------------------------------------------------------------

export const CorrectionArithmetiqueSchema = z.object({
  montantLu: z.bigint().positive(),
  montantCorrige: z.bigint().positive(),
});

export type CorrectionArithmetique = z.infer<typeof CorrectionArithmetiqueSchema>;

/**
 * Verifie si la correction arithmetique depasse 10%.
 * Clause 31.3 IC DAO-types : si la correction > 10%, l'offre est ecartee.
 */
export function verifierCorrectionArithmetique(
  montantLu: bigint,
  montantCorrige: bigint
): {
  deltaPct: number;
  doitEtreEcartee: boolean;
  articleSource: string;
} {
  if (montantLu === 0n) {
    throw new Error("Le montant lu ne peut pas etre zero");
  }

  // Ecart en pourcentage (valeur absolue)
  const ecartAbs =
    montantCorrige > montantLu
      ? montantCorrige - montantLu
      : montantLu - montantCorrige;

  // deltaPct en centimes de % (ex: 1050 = 10.50%)
  const deltaPctCentimes = (ecartAbs * 10000n) / montantLu;
  const deltaPct = Number(deltaPctCentimes) / 100;

  return {
    deltaPct,
    // Clause 31.3 IC DAO-types : ecartement si variation > 10%
    doitEtreEcartee: deltaPct > 10,
    articleSource: "Clause 31.3 IC DAO-types ARMP",
  };
}
