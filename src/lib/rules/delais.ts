/**
 * Moteur de regles : Delais legaux
 * Source : Decret 2020-600 Art. 3-8 ; Loi 2020-26 Art. 54, 79, 116-117
 *          Clauses 7/8 IC DAO-types (eclaircissements)
 *
 * IMPORTANT : distinguer delais ouvrables (lun-ven) et calendaires
 */

import { z } from "zod";
import type { DelaiLegal, DeadlineMap } from "@/types/domain";
import {
  ModePassation,
  OrganeControle,
  StatutProcedure,
  TypeDelai,
} from "@/types/enums";

// ---------------------------------------------------------------------------
// Jours feries du Benin
// ---------------------------------------------------------------------------

/**
 * Jours feries officiels de la Republique du Benin
 * Source : legislation beninoise sur les jours feries
 */
export function getJoursFeries(annee: number): Date[] {
  return [
    new Date(annee, 0, 1),   // 1er janvier — Nouvel An
    new Date(annee, 0, 10),  // 10 janvier — Fete du Vodoun (Fete nationale des religions endogenes)
    new Date(annee, 1, 28),  // 28 fevrier — Fete des religions chretiennes (variable, approx)
    new Date(annee, 3, 1),   // 1er avril — Paques (variable)
    new Date(annee, 3, 4),   // Lundi de Paques (variable)
    new Date(annee, 4, 1),   // 1er mai — Fete du Travail
    new Date(annee, 4, 12),  // Ascension (variable, 39j apres Paques)
    new Date(annee, 4, 22),  // Pentecote (variable)
    new Date(annee, 4, 23),  // Lundi de Pentecote
    new Date(annee, 7, 1),   // 1er aout — Fete nationale
    new Date(annee, 7, 15),  // 15 aout — Assomption
    new Date(annee, 10, 1),  // 1er novembre — Toussaint
    new Date(annee, 11, 25), // 25 decembre — Noel
    // Fetes musulmanes (variables selon calendrier hegirien — approximations)
    // Tabaski, Maouloud, Ramadan — a ajuster selon l'annee
  ];
}

/**
 * Verifie si une date est un jour ferie au Benin
 */
function isJourFerie(date: Date, joursFeries: Date[]): boolean {
  return joursFeries.some(
    (f) =>
      f.getFullYear() === date.getFullYear() &&
      f.getMonth() === date.getMonth() &&
      f.getDate() === date.getDate()
  );
}

/**
 * Verifie si une date est un jour ouvrable (lun-ven, non ferie)
 */
function isJourOuvrable(date: Date, joursFeries: Date[]): boolean {
  const jour = date.getDay(); // 0=dim, 6=sam
  return jour !== 0 && jour !== 6 && !isJourFerie(date, joursFeries);
}

// ---------------------------------------------------------------------------
// Calcul des delais
// ---------------------------------------------------------------------------

/**
 * Ajoute N jours ouvrables (lundi-vendredi, hors feries) a une date.
 * Art. 3-6, Decret 2020-600 : tous les delais des organes sont en jours ouvrables.
 */
export function addJoursOuvrables(
  dateDebut: Date,
  joursOuvrables: number
): Date {
  const joursFeries = getJoursFeries(dateDebut.getFullYear());
  let count = 0;
  const result = new Date(dateDebut);

  while (count < joursOuvrables) {
    result.setDate(result.getDate() + 1);
    if (isJourOuvrable(result, joursFeries)) {
      count++;
    }
  }

  return result;
}

/**
 * Ajoute N jours calendaires a une date.
 * Art. 54, Loi 2020-26 : les delais de remise des offres sont en jours calendaires.
 */
export function addJoursCalendaires(
  dateDebut: Date,
  joursCalendaires: number
): Date {
  const result = new Date(dateDebut);
  result.setDate(result.getDate() + joursCalendaires);
  return result;
}

/**
 * Calcule le nombre de jours ouvrables entre deux dates.
 */
export function joursOuvrablesBetween(dateDebut: Date, dateFin: Date): number {
  const joursFeries = getJoursFeries(dateDebut.getFullYear());
  let count = 0;
  const current = new Date(dateDebut);

  while (current < dateFin) {
    current.setDate(current.getDate() + 1);
    if (isJourOuvrable(current, joursFeries)) {
      count++;
    }
  }

  return count;
}

/**
 * Verifie si un delai est depasse.
 */
export function verifierDelaiDepasse(
  dateLimite: Date,
  maintenant: Date = new Date()
): boolean {
  return maintenant > dateLimite;
}

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

export const DelaisInputSchema = z.object({
  statut: z.nativeEnum(StatutProcedure),
  dateEvenement: z.date(),
  mode: z.nativeEnum(ModePassation),
  organeControle: z.nativeEnum(OrganeControle),
  isCommunautaire: z.boolean().default(false),
});

export type DelaisInput = z.infer<typeof DelaisInputSchema>;

// ---------------------------------------------------------------------------
// Delais de remise des offres
// ---------------------------------------------------------------------------

/**
 * Retourne le delai minimal de remise des offres selon le mode et le caractere
 * communautaire du marche.
 * Art. 54 al. 1, Loi 2020-26 ; Manuel p.97, p.131
 */
export function getDelaiRemiseOffres(
  mode: ModePassation,
  isCommunautaire: boolean
): { jours: number; typeDelai: TypeDelai; articleSource: string } {
  const modesPI: ModePassation[] = [
    ModePassation.SFQC,
    ModePassation.SFQ,
    ModePassation.SCBD,
    ModePassation.SMC,
    ModePassation.SFQC_QUALIFICATION,
    ModePassation.SCI,
    ModePassation.ENTENTE_DIRECTE_PI,
  ];
  const estPI = modesPI.includes(mode);

  if (estPI) {
    return {
      jours: 14,
      typeDelai: TypeDelai.OUVRABLE,
      articleSource: "Manuel de Procedures p.131 — PI Demande de Propositions",
    };
  }

  if (
    mode === ModePassation.DRP_TRAVAUX ||
    mode === ModePassation.DRP_FOURNITURES ||
    mode === ModePassation.DRP_SERVICES
  ) {
    return {
      jours: 15,
      typeDelai: TypeDelai.CALENDAIRE,
      articleSource: "Manuel de Procedures p.97 — DRP",
    };
  }

  if (isCommunautaire) {
    return {
      jours: 30,
      typeDelai: TypeDelai.CALENDAIRE,
      articleSource: "Art. 54 al. 1, Loi 2020-26 — AO communautaire UEMOA",
    };
  }

  // AO national
  return {
    jours: 21,
    typeDelai: TypeDelai.CALENDAIRE,
    articleSource: "Art. 54 al. 1, Loi 2020-26 — AO national",
  };
}

// ---------------------------------------------------------------------------
// Calcul complet des delais d'un marche
// ---------------------------------------------------------------------------

/**
 * Calcule tous les delais legaux a partir d'une date de reference.
 * Retourne une map nom -> DelaiLegal avec les dates limites calculees.
 */
export function calculerDelaisMarche(
  dateReference: Date,
  mode: ModePassation,
  organeControle: OrganeControle,
  isCommunautaire: boolean,
  maintenant: Date = new Date()
): DeadlineMap {
  const delais: DeadlineMap = {};

  // Preparation du DAO : 30 jours calendaires avant date de lancement
  // Art. 3 al. 1, Decret 2020-600
  const dateLimiteDAO = addJoursCalendaires(dateReference, -30);
  delais["preparation_dao"] = creerDelai(
    "Preparation du DAO",
    dateReference,
    dateLimiteDAO,
    TypeDelai.CALENDAIRE,
    -30,
    "Art. 3 al. 1, Decret 2020-600",
    maintenant
  );

  // Transmission DAO a l'organe de controle : 10 jours ouvrables avant lancement
  // Art. 3 al. 2, Decret 2020-600
  const dateLimiteTransmissionDAO = addJoursOuvrables(dateReference, -10);
  delais["transmission_dao_controle"] = creerDelai(
    "Transmission DAO a l'organe de controle",
    dateReference,
    dateLimiteTransmissionDAO,
    TypeDelai.OUVRABLE,
    -10,
    "Art. 3 al. 2, Decret 2020-600",
    maintenant
  );

  // Delai de remise des offres
  const delaiOffres = getDelaiRemiseOffres(mode, isCommunautaire);
  const dateLimiteSoumission =
    delaiOffres.typeDelai === TypeDelai.CALENDAIRE
      ? addJoursCalendaires(dateReference, delaiOffres.jours)
      : addJoursOuvrables(dateReference, delaiOffres.jours);
  delais["remise_offres"] = creerDelai(
    "Delai de remise des offres",
    dateReference,
    dateLimiteSoumission,
    delaiOffres.typeDelai,
    delaiOffres.jours,
    delaiOffres.articleSource,
    maintenant
  );

  // Avis organe de controle sur le DAO
  const delaiAvisDAO = organeControle === OrganeControle.CCMP ? 3 : organeControle === OrganeControle.DNCMP ? 4 : 4;
  const dateLimiteAvisDAO = addJoursOuvrables(dateReference, delaiAvisDAO);
  delais["avis_dao_controle"] = creerDelai(
    `Avis ${organeControle.toUpperCase()} sur le DAO`,
    dateReference,
    dateLimiteAvisDAO,
    TypeDelai.OUVRABLE,
    delaiAvisDAO,
    organeControle === OrganeControle.CCMP
      ? "Art. 5, Decret 2020-600 — CCMP"
      : "Art. 4, Decret 2020-600 — DNCMP/DDCMP",
    maintenant
  );

  // Evaluation des offres par la COE : 10 jours ouvrables apres reception
  // Art. 3 al. 5, Decret 2020-600
  const dateLimiteEvaluation = addJoursOuvrables(dateLimiteSoumission, 10);
  delais["evaluation_offres"] = creerDelai(
    "Evaluation des offres (COE)",
    dateLimiteSoumission,
    dateLimiteEvaluation,
    TypeDelai.OUVRABLE,
    10,
    "Art. 3 al. 5, Decret 2020-600",
    maintenant
  );

  // Standstill : 10 jours calendaires apres attribution provisoire
  // Art. 79 al. 3, Loi 2020-26
  const dateAttributionProvisoire = addJoursOuvrables(dateLimiteEvaluation, 1);
  const dateFinStandstill = addJoursCalendaires(dateAttributionProvisoire, 10);
  delais["standstill"] = creerDelai(
    "Periode de standstill",
    dateAttributionProvisoire,
    dateFinStandstill,
    TypeDelai.CALENDAIRE,
    10,
    "Art. 79 al. 3, Loi 2020-26",
    maintenant
  );

  // Approbation du marche : 5 jours ouvrables — Art. 6, Decret 2020-600
  const dateFinContractualisation = addJoursOuvrables(dateFinStandstill, 5);
  const dateLimiteApprobation = addJoursOuvrables(dateFinContractualisation, 5);
  delais["approbation"] = creerDelai(
    "Approbation du marche (autorite approbatrice)",
    dateFinContractualisation,
    dateLimiteApprobation,
    TypeDelai.OUVRABLE,
    5,
    "Art. 6, Decret 2020-600",
    maintenant
  );

  // Notification definitive : 3 jours calendaires apres approbation
  // Art. 86 al. 2, Loi 2020-26
  const dateLimiteNotification = addJoursCalendaires(dateLimiteApprobation, 3);
  delais["notification_definitive"] = creerDelai(
    "Notification definitive",
    dateLimiteApprobation,
    dateLimiteNotification,
    TypeDelai.CALENDAIRE,
    3,
    "Art. 86 al. 2, Loi 2020-26",
    maintenant
  );

  // Publication avis attribution definitive : 15 jours calendaires apres entree en vigueur
  // Art. 87, Loi 2020-26
  const dateLimitePublication = addJoursCalendaires(dateLimiteNotification, 15);
  delais["publication_attribution_definitive"] = creerDelai(
    "Publication avis attribution definitive",
    dateLimiteNotification,
    dateLimitePublication,
    TypeDelai.CALENDAIRE,
    15,
    "Art. 87, Loi 2020-26",
    maintenant
  );

  return delais;
}

// ---------------------------------------------------------------------------
// Delais de recours
// ---------------------------------------------------------------------------

export const DELAI_RECOURS_AC_JOURS_OUVRABLES = 5; // Art. 116, Loi 2020-26
export const DELAI_REPONSE_AC_JOURS_OUVRABLES = 3; // Art. 116
export const DELAI_RECOURS_ARMP_JOURS_OUVRABLES = 2; // Art. 117
export const DELAI_DECISION_ARMP_JOURS_OUVRABLES = 7; // Art. 117
export const DELAI_MISE_CONFORMITE_JOURS_OUVRABLES = 5; // Art. 117
export const DELAI_RECOURS_DRP_DC_JOURS_OUVRABLES = 2; // Circulaire 2023-002

/**
 * Calcule les delais de recours a partir de la date de publication
 * de l'attribution provisoire.
 */
export function calculerDelaisRecours(
  datePublicationAttribution: Date,
  estDRPouDC: boolean,
  maintenant: Date = new Date()
): DeadlineMap {
  const delais: DeadlineMap = {};

  const delaiDepot = estDRPouDC
    ? DELAI_RECOURS_DRP_DC_JOURS_OUVRABLES
    : DELAI_RECOURS_AC_JOURS_OUVRABLES;

  const articleRecours = estDRPouDC
    ? "Circulaire ARMP 2023-002"
    : "Art. 116, Loi 2020-26";

  const dateLimiteRecoursAC = addJoursOuvrables(
    datePublicationAttribution,
    delaiDepot
  );
  delais["recours_ac"] = creerDelai(
    "Depot recours devant l'AC",
    datePublicationAttribution,
    dateLimiteRecoursAC,
    TypeDelai.OUVRABLE,
    delaiDepot,
    articleRecours,
    maintenant
  );

  const dateLimiteReponseAC = addJoursOuvrables(dateLimiteRecoursAC, DELAI_REPONSE_AC_JOURS_OUVRABLES);
  delais["reponse_ac"] = creerDelai(
    "Reponse AC au recours",
    dateLimiteRecoursAC,
    dateLimiteReponseAC,
    TypeDelai.OUVRABLE,
    DELAI_REPONSE_AC_JOURS_OUVRABLES,
    articleRecours,
    maintenant
  );

  const dateLimiteRecoursARMP = addJoursOuvrables(dateLimiteReponseAC, DELAI_RECOURS_ARMP_JOURS_OUVRABLES);
  delais["recours_armp"] = creerDelai(
    "Recours devant l'ARMP",
    dateLimiteReponseAC,
    dateLimiteRecoursARMP,
    TypeDelai.OUVRABLE,
    DELAI_RECOURS_ARMP_JOURS_OUVRABLES,
    "Art. 117, Loi 2020-26",
    maintenant
  );

  return delais;
}

// ---------------------------------------------------------------------------
// Helper interne
// ---------------------------------------------------------------------------

function creerDelai(
  libelle: string,
  dateDebut: Date,
  dateLimite: Date,
  typeDelai: TypeDelai,
  _jours: number,
  articleSource: string,
  maintenant: Date
): DelaiLegal {
  return {
    libelle,
    jours: Math.abs(_jours),
    typeDelai,
    dateDebut,
    dateLimite,
    estDepasse: verifierDelaiDepasse(dateLimite, maintenant),
    articleSource,
  };
}
