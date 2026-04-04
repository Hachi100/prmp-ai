/**
 * Schema : Attribution et Recours
 * Source : Art. 79 al. 3, Loi 2020-26 (standstill 10 jours calendaires)
 *          Art. 116-117, Loi 2020-26 (recours AC et ARMP)
 *          Circulaire 2023-002 (recours DRP/DC : 2 jours ouvrables)
 *          Art. 3 al. 6-7, Decret 2020-600 (delais notification)
 */

import {
  date,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { marches } from "./marches";
import { offres } from "./reception";
import { soumissionnaires } from "./soumissionnaires";

export const statutAttributionEnum = pgEnum("statut_attribution", [
  "provisoire",
  "standstill",
  "definitive",
  "annulee",
]);

export const typeRecoursEnum = pgEnum("type_recours", [
  "ac",   // Recours devant l'Autorite Contractante — Art. 116
  "armp", // Recours devant l'ARMP — Art. 117
]);

export const statutRecoursEnum = pgEnum("statut_recours", [
  "depose",
  "en_cours",
  "accepte",
  "rejete",
]);

/**
 * Attribution provisoire et suivi du standstill
 * Standstill : 10 jours calendaires minimum — Art. 79 al. 3, Loi 2020-26
 * Notification provisoire : 1 jour ouvrable apres avis de l'organe de controle
 * Art. 3 al. 6, Decret 2020-600
 */
export const attributions = pgTable("attributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .unique()
    .references(() => marches.id, { onDelete: "cascade" }),
  offreRetenueId: uuid("offre_retenue_id")
    .notNull()
    .references(() => offres.id),
  /** Montant de l'offre retenue en FCFA HT */
  montantPropose: text("montant_propose").notNull(),
  dateNotificationProvisoire: timestamp("date_notification_provisoire", {
    withTimezone: true,
  }).notNull(),
  /**
   * Fin du standstill = dateNotificationProvisoire + 10 jours calendaires
   * Art. 79 al. 3, Loi 2020-26
   */
  dateFinStandstill: date("date_fin_standstill").notNull(),
  statut: statutAttributionEnum("statut").notNull().default("provisoire"),
  /** Hash SHA-256 du rapport d'evaluation — immutabilite */
  rapportEvaluationHash: varchar("rapport_evaluation_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Recours des soumissionnaires
 * Recours AC : 5 jours ouvrables apres publication attribution provisoire
 * Reponse AC : 3 jours ouvrables — Art. 116, Loi 2020-26
 * Recours ARMP : 2 jours ouvrables apres decision AC
 * Decision ARMP : 7 jours ouvrables — Art. 117, Loi 2020-26
 * Pour DRP/DC : 2 jours ouvrables — Circulaire 2023-002
 */
export const recours = pgTable("recours", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .references(() => marches.id, { onDelete: "cascade" }),
  soumissionnaireId: uuid("soumissionnaire_id")
    .notNull()
    .references(() => soumissionnaires.id),
  typeRecours: typeRecoursEnum("type_recours").notNull(),
  dateDepot: date("date_depot").notNull(),
  motifs: text("motifs").notNull(),
  statut: statutRecoursEnum("statut").notNull().default("depose"),
  dateReponse: date("date_reponse"),
  decision: text("decision"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const attributionsRelations = relations(attributions, ({ one, many }) => ({
  marche: one(marches, {
    fields: [attributions.marcheId],
    references: [marches.id],
  }),
  offreRetenue: one(offres, {
    fields: [attributions.offreRetenueId],
    references: [offres.id],
  }),
  recours: many(recours),
}));

export const recoursRelations = relations(recours, ({ one }) => ({
  marche: one(marches, {
    fields: [recours.marcheId],
    references: [marches.id],
  }),
  soumissionnaire: one(soumissionnaires, {
    fields: [recours.soumissionnaireId],
    references: [soumissionnaires.id],
  }),
}));

export type Attribution = typeof attributions.$inferSelect;
export type NewAttribution = typeof attributions.$inferInsert;
export type Recours = typeof recours.$inferSelect;
export type NewRecours = typeof recours.$inferInsert;
