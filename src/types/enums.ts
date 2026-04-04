/**
 * Enumerations du domaine PRMP-Pro
 * Sources : Loi 2020-26, Decrets 2020-595 a 2020-605, Manuel de Procedures ARMP
 */

/** 17 modes de passation des marches publics — Manuel de Procedures, Partie 3 */
export const ModePassation = {
  AOO: "aoo",
  AOO_PREQUALIFICATION: "aoo_prequalification",
  AO_DEUX_ETAPES: "ao_deux_etapes",
  AO_CONCOURS: "ao_concours",
  AO_RESTREINT: "ao_restreint",
  GRE_A_GRE: "gre_a_gre",
  DRP_TRAVAUX: "drp_travaux",
  DRP_FOURNITURES: "drp_fournitures",
  DRP_SERVICES: "drp_services",
  DC: "dc",
  SFQC: "sfqc",
  SFQ: "sfq",
  SCBD: "scbd",
  SMC: "smc",
  SFQC_QUALIFICATION: "sfqc_qualification",
  SCI: "sci",
  ENTENTE_DIRECTE_PI: "entente_directe_pi",
} as const;

export type ModePassation = (typeof ModePassation)[keyof typeof ModePassation];

/** 19 statuts de procedure — cycle de vie complet d'un marche */
export const StatutProcedure = {
  PLANIFIE: "planifie",
  PREPARATION: "preparation",
  LANCE: "lance",
  EVALUATION: "evaluation",
  ATTRIBUTION_PROVISOIRE: "attribution_provisoire",
  STANDSTILL: "standstill",
  RECOURS: "recours",
  CONTRACTUALISATION: "contractualisation",
  APPROUVE: "approuve",
  AUTHENTIFIE: "authentifie",
  ENREGISTRE: "enregistre",
  NOTIFIE: "notifie",
  EN_VIGUEUR: "en_vigueur",
  EXECUTION: "execution",
  RECEPTION_PROVISOIRE: "reception_provisoire",
  RECEPTION_DEFINITIVE: "reception_definitive",
  SOLDE: "solde",
  SUSPENDU: "suspendu",
  ANNULE: "annule",
} as const;

export type StatutProcedure =
  (typeof StatutProcedure)[keyof typeof StatutProcedure];

/** 5 natures de marche — Art. 4, Loi 2020-26 */
export const NatureMarche = {
  TRAVAUX: "travaux",
  FOURNITURES: "fournitures",
  SERVICES: "services",
  PI_CABINET: "pi_cabinet",
  PI_INDIVIDUEL: "pi_individuel",
} as const;

export type NatureMarche = (typeof NatureMarche)[keyof typeof NatureMarche];

/** 7 types d'autorite contractante — Decret 2020-599 */
export const TypeEntite = {
  MINISTERE: "ministere",
  EP_EPIC: "ep_epic",
  EP_EPA: "ep_epa",
  COMMUNE_STATUT: "commune_statut",
  COMMUNE_SANS_STATUT: "commune_sans_statut",
  PREFECTURE: "prefecture",
  AUTRE: "autre",
} as const;

export type TypeEntite = (typeof TypeEntite)[keyof typeof TypeEntite];

/** 3 organes de controle a priori — Manuel de Procedures p.19-21 */
export const OrganeControle = {
  CCMP: "ccmp",
  DDCMP: "ddcmp",
  DNCMP: "dncmp",
} as const;

export type OrganeControle = (typeof OrganeControle)[keyof typeof OrganeControle];

/** 3 phases d'evaluation des offres — Manuel de Procedures pp.35-65 */
export const PhaseEvaluation = {
  CONFORMITE: "conformite",
  TECHNIQUE: "technique",
  FINANCIERE: "financiere",
} as const;

export type PhaseEvaluation =
  (typeof PhaseEvaluation)[keyof typeof PhaseEvaluation];

/** Statuts de recours — Art. 116-117, Loi 2020-26 */
export const StatutRecours = {
  DEPOSE: "depose",
  EN_COURS: "en_cours",
  ACCEPTE: "accepte",
  REJETE: "rejete",
} as const;

export type StatutRecours = (typeof StatutRecours)[keyof typeof StatutRecours];

/** Types de delais legaux */
export const TypeDelai = {
  OUVRABLE: "ouvrable",
  CALENDAIRE: "calendaire",
} as const;

export type TypeDelai = (typeof TypeDelai)[keyof typeof TypeDelai];

/** Types de documents generes et archives */
export const TypeDocument = {
  DAO: "dao",
  AAO: "aao",
  PV_OUVERTURE: "pv_ouverture",
  RAPPORT_EVALUATION: "rapport_evaluation",
  MARCHE: "marche",
  ORDRE_SERVICE: "ordre_service",
  DECOMPTE: "decompte",
  AVENANT: "avenant",
  PV_RECEPTION: "pv_reception",
  RAPPORT_TRIMESTRIEL: "rapport_trimestriel",
  RAPPORT_SPECIAL_GRE: "rapport_special_gre",
  BENEFICIAIRES_EFFECTIFS: "beneficiaires_effectifs",
} as const;

export type TypeDocument = (typeof TypeDocument)[keyof typeof TypeDocument];

/** Niveaux d'alerte de l'agent IA — Regles de codage, CLAUDE.md */
export const NiveauAlerte = {
  BLOQUANT: "bloquant",
  AVERTISSEMENT: "avertissement",
  SUGGESTION: "suggestion",
} as const;

export type NiveauAlerte = (typeof NiveauAlerte)[keyof typeof NiveauAlerte];

/** Types d'ordre de service */
export const TypeOrdreService = {
  DEMARRAGE: "demarrage",
  ARRET: "arret",
  REPRISE: "reprise",
  CLOTURE: "cloture",
} as const;

export type TypeOrdreService =
  (typeof TypeOrdreService)[keyof typeof TypeOrdreService];

/** Types de recepction des travaux/fournitures */
export const TypeReception = {
  PROVISOIRE: "provisoire",
  DEFINITIVE: "definitive",
} as const;

export type TypeReception = (typeof TypeReception)[keyof typeof TypeReception];

/** Sexe du beneficiaire effectif — Circulaire 2024-002 (obligatoire depuis nov. 2024) */
export const SexeBeneficiaire = {
  MASCULIN: "masculin",
  FEMININ: "feminin",
} as const;

export type SexeBeneficiaire =
  (typeof SexeBeneficiaire)[keyof typeof SexeBeneficiaire];

/** Types de controle du beneficiaire effectif — Circulaire 2024-002 */
export const TypeControleBeneficiaire = {
  ACTIONS: "actions",
  VOTES: "votes",
  CONSEIL_ADMINISTRATION: "conseil_administration",
} as const;

export type TypeControleBeneficiaire =
  (typeof TypeControleBeneficiaire)[keyof typeof TypeControleBeneficiaire];

/** Roles utilisateurs — Better-Auth RBAC */
export const RoleUtilisateur = {
  PRMP: "prmp",
  ADMIN: "admin",
  READONLY: "readonly",
} as const;

export type RoleUtilisateur =
  (typeof RoleUtilisateur)[keyof typeof RoleUtilisateur];

/** Types d'alertes systeme */
export const TypeAlerteSysteme = {
  DELAI_DEPASSEMENT: "delai_depassement",
  FRAGMENTATION: "fragmentation",
  OAB: "oab",
  PENALITE_PLAFOND: "penalite_plafond",
  RECOURS_URGENT: "recours_urgent",
  PPM_RETARD: "ppm_retard",
  GRE_A_GRE_CUMUL: "gre_a_gre_cumul",
} as const;

export type TypeAlerteSysteme =
  (typeof TypeAlerteSysteme)[keyof typeof TypeAlerteSysteme];
