/**
 * Schema : Plan de Passation des Marches (PPM)
 * Source : Art. 24 al. 1, Loi 2020-26 ; Art. 2, Decret 2020-596
 *
 * Le PPM doit etre publie dans les 10 jours calendaires apres
 * approbation du budget (Art. 24 al. 1).
 * Rapport trimestriel PRMP : 1 mois apres la fin du trimestre
 * (Art. 2, Decret 2020-596).
 */

import {
  bigint,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entites } from "./entites";
import { users } from "./users";

export const statutPPMEnum = pgEnum("statut_ppm", [
  "draft",
  "soumis",
  "approuve",
  "publie",
]);

export const modePassationEnum = pgEnum("mode_passation", [
  "aoo",
  "aoo_prequalification",
  "ao_deux_etapes",
  "ao_concours",
  "ao_restreint",
  "gre_a_gre",
  "drp_travaux",
  "drp_fournitures",
  "drp_services",
  "dc",
  "sfqc",
  "sfq",
  "scbd",
  "smc",
  "sfqc_qualification",
  "sci",
  "entente_directe_pi",
]);

export const naturesMarcheEnum = pgEnum("nature_marche", [
  "travaux",
  "fournitures",
  "services",
  "pi_cabinet",
  "pi_individuel",
]);

export const statutLigneEnum = pgEnum("statut_ligne_ppm", [
  "planifie",
  "lance",
  "solde",
  "annule",
]);

export const ppms = pgTable("ppms", {
  id: uuid("id").primaryKey().defaultRandom(),
  entiteId: uuid("entite_id")
    .notNull()
    .references(() => entites.id),
  /** Exercice budgetaire (annee) */
  annee: integer("annee").notNull(),
  /** Date d'approbation du budget — le PPM doit etre publie sous 10 jours calendaires */
  dateApprobationBudget: date("date_approbation_budget"),
  statut: statutPPMEnum("statut").notNull().default("draft"),
  /** Montant previsionnel total en FCFA HT */
  totalPrevisionnel: bigint("total_previsionnel", { mode: "bigint" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ppmLignes = pgTable("ppm_lignes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ppmId: uuid("ppm_id")
    .notNull()
    .references(() => ppms.id, { onDelete: "cascade" }),
  /** Reference PPM (ex: PPM-2025-MEFP-001) */
  reference: text("reference").notNull(),
  objet: text("objet").notNull(),
  nature: naturesMarcheEnum("nature").notNull(),
  modePassation: modePassationEnum("mode_passation").notNull(),
  /** Montant previsionnel en FCFA HT */
  montantPrevisionnel: bigint("montant_previsionnel", { mode: "bigint" }).notNull(),
  /** Trimestre de lancement prevu (1-4) */
  trimestreLancement: integer("trimestre_lancement").notNull(),
  /** Trimestre de reception prevu (1-4) */
  trimestreReception: integer("trimestre_reception").notNull(),
  directionBeneficiaire: text("direction_beneficiaire").notNull(),
  sourceFinancement: text("source_financement").notNull(),
  statut: statutLigneEnum("statut").notNull().default("planifie"),
  /** Lie au marche cree depuis cette ligne PPM */
  marcheId: uuid("marche_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const ppmsRelations = relations(ppms, ({ one, many }) => ({
  entite: one(entites, { fields: [ppms.entiteId], references: [entites.id] }),
  createdBy: one(users, { fields: [ppms.createdBy], references: [users.id] }),
  lignes: many(ppmLignes),
}));

export const ppmLignesRelations = relations(ppmLignes, ({ one }) => ({
  ppm: one(ppms, { fields: [ppmLignes.ppmId], references: [ppms.id] }),
}));

export type PPM = typeof ppms.$inferSelect;
export type NewPPM = typeof ppms.$inferInsert;
export type PPMLigne = typeof ppmLignes.$inferSelect;
export type NewPPMLigne = typeof ppmLignes.$inferInsert;
