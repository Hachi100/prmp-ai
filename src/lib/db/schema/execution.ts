/**
 * Schema : Execution Financiere (Decomptes, Penalites, Receptions)
 * Source : Art. 113-114, Loi 2020-26 (penalites — mise en demeure 8j, plafond 10%)
 *          Art. 116, Loi 2020-26 (delai de paiement 60 jours calendaires)
 *          Manuel de Procedures (reception provisoire / definitive)
 */

import {
  bigint,
  boolean,
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
import { contrats } from "./contrats";

export const typeDecompteEnum = pgEnum("type_decompte", [
  "partiel",
  "final",
  "dgd", // Decompte General et Definitif
]);

export const statutDecompteEnum = pgEnum("statut_decompte", [
  "soumis",
  "valide",
  "paye",
  "rejete",
]);

export const typeReceptionEnum = pgEnum("type_reception", [
  "provisoire",
  "definitive",
]);

/**
 * Decomptes (factures de travaux/services)
 * Delai de paiement : 60 jours calendaires maximum — Art. 116, Loi 2020-26
 */
export const decomptes = pgTable("decomptes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contratId: uuid("contrat_id")
    .notNull()
    .references(() => contrats.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  type: typeDecompteEnum("type").notNull(),
  montantHT: bigint("montant_ht", { mode: "bigint" }).notNull(),
  montantTTC: bigint("montant_ttc", { mode: "bigint" }).notNull(),
  dateDepot: date("date_depot").notNull(),
  dateValidation: date("date_validation"),
  datePaiement: date("date_paiement"),
  /**
   * Jours restants avant depassement du delai de 60j
   * Calcule dynamiquement : 60 - (aujourd'hui - dateDepot)
   * Art. 116, Loi 2020-26
   */
  delaiPaiementRestant: integer("delai_paiement_restant"),
  statut: statutDecompteEnum("statut").notNull().default("soumis"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Penalites de retard
 * Formule : penalite = montantTTC x taux_journalier x jours_retard
 * Taux par defaut : 1/2000 (services, CCAP type)
 * Plafond : 10% du montant TTC — Art. 114, Loi 2020-26
 * Si penalite >= plafond : resiliation de plein droit — Art. 114
 * Mise en demeure avant penalites : 8 jours calendaires — Art. 113
 */
export const penalites = pgTable("penalites", {
  id: uuid("id").primaryKey().defaultRandom(),
  contratId: uuid("contrat_id")
    .notNull()
    .references(() => contrats.id, { onDelete: "cascade" }),
  dateDebutRetard: date("date_debut_retard").notNull(),
  joursRetard: integer("jours_retard").notNull(),
  /**
   * Taux journalier de penalite.
   * 1/2000 = 0.0005 (services, CCAP type) — Art. 114, Loi 2020-26
   * Peut varier entre 1/5000 et 1/1000 selon le CCAP
   */
  tauxJournalier: decimal("taux_journalier", { precision: 8, scale: 6 })
    .notNull()
    .default("0.000500"),
  montantPenalite: bigint("montant_penalite", { mode: "bigint" }).notNull(),
  montantCumule: bigint("montant_cumule", { mode: "bigint" }).notNull(),
  /** 10% du montant TTC du marche de base + avenants — Art. 114 */
  plafond10pct: bigint("plafond_10pct", { mode: "bigint" }).notNull(),
  /** Resiliation de plein droit si penalite cumule >= plafond */
  isResiliationDeclenchee: boolean("is_resiliation_declenchee")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Receptions des travaux / fournitures / services
 * Reception provisoire puis definitive
 * Liberation de la garantie de bonne execution : 30 jours apres achevement
 */
export const receptions = pgTable("receptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contratId: uuid("contrat_id")
    .notNull()
    .references(() => contrats.id, { onDelete: "cascade" }),
  type: typeReceptionEnum("type").notNull(),
  dateDemande: date("date_demande").notNull(),
  dateReception: date("date_reception"),
  /** Hash SHA-256 du PV de reception genere */
  pvHash: varchar("pv_hash", { length: 64 }),
  /** Reserves emises lors de la reception */
  reserves: text("reserves"),
  /** Date de levee des reserves */
  leveeReservesDate: date("levee_reserves_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const decomptesRelations = relations(decomptes, ({ one }) => ({
  contrat: one(contrats, {
    fields: [decomptes.contratId],
    references: [contrats.id],
  }),
}));

export const penalitesRelations = relations(penalites, ({ one }) => ({
  contrat: one(contrats, {
    fields: [penalites.contratId],
    references: [contrats.id],
  }),
}));

export const receptionsRelations = relations(receptions, ({ one }) => ({
  contrat: one(contrats, {
    fields: [receptions.contratId],
    references: [contrats.id],
  }),
}));

export type Decompte = typeof decomptes.$inferSelect;
export type NewDecompte = typeof decomptes.$inferInsert;
export type Penalite = typeof penalites.$inferSelect;
export type NewPenalite = typeof penalites.$inferInsert;
export type Reception = typeof receptions.$inferSelect;
