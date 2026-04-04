/**
 * Schema : Evaluation des Offres (3 phases)
 * Source : Manuel de Procedures ARMP pp.60-75 (evaluation)
 *          Art. 81, Loi 2020-26 (offres anormalement basses)
 *          Fiches memo ARMP (formule OAB)
 *          Art. 3 al. 5, Decret 2020-600 : COE evalue en 10 jours ouvrables
 *
 * Les 3 phases : conformite administrative → technique → financiere
 * OAB : M = 0.80 x (0.6 x Fm + 0.4 x Fc)
 */

import {
  bigint,
  decimal,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { marches } from "./marches";
import { offres } from "./reception";
import { users } from "./users";

export const phaseEvaluationEnum = pgEnum("phase_evaluation", [
  "conformite",
  "technique",
  "financiere",
]);

export const statutEvaluationEnum = pgEnum("statut_evaluation", [
  "en_cours",
  "soumis_controle",
  "approuve",
]);

export const typeCritereEnum = pgEnum("type_critere_evaluation", [
  "eliminatoire",
  "note",
  "binaire",
]);

export const decisionOABEnum = pgEnum("decision_oab", [
  "maintenu",
  "rejete",
  "en_attente",
]);

/**
 * Evaluation globale pour un marche
 * Creee a l'ouverture des plis, conclue avec le rapport d'evaluation
 */
export const evaluations = pgTable("evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .unique()
    .references(() => marches.id, { onDelete: "cascade" }),
  phaseActuelle: phaseEvaluationEnum("phase_actuelle")
    .notNull()
    .default("conformite"),
  dateDebut: timestamp("date_debut", { withTimezone: true }).notNull(),
  dateFin: timestamp("date_fin", { withTimezone: true }),
  /** Noms des evaluateurs de la COE — JSON array de strings */
  evaluateurs: jsonb("evaluateurs").notNull().default([]),
  statut: statutEvaluationEnum("statut").notNull().default("en_cours"),
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

/**
 * Criteres d'evaluation par phase
 * La phase conformite a des criteres eliminatoires (oui/non)
 * La phase technique a des criteres notes avec poids
 */
export const criteresEvaluation = pgTable("criteres_evaluation", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluationId: uuid("evaluation_id")
    .notNull()
    .references(() => evaluations.id, { onDelete: "cascade" }),
  phase: phaseEvaluationEnum("phase").notNull(),
  libelle: text("libelle").notNull(),
  /** Poids en % pour les criteres de la phase technique */
  poids: decimal("poids", { precision: 5, scale: 2 }),
  type: typeCritereEnum("type").notNull(),
  ordre: decimal("ordre", { precision: 4, scale: 0 }).notNull(),
});

/**
 * Notes par offre et par critere
 * Trace toutes les decisions d'evaluation
 */
export const notesOffre = pgTable("notes_offre", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluationId: uuid("evaluation_id")
    .notNull()
    .references(() => evaluations.id, { onDelete: "cascade" }),
  offreId: uuid("offre_id")
    .notNull()
    .references(() => offres.id, { onDelete: "cascade" }),
  critereId: uuid("critere_id")
    .notNull()
    .references(() => criteresEvaluation.id, { onDelete: "cascade" }),
  /** Note numerique (pour criteres de type "note") */
  valeur: decimal("valeur", { precision: 6, scale: 2 }),
  /** Resultat binaire (pour criteres eliminatoires) */
  conforme: decimal("conforme", { precision: 1, scale: 0 }),
  commentaire: text("commentaire"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Resultats du calcul OAB — Art. 81, Loi 2020-26
 * Formule : M = 0.80 x (0.6 x Fm + 0.4 x Fc)
 * Fm = moyenne des offres corrigees ; Fc = estimation AC
 * Obligation de demander des justifications avant rejet
 */
export const resultatsOAB = pgTable("resultats_oab", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluationId: uuid("evaluation_id")
    .notNull()
    .unique()
    .references(() => evaluations.id, { onDelete: "cascade" }),
  /** Seuil M calcule en FCFA */
  seuilM: bigint("seuil_m", { mode: "bigint" }).notNull(),
  /** Fm : moyenne arithmetique des offres corrigees */
  fm: bigint("fm", { mode: "bigint" }).notNull(),
  /** Fc : estimation previsionnelle de l'AC */
  fc: bigint("fc", { mode: "bigint" }).notNull(),
  /** IDs des offres presumees OAB + montants — JSON array */
  offresOAB: jsonb("offres_oab").notNull().default([]),
  /** Justifications ecrites recues des soumissionnaires OAB */
  justificationsRecues: jsonb("justifications_recues"),
  decision: decisionOABEnum("decision").notNull().default("en_attente"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  marche: one(marches, {
    fields: [evaluations.marcheId],
    references: [marches.id],
  }),
  createdBy: one(users, {
    fields: [evaluations.createdBy],
    references: [users.id],
  }),
  criteres: many(criteresEvaluation),
  resultatsOAB: many(resultatsOAB),
}));

export const criteresEvaluationRelations = relations(
  criteresEvaluation,
  ({ one, many }) => ({
    evaluation: one(evaluations, {
      fields: [criteresEvaluation.evaluationId],
      references: [evaluations.id],
    }),
    notes: many(notesOffre),
  })
);

export const notesOffreRelations = relations(notesOffre, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [notesOffre.evaluationId],
    references: [evaluations.id],
  }),
  offre: one(offres, { fields: [notesOffre.offreId], references: [offres.id] }),
  critere: one(criteresEvaluation, {
    fields: [notesOffre.critereId],
    references: [criteresEvaluation.id],
  }),
}));

export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;
export type CritereEvaluation = typeof criteresEvaluation.$inferSelect;
export type NoteOffre = typeof notesOffre.$inferSelect;
export type ResultatOAB = typeof resultatsOAB.$inferSelect;
