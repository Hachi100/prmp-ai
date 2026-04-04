/**
 * Moteur de regles : Machine a etats des procedures
 * Source : Manuel de Procedures ARMP, Partie 3
 *
 * 14 etapes de l'AOO (pp.31-75) ; 16 etapes SFQC (pp.114-150)
 * Les transitions varient selon le mode de passation.
 */

import { ModePassation, StatutProcedure } from "@/types/enums";
import type { EtapeRequise, TransitionProcedure } from "@/types/domain";

// ---------------------------------------------------------------------------
// Transitions valides par statut (independant du mode)
// ---------------------------------------------------------------------------

/**
 * Transitions valides depuis chaque statut.
 * Certains modes ont des transitions specifiques (ex: SFQC a un standstill technique).
 */
export const TRANSITIONS_AOO: Record<StatutProcedure, StatutProcedure[]> = {
  [StatutProcedure.PLANIFIE]: [StatutProcedure.PREPARATION, StatutProcedure.ANNULE],
  [StatutProcedure.PREPARATION]: [StatutProcedure.LANCE, StatutProcedure.ANNULE],
  [StatutProcedure.LANCE]: [StatutProcedure.EVALUATION, StatutProcedure.SUSPENDU, StatutProcedure.ANNULE],
  [StatutProcedure.EVALUATION]: [StatutProcedure.ATTRIBUTION_PROVISOIRE, StatutProcedure.LANCE, StatutProcedure.ANNULE],
  [StatutProcedure.ATTRIBUTION_PROVISOIRE]: [StatutProcedure.STANDSTILL, StatutProcedure.ANNULE],
  [StatutProcedure.STANDSTILL]: [StatutProcedure.RECOURS, StatutProcedure.CONTRACTUALISATION],
  [StatutProcedure.RECOURS]: [StatutProcedure.CONTRACTUALISATION, StatutProcedure.LANCE, StatutProcedure.ANNULE],
  [StatutProcedure.CONTRACTUALISATION]: [StatutProcedure.APPROUVE],
  [StatutProcedure.APPROUVE]: [StatutProcedure.AUTHENTIFIE],
  [StatutProcedure.AUTHENTIFIE]: [StatutProcedure.ENREGISTRE],
  [StatutProcedure.ENREGISTRE]: [StatutProcedure.NOTIFIE],
  [StatutProcedure.NOTIFIE]: [StatutProcedure.EN_VIGUEUR],
  [StatutProcedure.EN_VIGUEUR]: [StatutProcedure.EXECUTION],
  [StatutProcedure.EXECUTION]: [StatutProcedure.RECEPTION_PROVISOIRE, StatutProcedure.SUSPENDU],
  [StatutProcedure.RECEPTION_PROVISOIRE]: [StatutProcedure.RECEPTION_DEFINITIVE],
  [StatutProcedure.RECEPTION_DEFINITIVE]: [StatutProcedure.SOLDE],
  [StatutProcedure.SOLDE]: [],
  [StatutProcedure.SUSPENDU]: [StatutProcedure.EXECUTION, StatutProcedure.ANNULE],
  [StatutProcedure.ANNULE]: [],
};

/**
 * Transitions pour les DRP (Demande de Renseignements et de Prix)
 * Procedure simplifiee — Manuel de Procedures pp.96-110
 * Pas d'authentification DNCMP pour les DRP sous le seuil DNCMP
 */
export const TRANSITIONS_DRP: Record<StatutProcedure, StatutProcedure[]> = {
  ...TRANSITIONS_AOO,
  // Les DRP ont une procedure simplifiee : pas d'authentification separate
  [StatutProcedure.APPROUVE]: [StatutProcedure.NOTIFIE], // Pas d'authentification
  [StatutProcedure.AUTHENTIFIE]: [StatutProcedure.ENREGISTRE], // Inchangé pour les cas où applicable
};

/**
 * Transitions specifiques SFQC (Prestations Intellectuelles, 2 enveloppes)
 * Le standstill technique intervient entre resultats techniques et ouverture financiere.
 * Manuel de Procedures pp.114-150 ; Clause 21.1 IC DP
 */
export const TRANSITIONS_SFQC: Record<StatutProcedure, StatutProcedure[]> = {
  ...TRANSITIONS_AOO,
  // Apres evaluation technique, standstill de 10j calendaires avant ouverture financiere
  [StatutProcedure.EVALUATION]: [StatutProcedure.STANDSTILL, StatutProcedure.ANNULE],
  [StatutProcedure.STANDSTILL]: [
    StatutProcedure.ATTRIBUTION_PROVISOIRE, // Standstill post-attribution
    StatutProcedure.EVALUATION,             // Retour pour ouverture enveloppes financieres
    StatutProcedure.RECOURS,
  ],
};

// ---------------------------------------------------------------------------
// Selection du tableau de transitions selon le mode
// ---------------------------------------------------------------------------

function getTransitions(
  mode: ModePassation
): Record<StatutProcedure, StatutProcedure[]> {
  if (
    mode === ModePassation.DRP_TRAVAUX ||
    mode === ModePassation.DRP_FOURNITURES ||
    mode === ModePassation.DRP_SERVICES ||
    mode === ModePassation.DC
  ) {
    return TRANSITIONS_DRP;
  }

  if (
    mode === ModePassation.SFQC ||
    mode === ModePassation.SFQ ||
    mode === ModePassation.SCBD ||
    mode === ModePassation.SMC ||
    mode === ModePassation.SFQC_QUALIFICATION
  ) {
    return TRANSITIONS_SFQC;
  }

  return TRANSITIONS_AOO;
}

// ---------------------------------------------------------------------------
// Verification des transitions
// ---------------------------------------------------------------------------

/**
 * Verifie si une transition de statut est valide pour un mode donne.
 */
export function peutTransitionner(
  statutActuel: StatutProcedure,
  cible: StatutProcedure,
  mode: ModePassation
): boolean {
  const transitions = getTransitions(mode);
  const transitionsValides = transitions[statutActuel] ?? [];
  return transitionsValides.includes(cible);
}

/**
 * Retourne les transitions valides depuis le statut actuel.
 */
export function getTransitionsValides(
  statutActuel: StatutProcedure,
  mode: ModePassation
): StatutProcedure[] {
  const transitions = getTransitions(mode);
  return transitions[statutActuel] ?? [];
}

// ---------------------------------------------------------------------------
// Etapes requises avant une transition
// ---------------------------------------------------------------------------

/**
 * Retourne les etapes a completer avant de passer au statut suivant.
 * Manuel de Procedures, Partie 3
 */
export function getEtapesRequises(
  statutActuel: StatutProcedure,
  _mode: ModePassation
): EtapeRequise[] {
  const etapes: Record<StatutProcedure, EtapeRequise[]> = {
    [StatutProcedure.PLANIFIE]: [],
    [StatutProcedure.PREPARATION]: [
      {
        id: "dao_cree",
        libelle: "DAO cree et complete",
        estObligatoire: true,
        articleSource: "Art. 3 al. 1, Decret 2020-600",
      },
      {
        id: "checklist_armp",
        libelle: "Checklist ARMP (85 points) validee",
        estObligatoire: true,
        articleSource: "Check-lists ARMP",
      },
    ],
    [StatutProcedure.LANCE]: [
      {
        id: "bal_obtenu",
        libelle: "Bon a Lancer (BAL) obtenu de l'organe de controle",
        estObligatoire: true,
        articleSource: "Art. 3 al. 2-3, Decret 2020-600",
      },
      {
        id: "aao_publie",
        libelle: "Avis d'Appel d'Offres (AAO) publie",
        estObligatoire: true,
        articleSource: "Art. 3 al. 4, Decret 2020-600",
      },
    ],
    [StatutProcedure.EVALUATION]: [
      {
        id: "pv_ouverture",
        libelle: "PV d'ouverture des plis signe (quorum COE 3/5)",
        estObligatoire: true,
        articleSource: "Art. 75, Loi 2020-26",
      },
    ],
    [StatutProcedure.ATTRIBUTION_PROVISOIRE]: [
      {
        id: "rapport_evaluation",
        libelle: "Rapport d'evaluation complete et transmis a l'organe de controle",
        estObligatoire: true,
        articleSource: "Art. 3 al. 5, Decret 2020-600",
      },
      {
        id: "avis_organe",
        libelle: "Avis de l'organe de controle recu",
        estObligatoire: true,
        articleSource: "Art. 4-5, Decret 2020-600",
      },
    ],
    [StatutProcedure.STANDSTILL]: [
      {
        id: "notification_provisoire",
        libelle: "Notification d'attribution provisoire envoyee a tous les candidats",
        estObligatoire: true,
        articleSource: "Art. 79 al. 1-3, Loi 2020-26",
      },
    ],
    [StatutProcedure.RECOURS]: [],
    [StatutProcedure.CONTRACTUALISATION]: [
      {
        id: "standstill_ecoule",
        libelle: "Periode de standstill de 10 jours calendaires ecoulee sans recours",
        estObligatoire: true,
        articleSource: "Art. 79 al. 3, Loi 2020-26",
      },
      {
        id: "beneficiaires_effectifs",
        libelle: "Formulaire de divulgation des beneficiaires effectifs (avec champ sexe)",
        estObligatoire: true,
        articleSource: "Circulaire ARMP 2024-002",
      },
    ],
    [StatutProcedure.APPROUVE]: [
      {
        id: "signature_attributaire",
        libelle: "Marche signe par l'attributaire (3 jours ouvrables)",
        estObligatoire: true,
        articleSource: "Art. 3, Decret 2020-600",
      },
      {
        id: "signature_prmp",
        libelle: "Marche signe par la PRMP (2 jours ouvrables)",
        estObligatoire: true,
        articleSource: "Art. 3, Decret 2020-600",
      },
    ],
    [StatutProcedure.AUTHENTIFIE]: [
      {
        id: "approbation",
        libelle: "Approbation du marche par l'autorite approbatrice (5 jours ouvrables)",
        estObligatoire: true,
        articleSource: "Art. 6, Decret 2020-600",
      },
    ],
    [StatutProcedure.ENREGISTRE]: [
      {
        id: "authentification_dncmp",
        libelle: "Authentification et numerotation DNCMP (3 jours ouvrables)",
        estObligatoire: true,
        articleSource: "Art. 4, Decret 2020-600",
      },
    ],
    [StatutProcedure.NOTIFIE]: [
      {
        id: "enregistrement_dgi",
        libelle: "Enregistrement a la DGI et paiement redevance ARMP",
        estObligatoire: true,
        articleSource: "Procedures ARMP",
      },
    ],
    [StatutProcedure.EN_VIGUEUR]: [
      {
        id: "notification_definitive",
        libelle: "Notification definitive (3 jours calendaires apres approbation)",
        estObligatoire: true,
        articleSource: "Art. 86 al. 2, Loi 2020-26",
      },
    ],
    [StatutProcedure.EXECUTION]: [
      {
        id: "os_demarrage",
        libelle: "Ordre de Service de demarrage emis",
        estObligatoire: true,
        articleSource: "Procedures ARMP",
      },
    ],
    [StatutProcedure.RECEPTION_PROVISOIRE]: [],
    [StatutProcedure.RECEPTION_DEFINITIVE]: [],
    [StatutProcedure.SOLDE]: [],
    [StatutProcedure.SUSPENDU]: [],
    [StatutProcedure.ANNULE]: [],
  };

  return etapes[statutActuel] ?? [];
}

// ---------------------------------------------------------------------------
// Labels des statuts (en francais)
// ---------------------------------------------------------------------------

export const STATUT_LABELS: Record<StatutProcedure, string> = {
  [StatutProcedure.PLANIFIE]: "Planifie (PPM)",
  [StatutProcedure.PREPARATION]: "Preparation du DAO",
  [StatutProcedure.LANCE]: "Appel d'offres lance",
  [StatutProcedure.EVALUATION]: "Evaluation en cours (COE)",
  [StatutProcedure.ATTRIBUTION_PROVISOIRE]: "Attribution provisoire",
  [StatutProcedure.STANDSTILL]: "Standstill (10 jours)",
  [StatutProcedure.RECOURS]: "Recours en cours",
  [StatutProcedure.CONTRACTUALISATION]: "Contractualisation",
  [StatutProcedure.APPROUVE]: "Approuve",
  [StatutProcedure.AUTHENTIFIE]: "Authentifie (DNCMP)",
  [StatutProcedure.ENREGISTRE]: "Enregistre (DGI)",
  [StatutProcedure.NOTIFIE]: "Notifie",
  [StatutProcedure.EN_VIGUEUR]: "En vigueur",
  [StatutProcedure.EXECUTION]: "En execution",
  [StatutProcedure.RECEPTION_PROVISOIRE]: "Reception provisoire",
  [StatutProcedure.RECEPTION_DEFINITIVE]: "Reception definitive",
  [StatutProcedure.SOLDE]: "Solde",
  [StatutProcedure.SUSPENDU]: "Suspendu",
  [StatutProcedure.ANNULE]: "Annule",
};

// ---------------------------------------------------------------------------
// Details des etapes de l'AOO (Manuel pp.31-75)
// ---------------------------------------------------------------------------

/** Labels des 14 etapes de l'AOO selon le Manuel de Procedures pp.31-75 */
export const ETAPES_AOO = [
  { numero: 1, code: "E1", libelle: "Definition des specifications techniques" },
  { numero: 2, code: "E2", libelle: "Preparation du DAO" },
  { numero: 3, code: "E3", libelle: "Lancement de l'AO et delai de preparation des offres" },
  { numero: 4, code: "E4", libelle: "Reception des offres" },
  { numero: 5, code: "E5", libelle: "Ouverture des plis (seance publique)" },
  { numero: 6, code: "E6", libelle: "Evaluation des offres et proposition d'attribution" },
  { numero: 7, code: "E7", libelle: "Notification d'attribution provisoire" },
  { numero: 8, code: "E8", libelle: "Elaboration et signature du marche" },
  { numero: 9, code: "E9", libelle: "Approbation du marche" },
  { numero: 10, code: "E10", libelle: "Authentification et numerotation (DNCMP)" },
  { numero: 11, code: "E11", libelle: "Enregistrement du marche (DGI, redevance ARMP)" },
  { numero: 12, code: "E12", libelle: "Notification de l'attribution definitive" },
  { numero: 13, code: "E13", libelle: "Entree en vigueur du marche" },
  { numero: 14, code: "E14", libelle: "Publication de l'avis d'attribution definitive" },
] as const;
