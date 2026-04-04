/**
 * Moteur de regles : Seuils de passation et de controle
 * Source : Decret 2020-599 Art. 1-8 ; Manuel de Procedures p.19-21
 *
 * Hierarchie : Loi 2020-26 > Decrets > Manuel de procedures
 */

import { z } from "zod";
import type { AlerteSeuil, SeuilApplicable } from "@/types/domain";
import {
  ModePassation,
  NatureMarche,
  NiveauAlerte,
  OrganeControle,
  TypeEntite,
} from "@/types/enums";

// ---------------------------------------------------------------------------
// Constantes des seuils (en FCFA HT)
// ---------------------------------------------------------------------------

// Seuils de passation — Art. 1-2, Decret 2020-599
// Toutes AC sauf communes sans statut particulier
const SEUIL_AO_TRAVAUX_STANDARD = 100_000_000n; // Art. 1 al. 1, Decret 2020-599
const SEUIL_AO_FOURNITURES_SERVICES_STANDARD = 70_000_000n; // Art. 1 al. 2
const SEUIL_AO_PI_CABINET_STANDARD = 50_000_000n; // Art. 1 al. 3
const SEUIL_AO_PI_INDIVIDUEL_STANDARD = 20_000_000n; // Art. 1 al. 4

// Communes sans statut particulier — Art. 2, Decret 2020-599
const SEUIL_AO_TRAVAUX_COMMUNE = 35_000_000n; // Art. 2 al. 1
const SEUIL_AO_FOURNITURES_SERVICES_COMMUNE = 25_000_000n; // Art. 2 al. 2
const SEUIL_AO_PI_CABINET_COMMUNE = 20_000_000n; // Art. 2 al. 3
const SEUIL_AO_PI_INDIVIDUEL_COMMUNE = 15_000_000n; // Art. 2 al. 4

// Seuils de sollicitation de prix — Art. 3-6, Decret 2020-599 et 2020-605
const SEUIL_DRP_MIN = 10_000_001n; // montant > 10M : DRP
const SEUIL_DRP_MAX_STANDARD = SEUIL_AO_FOURNITURES_SERVICES_STANDARD; // < seuils AO
const SEUIL_DC_MIN = 4_000_001n; // montant > 4M : DC
const SEUIL_DC_MAX = 10_000_000n; // <= 10M
const SEUIL_DISPENSE = 4_000_000n; // <= 4M : dispense, 3 pro forma minimum

// Seuils UEMOA — Art. 8, Decret 2020-599
// Etat, collectivites territoriales, etablissements publics
const SEUIL_UEMOA_TRAVAUX_EP = 1_000_000_000n; // Art. 8 al. 1
const SEUIL_UEMOA_FOURNITURES_EP = 500_000_000n; // Art. 8 al. 2
const SEUIL_UEMOA_PI_EP = 150_000_000n; // Art. 8 al. 3
// Organismes de droit public, societes nationales, SAPM
const SEUIL_UEMOA_TRAVAUX_ORGANISME = 1_500_000_000n; // Art. 8 al. 4
const SEUIL_UEMOA_FOURNITURES_ORGANISME = 750_000_000n; // Art. 8 al. 5
const SEUIL_UEMOA_PI_ORGANISME = 200_000_000n; // Art. 8 al. 6

// Seuils de controle a priori DNCMP — Manuel de Procedures p.19, Table 1
// AC standard (sauf communes sans statut et EP sans delegues)
const SEUIL_DNCMP_TRAVAUX_STANDARD = 500_000_000n;
const SEUIL_DNCMP_FOURNITURES_STANDARD = 300_000_000n;
const SEUIL_DNCMP_PI_CABINET_STANDARD = 200_000_000n;
const SEUIL_DNCMP_PI_INDIVIDUEL_STANDARD = 100_000_000n;
// Communes sans statut + EP dont CCMP ne sont pas delegues
const SEUIL_DNCMP_TRAVAUX_COMMUNE = 300_000_000n;
const SEUIL_DNCMP_FOURNITURES_COMMUNE = 150_000_000n;
const SEUIL_DNCMP_PI_CABINET_COMMUNE = 120_000_000n;
const SEUIL_DNCMP_PI_INDIVIDUEL_COMMUNE = 80_000_000n;

// Seuils DDCMP — Manuel de Procedures p.20-21, Table 2
// Communes a statut particulier
const SEUIL_DDCMP_TRAVAUX_MIN_CSP = 200_000_000n;
const SEUIL_DDCMP_TRAVAUX_MAX_CSP = 500_000_000n;
const SEUIL_DDCMP_FOURNITURES_MIN_CSP = 100_000_000n;
const SEUIL_DDCMP_FOURNITURES_MAX_CSP = 300_000_000n;
const SEUIL_DDCMP_PI_CABINET_MIN_CSP = 100_000_000n;
const SEUIL_DDCMP_PI_CABINET_MAX_CSP = 200_000_000n;
const SEUIL_DDCMP_PI_INDIVIDUEL_MIN_CSP = 60_000_000n;
const SEUIL_DDCMP_PI_INDIVIDUEL_MAX_CSP = 100_000_000n;
// Communes sans statut + EP sans delegues
const SEUIL_DDCMP_TRAVAUX_MIN_CSsP = 150_000_000n;
const SEUIL_DDCMP_TRAVAUX_MAX_CSsP = 300_000_000n;
const SEUIL_DDCMP_FOURNITURES_MIN_CSsP = 50_000_000n;
const SEUIL_DDCMP_FOURNITURES_MAX_CSsP = 150_000_000n;
const SEUIL_DDCMP_PI_CABINET_MIN_CSsP = 50_000_000n;
const SEUIL_DDCMP_PI_CABINET_MAX_CSsP = 120_000_000n;
const SEUIL_DDCMP_PI_INDIVIDUEL_MIN_CSsP = 30_000_000n;
const SEUIL_DDCMP_PI_INDIVIDUEL_MAX_CSsP = 80_000_000n;

// ---------------------------------------------------------------------------
// Schemas de validation Zod
// ---------------------------------------------------------------------------

export const SeuilsInputSchema = z.object({
  montant: z.bigint().nonnegative(),
  nature: z.nativeEnum(NatureMarche),
  typeEntite: z.nativeEnum(TypeEntite),
  hasCCMPDelegues: z.boolean().default(true),
});

export type SeuilsInput = z.infer<typeof SeuilsInputSchema>;

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/** Renvoie true si l'entite est une commune sans statut particulier */
function isCommuneSansStatut(typeEntite: TypeEntite): boolean {
  return typeEntite === TypeEntite.COMMUNE_SANS_STATUT;
}

/** Renvoie true si l'entite est un organisme de droit public / societe nationale / SAPM */
function isOrganismePublic(typeEntite: TypeEntite): boolean {
  return [TypeEntite.EP_EPIC, TypeEntite.EP_EPA].includes(typeEntite as TypeEntite.EP_EPIC | TypeEntite.EP_EPA);
}

// ---------------------------------------------------------------------------
// Seuil de passation applicable
// ---------------------------------------------------------------------------

/**
 * Retourne le seuil de passation en FCFA HT selon la nature et le type d'entite.
 * Art. 1-2, Decret 2020-599
 */
export function getSeuilPassation(
  nature: NatureMarche,
  typeEntite: TypeEntite
): bigint {
  const isCommune = isCommuneSansStatut(typeEntite);

  switch (nature) {
    case NatureMarche.TRAVAUX:
      return isCommune ? SEUIL_AO_TRAVAUX_COMMUNE : SEUIL_AO_TRAVAUX_STANDARD;
    case NatureMarche.FOURNITURES:
    case NatureMarche.SERVICES:
      return isCommune
        ? SEUIL_AO_FOURNITURES_SERVICES_COMMUNE
        : SEUIL_AO_FOURNITURES_SERVICES_STANDARD;
    case NatureMarche.PI_CABINET:
      return isCommune
        ? SEUIL_AO_PI_CABINET_COMMUNE
        : SEUIL_AO_PI_CABINET_STANDARD;
    case NatureMarche.PI_INDIVIDUEL:
      return isCommune
        ? SEUIL_AO_PI_INDIVIDUEL_COMMUNE
        : SEUIL_AO_PI_INDIVIDUEL_STANDARD;
  }
}

// ---------------------------------------------------------------------------
// Seuil UEMOA (communautaire)
// ---------------------------------------------------------------------------

/**
 * Verifie si le marche depasse les seuils communautaires UEMOA.
 * Art. 8, Decret 2020-599
 */
export function isCommunautaire(
  montant: bigint,
  nature: NatureMarche,
  typeEntite: TypeEntite
): boolean {
  const isOrganisme = isOrganismePublic(typeEntite);

  switch (nature) {
    case NatureMarche.TRAVAUX:
      return montant >= (isOrganisme ? SEUIL_UEMOA_TRAVAUX_ORGANISME : SEUIL_UEMOA_TRAVAUX_EP);
    case NatureMarche.FOURNITURES:
    case NatureMarche.SERVICES:
      return montant >= (isOrganisme ? SEUIL_UEMOA_FOURNITURES_ORGANISME : SEUIL_UEMOA_FOURNITURES_EP);
    case NatureMarche.PI_CABINET:
    case NatureMarche.PI_INDIVIDUEL:
      return montant >= (isOrganisme ? SEUIL_UEMOA_PI_ORGANISME : SEUIL_UEMOA_PI_EP);
  }
}

// ---------------------------------------------------------------------------
// Organe de controle competent
// ---------------------------------------------------------------------------

/**
 * Determine l'organe de controle a priori competent selon le montant, la nature
 * et le type d'entite.
 * Manuel de Procedures p.19-21, Tables 1 et 2
 * CCMP : tout marche >= seuil passation et < seuils DNCMP/DDCMP
 */
export function determinerOrganeControle(
  montant: bigint,
  nature: NatureMarche,
  typeEntite: TypeEntite,
  hasCCMPDelegues: boolean = true
): OrganeControle {
  const isCommuneSp = typeEntite === TypeEntite.COMMUNE_STATUT;
  const isCommuneSsp =
    typeEntite === TypeEntite.COMMUNE_SANS_STATUT ||
    (isOrganismePublic(typeEntite) && !hasCCMPDelegues);

  // Seuils DNCMP (Table 1)
  if (!isCommuneSp && !isCommuneSsp) {
    // AC standard
    if (
      (nature === NatureMarche.TRAVAUX && montant >= SEUIL_DNCMP_TRAVAUX_STANDARD) ||
      ((nature === NatureMarche.FOURNITURES || nature === NatureMarche.SERVICES) &&
        montant >= SEUIL_DNCMP_FOURNITURES_STANDARD) ||
      (nature === NatureMarche.PI_CABINET && montant >= SEUIL_DNCMP_PI_CABINET_STANDARD) ||
      (nature === NatureMarche.PI_INDIVIDUEL && montant >= SEUIL_DNCMP_PI_INDIVIDUEL_STANDARD)
    ) {
      return OrganeControle.DNCMP;
    }
  } else if (isCommuneSsp) {
    // Communes sans statut + EP sans delegues — Table 1 (seuils reduits)
    if (
      (nature === NatureMarche.TRAVAUX && montant >= SEUIL_DNCMP_TRAVAUX_COMMUNE) ||
      ((nature === NatureMarche.FOURNITURES || nature === NatureMarche.SERVICES) &&
        montant >= SEUIL_DNCMP_FOURNITURES_COMMUNE) ||
      (nature === NatureMarche.PI_CABINET && montant >= SEUIL_DNCMP_PI_CABINET_COMMUNE) ||
      (nature === NatureMarche.PI_INDIVIDUEL && montant >= SEUIL_DNCMP_PI_INDIVIDUEL_COMMUNE)
    ) {
      return OrganeControle.DNCMP;
    }
  }

  // Seuils DDCMP (Table 2)
  if (isCommuneSp) {
    if (
      (nature === NatureMarche.TRAVAUX &&
        montant >= SEUIL_DDCMP_TRAVAUX_MIN_CSP &&
        montant < SEUIL_DDCMP_TRAVAUX_MAX_CSP) ||
      ((nature === NatureMarche.FOURNITURES || nature === NatureMarche.SERVICES) &&
        montant >= SEUIL_DDCMP_FOURNITURES_MIN_CSP &&
        montant < SEUIL_DDCMP_FOURNITURES_MAX_CSP) ||
      (nature === NatureMarche.PI_CABINET &&
        montant >= SEUIL_DDCMP_PI_CABINET_MIN_CSP &&
        montant < SEUIL_DDCMP_PI_CABINET_MAX_CSP) ||
      (nature === NatureMarche.PI_INDIVIDUEL &&
        montant >= SEUIL_DDCMP_PI_INDIVIDUEL_MIN_CSP &&
        montant < SEUIL_DDCMP_PI_INDIVIDUEL_MAX_CSP)
    ) {
      return OrganeControle.DDCMP;
    }
  } else if (isCommuneSsp) {
    if (
      (nature === NatureMarche.TRAVAUX &&
        montant >= SEUIL_DDCMP_TRAVAUX_MIN_CSsP &&
        montant < SEUIL_DDCMP_TRAVAUX_MAX_CSsP) ||
      ((nature === NatureMarche.FOURNITURES || nature === NatureMarche.SERVICES) &&
        montant >= SEUIL_DDCMP_FOURNITURES_MIN_CSsP &&
        montant < SEUIL_DDCMP_FOURNITURES_MAX_CSsP) ||
      (nature === NatureMarche.PI_CABINET &&
        montant >= SEUIL_DDCMP_PI_CABINET_MIN_CSsP &&
        montant < SEUIL_DDCMP_PI_CABINET_MAX_CSsP) ||
      (nature === NatureMarche.PI_INDIVIDUEL &&
        montant >= SEUIL_DDCMP_PI_INDIVIDUEL_MIN_CSsP &&
        montant < SEUIL_DDCMP_PI_INDIVIDUEL_MAX_CSsP)
    ) {
      return OrganeControle.DDCMP;
    }
  }

  // CCMP : tout marche >= seuil de passation et < seuils DNCMP/DDCMP
  return OrganeControle.CCMP;
}

// ---------------------------------------------------------------------------
// Modes de passation valides
// ---------------------------------------------------------------------------

/**
 * Retourne les modes de passation valides selon le montant et la nature.
 * Manuel de Procedures, Partie 3
 */
export function determinerModesValides(
  montant: bigint,
  nature: NatureMarche,
  typeEntite: TypeEntite
): ModePassation[] {
  const seuilPassation = getSeuilPassation(nature, typeEntite);
  const isPrestationIntellectuelle =
    nature === NatureMarche.PI_CABINET ||
    nature === NatureMarche.PI_INDIVIDUEL;

  // Dispense — < 4M FCFA
  if (montant <= SEUIL_DISPENSE) {
    return []; // Pas de mode formel, 3 pro forma minimum
  }

  // Demande de Cotation — > 4M et <= 10M
  if (montant > SEUIL_DISPENSE && montant <= SEUIL_DC_MAX) {
    if (isPrestationIntellectuelle) return [ModePassation.SCI];
    return [ModePassation.DC];
  }

  // DRP — > 10M et < seuil de passation
  if (montant > SEUIL_DC_MAX && montant < seuilPassation) {
    if (isPrestationIntellectuelle) return [ModePassation.SFQC_QUALIFICATION, ModePassation.SCI];
    if (nature === NatureMarche.TRAVAUX) return [ModePassation.DRP_TRAVAUX];
    if (nature === NatureMarche.FOURNITURES) return [ModePassation.DRP_FOURNITURES];
    return [ModePassation.DRP_SERVICES];
  }

  // Au-dessus du seuil de passation : AOO ou PI
  if (montant >= seuilPassation) {
    if (isPrestationIntellectuelle) {
      return [
        ModePassation.SFQC,
        ModePassation.SFQ,
        ModePassation.SCBD,
        ModePassation.SMC,
        ModePassation.SCI,
        ModePassation.GRE_A_GRE, // Cas limitatifs uniquement
        ModePassation.ENTENTE_DIRECTE_PI,
      ];
    }
    return [
      ModePassation.AOO,
      ModePassation.AOO_PREQUALIFICATION,
      ModePassation.AO_DEUX_ETAPES,
      ModePassation.AO_CONCOURS,
      ModePassation.AO_RESTREINT,
      ModePassation.GRE_A_GRE, // Cas limitatifs + autorisation DNCMP
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Analyse complete des seuils
// ---------------------------------------------------------------------------

/**
 * Point d'entree principal : retourne l'analyse complete des seuils
 * pour un marche donne.
 */
export function analyserSeuils(input: SeuilsInput): SeuilApplicable {
  const { montant, nature, typeEntite, hasCCMPDelegues } = SeuilsInputSchema.parse(input);

  const seuilPassation = getSeuilPassation(nature, typeEntite);
  const organeControle = determinerOrganeControle(
    montant,
    nature,
    typeEntite,
    hasCCMPDelegues
  );
  const estCommunautaire = isCommunautaire(montant, nature, typeEntite);
  const modesValides = determinerModesValides(montant, nature, typeEntite);

  // Seuil de controle selon l'organe
  let seuilControle = 0n;
  if (organeControle === OrganeControle.DNCMP) {
    const isCommune = isCommuneSansStatut(typeEntite) || !hasCCMPDelegues;
    seuilControle = nature === NatureMarche.TRAVAUX
      ? (isCommune ? SEUIL_DNCMP_TRAVAUX_COMMUNE : SEUIL_DNCMP_TRAVAUX_STANDARD)
      : nature === NatureMarche.FOURNITURES || nature === NatureMarche.SERVICES
      ? (isCommune ? SEUIL_DNCMP_FOURNITURES_COMMUNE : SEUIL_DNCMP_FOURNITURES_STANDARD)
      : nature === NatureMarche.PI_CABINET
      ? (isCommune ? SEUIL_DNCMP_PI_CABINET_COMMUNE : SEUIL_DNCMP_PI_CABINET_STANDARD)
      : (isCommune ? SEUIL_DNCMP_PI_INDIVIDUEL_COMMUNE : SEUIL_DNCMP_PI_INDIVIDUEL_STANDARD);
  }

  return {
    seuilPassation,
    seuilControle,
    organeControle,
    isCommunautaire: estCommunautaire,
    modesValides,
    sourceJuridique: "Decret 2020-599 Art. 1-8 ; Manuel de Procedures p.19-21",
  };
}

// ---------------------------------------------------------------------------
// Verification et alertes
// ---------------------------------------------------------------------------

/**
 * Genere des alertes si le montant est proche ou depasse les seuils.
 */
export function verifierSeuils(
  montant: bigint,
  nature: NatureMarche,
  typeEntite: TypeEntite
): AlerteSeuil[] {
  const alertes: AlerteSeuil[] = [];
  const seuilPassation = getSeuilPassation(nature, typeEntite);

  // Alerte si le montant depasse le seuil de passation
  if (montant >= seuilPassation) {
    alertes.push({
      niveau: NiveauAlerte.BLOQUANT,
      message: `Le montant (${montant.toLocaleString()} FCFA HT) depasse le seuil de passation (${seuilPassation.toLocaleString()} FCFA HT). Un Appel d'Offres est obligatoire.`,
      seuilConcerne: seuilPassation,
      articleSource: "Art. 1-2, Decret 2020-599",
    });
  }

  // Alerte si le montant est a moins de 10% du seuil de passation
  const seuil90pct = (seuilPassation * 9n) / 10n;
  if (montant >= seuil90pct && montant < seuilPassation) {
    alertes.push({
      niveau: NiveauAlerte.AVERTISSEMENT,
      message: `Attention : le montant est proche du seuil de passation (${seuilPassation.toLocaleString()} FCFA HT). Risque de fractionnement.`,
      seuilConcerne: seuilPassation,
      articleSource: "Art. 24 al. 7 et Art. 26, Loi 2020-26",
    });
  }

  return alertes;
}
