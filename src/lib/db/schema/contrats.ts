/**
 * Schema : Contrats, Ordres de Service et Avenants
 * Source : Art. 84, Loi 2020-26 (avenants — plafond 30%)
 *          Art. 86 al. 2, Loi 2020-26 (notification definitive 3j calendaires)
 *          Art. 87, Loi 2020-26 (publication attribution definitive 15j)
 *          Art. 101, Loi 2020-26 (sous-traitance — plafond 40%)
 *          Art. 7, Decret 2020-600 (3 exemplaires du projet de contrat)
 */

import {
  bigint,
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { marches } from "./marches";

export const typeOrdreServiceEnum = pgEnum("type_ordre_service", [
  "demarrage",
  "arret",
  "reprise",
  "cloture",
]);

/**
 * Contrat signe et approuve
 * Entree en vigueur apres notification definitive
 */
export const contrats = pgTable("contrats", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .unique()
    .references(() => marches.id, { onDelete: "cascade" }),
  /**
   * Numero officiel du marche apres authentification DNCMP
   * Format selon nomenclature ARMP
   */
  numeroMarche: varchar("numero_marche", { length: 50 }).unique(),
  /** Montant TTC en FCFA (montantHT + TVA) */
  montantTTC: bigint("montant_ttc", { mode: "bigint" }).notNull(),
  /** Taux TVA applicable (18% standard au Benin) */
  tauxTVA: decimal("taux_tva", { precision: 5, scale: 2 })
    .notNull()
    .default("18.00"),
  montantHT: bigint("montant_ht", { mode: "bigint" }).notNull(),
  // Chronologie de signature et approbation
  dateSignatureAttributaire: date("date_signature_attributaire"),
  dateSignaturePRMP: date("date_signature_prmp"),
  /** Approbation par l'autorite approbatrice (5 jours ouvrables — Art. 6, Decret 2020-600) */
  dateApprobation: date("date_approbation"),
  /** Authentification et numerotation par DNCMP (3 jours ouvrables — Art. 4, Decret 2020-600) */
  dateAuthentification: date("date_authentification"),
  /** Enregistrement DGI + redevance ARMP */
  dateEnregistrementDGI: date("date_enregistrement_dgi"),
  /** Notification definitive : dans 3 jours calendaires apres approbation (Art. 86 al. 2) */
  dateNotificationDefinitive: date("date_notification_definitive"),
  dateEntreeVigueur: date("date_entree_vigueur"),
  /** Duree d'execution en jours calendaires */
  dureeExecution: integer("duree_execution"),
  dateDePrevue: date("date_debut_previsionnelle"),
  dateFinPrevisionnelle: date("date_fin_previsionnelle"),
  /**
   * Garantie de soumission : 1% a 3% du montant estime
   * Manuel de Procedures p.xxx
   */
  garantieSoumissionPct: decimal("garantie_soumission_pct", {
    precision: 5,
    scale: 2,
  }),
  /**
   * Garantie de bonne execution : maximum 5% du montant du marche
   * Liberation : 30 jours apres achevement
   */
  garantieExecutionPct: decimal("garantie_execution_pct", {
    precision: 5,
    scale: 2,
  }).default("5.00"),
  garantieLiberationDate: date("garantie_liberation_date"),
  /**
   * Pourcentage de sous-traitance — plafond 40% (Art. 101, Loi 2020-26)
   */
  sousTraitancePct: decimal("sous_traitance_pct", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Ordres de Service
 * L'OS de demarrage declenche le delai d'execution
 */
export const ordresServices = pgTable("ordres_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  contratId: uuid("contrat_id")
    .notNull()
    .references(() => contrats.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  type: typeOrdreServiceEnum("type").notNull(),
  dateEmission: date("date_emission").notNull(),
  dateNotification: date("date_notification"),
  observations: text("observations"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Avenants au contrat
 * Plafond cumule : 30% du montant initial — Art. 84, Loi 2020-26
 * Chaque avenant doit avoir un motif juridique valide
 */
export const avenants = pgTable("avenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  contratId: uuid("contrat_id")
    .notNull()
    .references(() => contrats.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  objet: text("objet").notNull(),
  /** Montant du contrat avant cet avenant */
  montantInitial: bigint("montant_initial", { mode: "bigint" }).notNull(),
  montantAvenant: bigint("montant_avenant", { mode: "bigint" }).notNull(),
  /** Nouveau montant total apres avenant */
  nouveauMontant: bigint("nouveau_montant", { mode: "bigint" }).notNull(),
  /**
   * Pourcentage cumule de tous les avenants par rapport au montant initial.
   * BLOQUANT si > 30% — Art. 84, Loi 2020-26
   */
  pctCumule: decimal("pct_cumule", { precision: 6, scale: 2 }).notNull(),
  dateSignature: date("date_signature"),
  dateApprobation: date("date_approbation"),
  /** Motif juridique obligatoire (cas limitatifs) */
  motifJuridique: text("motif_juridique").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const contratsRelations = relations(contrats, ({ one, many }) => ({
  marche: one(marches, {
    fields: [contrats.marcheId],
    references: [marches.id],
  }),
  ordresServices: many(ordresServices),
  avenants: many(avenants),
}));

export const ordresServicesRelations = relations(ordresServices, ({ one }) => ({
  contrat: one(contrats, {
    fields: [ordresServices.contratId],
    references: [contrats.id],
  }),
}));

export const avenantsRelations = relations(avenants, ({ one }) => ({
  contrat: one(contrats, {
    fields: [avenants.contratId],
    references: [contrats.id],
  }),
}));

export type Contrat = typeof contrats.$inferSelect;
export type NewContrat = typeof contrats.$inferInsert;
export type OrdreService = typeof ordresServices.$inferSelect;
export type Avenant = typeof avenants.$inferSelect;
export type NewAvenant = typeof avenants.$inferInsert;
