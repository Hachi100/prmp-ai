/**
 * Moteur de regles : Detection du fractionnement illegal
 * Source : Art. 24 al. 7 et Art. 26, Loi 2020-26
 *          Sanctions : Art. 126, Loi 2020-26
 *          (5 a 10 ans d'emprisonnement et 50M a 500M FCFA d'amende)
 *
 * Le systeme cumule les marches de meme nature par direction beneficiaire
 * et par exercice. Si le cumul depasse le seuil de passation alors que
 * chaque marche individuel est en dessous : ALERTE BLOQUANT.
 */

import { z } from "zod";
import type { AlerteFragmentation } from "@/types/domain";
import { NatureMarche, NiveauAlerte, TypeEntite } from "@/types/enums";
import { getSeuilPassation } from "./seuils";

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

export const FragmentationInputSchema = z.object({
  /** ID de l'entite contractante */
  entiteId: z.string().uuid(),
  /** Type d'entite (pour determiner le seuil applicable) */
  typeEntite: z.nativeEnum(TypeEntite),
  /** Nature du nouveau marche a evaluer */
  nature: z.nativeEnum(NatureMarche),
  /** Montant du nouveau marche en FCFA HT */
  montantNouveauMarche: z.bigint().positive(),
  /** Direction beneficiaire du nouveau marche */
  directionBeneficiaire: z.string().min(1),
  /** Exercice budgetaire */
  exercice: z.number().int().min(2000).max(2100),
  /**
   * Liste des marches existants de meme nature pour cette entite et cet exercice
   * (a charger depuis la BDD avant d'appeler cette fonction)
   */
  marchesExistants: z.array(
    z.object({
      id: z.string().uuid(),
      montant: z.bigint().positive(),
      directionBeneficiaire: z.string(),
      nature: z.nativeEnum(NatureMarche),
    })
  ),
});

export type FragmentationInput = z.infer<typeof FragmentationInputSchema>;

// ---------------------------------------------------------------------------
// Detection du fractionnement
// ---------------------------------------------------------------------------

/**
 * Detecte un fractionnement illegal pour un nouveau marche.
 *
 * Logique :
 * 1. Cumule tous les marches de meme nature pour la meme entite et le meme exercice
 * 2. (Optionnel) Filtre par direction beneficiaire si souhaite
 * 3. Si le cumul total + nouveau marche >= seuil de passation ET
 *    chaque marche individuel (y compris le nouveau) < seuil : ALERTE BLOQUANT
 *
 * Art. 24 al. 7 et Art. 26, Loi 2020-26
 */
export function detecterFractionnement(
  input: FragmentationInput
): AlerteFragmentation[] {
  const {
    typeEntite,
    nature,
    montantNouveauMarche,
    directionBeneficiaire,
    exercice,
    marchesExistants,
  } = FragmentationInputSchema.parse(input);

  const alertes: AlerteFragmentation[] = [];
  const seuilPassation = getSeuilPassation(nature, typeEntite);

  // Filtrer les marches existants de meme nature
  const marchesMemNature = marchesExistants.filter(
    (m) => m.nature === nature
  );

  // Calcul du cumul total (meme entite, meme nature, meme exercice)
  const cumulTotal = marchesMemNature.reduce(
    (acc, m) => acc + m.montant,
    0n
  ) + montantNouveauMarche;

  // Calcul du cumul par direction beneficiaire
  const marchesMemDirection = marchesMemNature.filter(
    (m) => m.directionBeneficiaire === directionBeneficiaire
  );
  const cumulDirection = marchesMemDirection.reduce(
    (acc, m) => acc + m.montant,
    0n
  ) + montantNouveauMarche;

  // Verification 1 : cumul global par nature et exercice
  if (
    cumulTotal >= seuilPassation &&
    montantNouveauMarche < seuilPassation &&
    marchesMemNature.every((m) => m.montant < seuilPassation)
  ) {
    alertes.push({
      niveau: NiveauAlerte.BLOQUANT,
      message:
        `FRACTIONNEMENT DETECTE — Le cumul de ${marchesMemNature.length + 1} marches de nature "${nature}" ` +
        `pour l'exercice ${exercice} atteint ${cumulTotal.toLocaleString()} FCFA HT, ` +
        `depassant le seuil de passation (${seuilPassation.toLocaleString()} FCFA HT). ` +
        `Chaque marche individuel est en dessous du seuil. ` +
        `Sanctions Art. 126, Loi 2020-26 : 5 a 10 ans d'emprisonnement et 50M a 500M FCFA d'amende.`,
      nature,
      directionBeneficiaire,
      exercice,
      montantCumule: cumulTotal,
      seuilPassation,
      marcheIds: [
        ...marchesMemNature.map((m) => m.id),
        // Le nouveau marche n'a pas encore d'ID
      ],
      articleSource: "Art. 24 al. 7 et Art. 26, Loi 2020-26",
    });
  }

  // Verification 2 : cumul par direction beneficiaire (signal plus precis)
  if (
    cumulDirection >= seuilPassation &&
    montantNouveauMarche < seuilPassation &&
    marchesMemDirection.every((m) => m.montant < seuilPassation) &&
    // Eviter le doublon si le cumul global a deja declenche une alerte
    cumulDirection !== cumulTotal
  ) {
    alertes.push({
      niveau: NiveauAlerte.BLOQUANT,
      message:
        `FRACTIONNEMENT par direction — Le cumul de ${marchesMemDirection.length + 1} marches ` +
        `de nature "${nature}" pour la direction "${directionBeneficiaire}" ` +
        `atteint ${cumulDirection.toLocaleString()} FCFA HT, ` +
        `depassant le seuil de passation (${seuilPassation.toLocaleString()} FCFA HT). ` +
        `Art. 126, Loi 2020-26 : sanctions penales.`,
      nature,
      directionBeneficiaire,
      exercice,
      montantCumule: cumulDirection,
      seuilPassation,
      marcheIds: marchesMemDirection.map((m) => m.id),
      articleSource: "Art. 24 al. 7 et Art. 26, Loi 2020-26",
    });
  }

  // Avertissement : cumul approchant le seuil (>= 80%)
  const seuil80pct = (seuilPassation * 8n) / 10n;
  if (
    cumulTotal >= seuil80pct &&
    cumulTotal < seuilPassation &&
    alertes.length === 0
  ) {
    alertes.push({
      niveau: NiveauAlerte.AVERTISSEMENT,
      message:
        `ATTENTION : Le cumul des marches de nature "${nature}" pour l'exercice ${exercice} ` +
        `atteint ${cumulTotal.toLocaleString()} FCFA HT ` +
        `(${Math.round(Number((cumulTotal * 100n) / seuilPassation))}% du seuil de passation). ` +
        `Risque de fractionnement si d'autres marches similaires sont passes.`,
      nature,
      directionBeneficiaire,
      exercice,
      montantCumule: cumulTotal,
      seuilPassation,
      marcheIds: marchesMemNature.map((m) => m.id),
      articleSource: "Art. 24 al. 7 et Art. 26, Loi 2020-26",
    });
  }

  return alertes;
}
