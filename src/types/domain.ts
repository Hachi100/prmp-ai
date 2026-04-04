/**
 * Types metier du domaine PRMP-Pro
 * Interfaces partagees entre le moteur de regles, l'API et le frontend
 */

import type {
  ModePassation,
  NatureMarche,
  NiveauAlerte,
  OrganeControle,
  StatutProcedure,
  TypeDelai,
  TypeEntite,
} from "./enums";

// ---------------------------------------------------------------------------
// Seuils et controles
// ---------------------------------------------------------------------------

/** Resultat de la determination du seuil applicable */
export interface SeuilApplicable {
  /** Seuil de passation en FCFA HT — Art. 1-2, Decret 2020-599 */
  seuilPassation: bigint;
  /** Seuil de controle a priori en FCFA HT */
  seuilControle: bigint;
  /** Organe de controle competent */
  organeControle: OrganeControle;
  /** Le marche est-il au-dessus des seuils UEMOA ? — Art. 8, Decret 2020-599 */
  isCommunautaire: boolean;
  /** Mode(s) de passation valides pour ce montant et cette nature */
  modesValides: ModePassation[];
  /** Source reglementaire */
  sourceJuridique: string;
}

/** Alerte de franchissement de seuil */
export interface AlerteSeuil {
  niveau: NiveauAlerte;
  message: string;
  seuilConcerne: bigint;
  articleSource: string;
}

// ---------------------------------------------------------------------------
// Delais
// ---------------------------------------------------------------------------

/** Un delai legal calcule */
export interface DelaiLegal {
  /** Libelle du delai */
  libelle: string;
  /** Nombre de jours */
  jours: number;
  /** Type : ouvrable ou calendaire */
  typeDelai: TypeDelai;
  /** Date de debut */
  dateDebut: Date;
  /** Date limite calculee */
  dateLimite: Date;
  /** Est-il depasse ? */
  estDepasse: boolean;
  /** Source juridique */
  articleSource: string;
}

/** Ensemble des delais calcules pour un marche */
export type DeadlineMap = Record<string, DelaiLegal>;

// ---------------------------------------------------------------------------
// Fractionnement
// ---------------------------------------------------------------------------

/** Alerte de fractionnement illegal — Art. 24 al. 7 et Art. 26, Loi 2020-26 */
export interface AlerteFragmentation {
  niveau: NiveauAlerte;
  message: string;
  nature: NatureMarche;
  directionBeneficiaire: string;
  exercice: number;
  /** Montant cumule des marches de meme nature */
  montantCumule: bigint;
  /** Seuil de passation applicable */
  seuilPassation: bigint;
  /** IDs des marches inclus dans le cumul */
  marcheIds: string[];
  articleSource: string;
}

// ---------------------------------------------------------------------------
// OAB - Offres Anormalement Basses
// ---------------------------------------------------------------------------

/** Offre financiere pour le calcul OAB */
export interface OffreFinanciere {
  id: string;
  soumissionnaireNom: string;
  montantCorrige: bigint;
}

/** Resultat du calcul OAB — Art. 81, Loi 2020-26 */
export interface ResultatOAB {
  /** Seuil M = 0.80 x (0.6 x Fm + 0.4 x Fc) */
  seuilM: bigint;
  /** Fm : moyenne arithmetique des offres corrigees */
  fm: bigint;
  /** Fc : estimation previsionnelle de l'AC */
  fc: bigint;
  /** Offres presumees anormalement basses (montant < M) */
  offresOAB: Array<{
    offre: OffreFinanciere;
    ecartPct: number;
  }>;
  /** Formule appliquee pour audit */
  formule: string;
  articleSource: string;
}

// ---------------------------------------------------------------------------
// Penalites
// ---------------------------------------------------------------------------

/** Resultat du calcul de penalites — Art. 113-114, Loi 2020-26 */
export interface PenaliteCalcul {
  /** Montant de la penalite pour la periode */
  montantPenalite: bigint;
  /** Cumul total des penalites */
  montantCumule: bigint;
  /** Plafond = 10% du montant TTC — Art. 114 */
  plafond10pct: bigint;
  /** Pourcentage du plafond atteint */
  pourcentagePlafond: number;
  /** Resiliation de plein droit si penalite >= plafond */
  declencheResiliation: boolean;
  articleSource: string;
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

/** Transition d'etat d'une procedure */
export interface TransitionProcedure {
  de: StatutProcedure;
  vers: StatutProcedure;
  /** Conditions pre-requises */
  prerequis: string[];
  /** Documents requis avant la transition */
  documentsRequis: string[];
  articleSource: string;
}

/** Etape requise avant une transition */
export interface EtapeRequise {
  id: string;
  libelle: string;
  estObligatoire: boolean;
  articleSource: string;
}

// ---------------------------------------------------------------------------
// RAG - Base juridique
// ---------------------------------------------------------------------------

/** Chunk de texte juridique indexe */
export interface ChunkJuridique {
  id: string;
  source: string;
  articleRef: string;
  titre: string;
  contenu: string;
  /** Score de similarite cosinus [0, 1] */
  score?: number;
}

// ---------------------------------------------------------------------------
// Agent IA
// ---------------------------------------------------------------------------

/** Message dans la conversation avec l'agent IA */
export interface MessageIA {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/** Contexte injecte dans le panneau IA selon l'ecran actuel */
export interface ContexteMarche {
  marcheId?: string;
  objet?: string;
  nature?: NatureMarche;
  mode?: ModePassation;
  statut?: StatutProcedure;
  montantEstime?: bigint;
  organeControle?: OrganeControle;
  module: string;
  /** Articles pertinents pre-charges par le retriever */
  articlesPertinents?: ChunkJuridique[];
}

/** Alerte generee par l'agent IA */
export interface AlerteIA {
  niveau: NiveauAlerte;
  message: string;
  articleSource?: string;
  action?: string;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

/** KPIs du tableau de bord principal */
export interface KpiDashboard {
  totalMarchesAnnee: number;
  montantTotalPrevu: bigint;
  montantTotalContracte: bigint;
  tauxExecution: number;
  alertesActives: number;
  marchesByStatut: Record<StatutProcedure, number>;
  delaisMoyens: {
    passation: number;
    paiement: number;
  };
}

// ---------------------------------------------------------------------------
// Entite contractante
// ---------------------------------------------------------------------------

/** Profil complet d'une autorite contractante */
export interface ProfilEntite {
  id: string;
  code: string;
  nom: string;
  type: TypeEntite;
  region: string;
  commune?: string;
  hasCCMPDelegues: boolean;
}
