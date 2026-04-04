/**
 * Schema : Publication des Avis d'Appel d'Offres et Eclaircissements
 * Source : Art. 54 al. 1, Loi 2020-26 (delais de remise des offres)
 *          Art. 3 al. 4, Decret 2020-600 (publication dans 2 jours apres BAL)
 *          Manuel de Procedures pp.42-50 (publication AAO, retrait DAO)
 *          Clauses 7/8 IC DAO-types (eclaircissements)
 */

import {
  boolean,
  date,
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
import { soumissionnaires } from "./soumissionnaires";

export const delaiTypeEnum = pgEnum("delai_type_ao", [
  "national_21j",       // Art. 54, Loi 2020-26 — AO national
  "communautaire_30j",  // Art. 54, Loi 2020-26 — AO UEMOA
  "pi_14j_ouvrables",   // Manuel p.131 — PI Demande de Propositions
  "drp_15j",            // Manuel p.97 — DRP
]);

export const modeRetraitEnum = pgEnum("mode_retrait_dao", [
  "physique",
  "electronique",
]);

/**
 * Avis d'Appel d'Offres (AAO)
 * Publie dans les 2 jours ouvrables apres reception du BAL
 * Art. 3 al. 4, Decret 2020-600
 */
export const avisAppelOffres = pgTable("avis_appel_offres", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .references(() => marches.id, { onDelete: "cascade" }),
  /** Numero unique de l'AAO (ex: AAO-MEFP-2025-001) */
  numeroAAO: varchar("numero_aao", { length: 50 }).notNull().unique(),
  datePublication: timestamp("date_publication", { withTimezone: true }).notNull(),
  dateLimiteRetrait: date("date_limite_retrait"),
  dateLimiteSoumission: timestamp("date_limite_soumission", {
    withTimezone: true,
  }).notNull(),
  /**
   * Type de delai applicable selon la nature et le montant du marche.
   * Art. 54 al. 1, Loi 2020-26 : 21j calendaires (national) / 30j (UEMOA)
   * Manuel p.131 : 14j ouvrables pour PI
   * Manuel p.97 : 15j calendaires pour DRP
   */
  delaiType: delaiTypeEnum("delai_type").notNull(),
  lieuRetrait: text("lieu_retrait"),
  /** Montant du dossier de consultation en FCFA */
  montantDossier: integer("montant_dossier"),
  /** Additif a un AAO precedent */
  isAdditif: boolean("is_additif").notNull().default(false),
  /** Pour les additifs, reference a l'AAO parent */
  aaoParentId: uuid("aao_parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Eclaircissements — Clauses 7/8 IC DAO-types
 * Demande dans les 10j (national) ou 15j (international) apres publication
 * Reponse de la PRMP : 3 jours ouvrables apres reception
 */
export const clarifications = pgTable("clarifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .references(() => marches.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  /** Nom de l'entite ou soumissionnaire demandeur */
  demandeur: text("demandeur").notNull(),
  dateDemande: date("date_demande").notNull(),
  question: text("question").notNull(),
  reponse: text("reponse"),
  dateReponse: date("date_reponse"),
  /** Si public, la reponse est partagee avec tous les candidats */
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Registre de retrait des DAO — Manuel de Procedures p.47
 * Horodatage obligatoire de chaque retrait
 */
export const registreRetrait = pgTable("registre_retrait", {
  id: uuid("id").primaryKey().defaultRandom(),
  aaoId: uuid("aao_id")
    .notNull()
    .references(() => avisAppelOffres.id, { onDelete: "cascade" }),
  soumissionnaireId: uuid("soumissionnaire_id").references(
    () => soumissionnaires.id
  ),
  nomRepresentant: text("nom_representant").notNull(),
  dateRetrait: timestamp("date_retrait", { withTimezone: true }).notNull(),
  modeRetrait: modeRetraitEnum("mode_retrait").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const avisAppelOffresRelations = relations(
  avisAppelOffres,
  ({ one, many }) => ({
    marche: one(marches, {
      fields: [avisAppelOffres.marcheId],
      references: [marches.id],
    }),
    retraits: many(registreRetrait),
  })
);

export const clarificationsRelations = relations(clarifications, ({ one }) => ({
  marche: one(marches, {
    fields: [clarifications.marcheId],
    references: [marches.id],
  }),
}));

export const registreRetraitRelations = relations(registreRetrait, ({ one }) => ({
  aao: one(avisAppelOffres, {
    fields: [registreRetrait.aaoId],
    references: [avisAppelOffres.id],
  }),
  soumissionnaire: one(soumissionnaires, {
    fields: [registreRetrait.soumissionnaireId],
    references: [soumissionnaires.id],
  }),
}));

export type AvisAppelOffres = typeof avisAppelOffres.$inferSelect;
export type NewAvisAppelOffres = typeof avisAppelOffres.$inferInsert;
export type Clarification = typeof clarifications.$inferSelect;
export type RegistreRetrait = typeof registreRetrait.$inferSelect;
