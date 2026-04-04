/**
 * Schema : Soumissionnaires et Beneficiaires Effectifs
 * Source : Art. 123, Loi 2020-26 (sanctions fausses declarations)
 *          Circulaire ARMP 2024-002 (champ sexe obligatoire depuis nov. 2024)
 *
 * Le beneficiaire effectif est toute personne physique detenant directement
 * ou indirectement >= 25% des actions, >= 25% des droits de vote, ou le
 * pouvoir de nommer la majorite des membres du conseil d'administration.
 */

import {
  boolean,
  date,
  decimal,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const sexeBeneficiaireEnum = pgEnum("sexe_beneficiaire", [
  "masculin",
  "feminin",
]);

export const typeControleBeneficiaireEnum = pgEnum(
  "type_controle_beneficiaire",
  ["actions", "votes", "conseil_administration"]
);

export const soumissionnaires = pgTable("soumissionnaires", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Registre du Commerce et du Credit Mobilier */
  rccm: varchar("rccm", { length: 50 }).unique(),
  /** Identifiant Fiscal Unique */
  ifu: varchar("ifu", { length: 20 }).unique(),
  denomination: text("denomination").notNull(),
  adresse: text("adresse"),
  email: varchar("email", { length: 255 }),
  telephone: varchar("telephone", { length: 20 }),
  /** Code ISO 3166-1 alpha-3 du pays */
  pays: varchar("pays", { length: 3 }).notNull().default("BEN"),
  /**
   * Liste noire ARMP.
   * Interdiction de soumissionner — Art. 123, Loi 2020-26
   */
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  blacklistMotif: text("blacklist_motif"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Beneficiaires effectifs — Circulaire 2024-002
 * Obligatoire pour tout contrat depuis novembre 2024.
 * Seuil de detention : 25% des actions OU 25% des droits de vote
 * OU pouvoir de nommer la majorite du CA.
 */
export const beneficiairesEffectifs = pgTable("beneficiaires_effectifs", {
  id: uuid("id").primaryKey().defaultRandom(),
  soumissionnaireId: uuid("soumissionnaire_id")
    .notNull()
    .references(() => soumissionnaires.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  /**
   * Champ sexe OBLIGATOIRE depuis Circulaire 2024-002 (novembre 2024)
   */
  sexe: sexeBeneficiaireEnum("sexe").notNull(),
  nationalite: varchar("nationalite", { length: 3 }).notNull(),
  dateNaissance: date("date_naissance"),
  /** Pourcentage de detention (seuil 25%) */
  pourcentageDetention: decimal("pourcentage_detention", {
    precision: 5,
    scale: 2,
  }).notNull(),
  typeControle: typeControleBeneficiaireEnum("type_controle").notNull(),
  declarationDate: date("declaration_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const soumissionnairesRelations = relations(
  soumissionnaires,
  ({ many }) => ({
    beneficiairesEffectifs: many(beneficiairesEffectifs),
  })
);

export const beneficiairesEffectifsRelations = relations(
  beneficiairesEffectifs,
  ({ one }) => ({
    soumissionnaire: one(soumissionnaires, {
      fields: [beneficiairesEffectifs.soumissionnaireId],
      references: [soumissionnaires.id],
    }),
  })
);

export type Soumissionnaire = typeof soumissionnaires.$inferSelect;
export type NewSoumissionnaire = typeof soumissionnaires.$inferInsert;
export type BeneficiaireEffectif = typeof beneficiairesEffectifs.$inferSelect;
export type NewBeneficiaireEffectif =
  typeof beneficiairesEffectifs.$inferInsert;
