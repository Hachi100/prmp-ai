/**
 * Schema : Marches Publics (entite centrale)
 * Source : Loi 2020-26 Art. 2-4 (definitions) ; Art. 54 (delais) ;
 *          Art. 79 (standstill) ; Art. 86-87 (notification et publication)
 *          Decret 2020-599 (seuils de passation)
 *
 * Presque toutes les autres tables referent cette entite centrale.
 */

import {
  bigint,
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
import { entites } from "./entites";
import { users } from "./users";
import { ppmLignes } from "./ppm";
import { soumissionnaires } from "./soumissionnaires";

export const statutProcedureEnum = pgEnum("statut_procedure", [
  "planifie",
  "preparation",
  "lance",
  "evaluation",
  "attribution_provisoire",
  "standstill",
  "recours",
  "contractualisation",
  "approuve",
  "authentifie",
  "enregistre",
  "notifie",
  "en_vigueur",
  "execution",
  "reception_provisoire",
  "reception_definitive",
  "solde",
  "suspendu",
  "annule",
]);

export const organeControleEnum = pgEnum("organe_controle", [
  "ccmp",
  "ddcmp",
  "dncmp",
]);

export const marches = pgTable("marches", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Reference unique du marche (ex: MEFP-AOO-2025-001)
   * Generee automatiquement selon la nomenclature ARMP
   */
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  objet: text("objet").notNull(),
  nature: text("nature").notNull(), // NatureMarche enum — reference a naturesMarcheEnum du schema ppm
  modePassation: text("mode_passation").notNull(), // ModePassation — reference a modePassationEnum
  entiteId: uuid("entite_id")
    .notNull()
    .references(() => entites.id),
  /** Lien vers la ligne du PPM d'origine (optionnel pour marches hors-PPM) */
  ppmLigneId: uuid("ppm_ligne_id").references(() => ppmLignes.id),
  /** Montant estimatif en FCFA HT — base pour le calcul OAB et les seuils */
  montantEstime: bigint("montant_estime", { mode: "bigint" }).notNull(),
  /** Montant contractuel (apres attribution) en FCFA HT */
  montantContractuel: bigint("montant_contractuel", { mode: "bigint" }),
  /** Devise ISO 4217 (XOF = FCFA) */
  devise: varchar("devise", { length: 3 }).notNull().default("XOF"),
  statut: statutProcedureEnum("statut").notNull().default("planifie"),
  organeControle: organeControleEnum("organe_controle").notNull(),
  /** Marche au-dessus des seuils UEMOA — Art. 8, Decret 2020-599 */
  isCommunautaire: boolean("is_communautaire").notNull().default(false),
  exercice: integer("exercice").notNull(),
  directionBeneficiaire: text("direction_beneficiaire").notNull(),
  sourceFinancement: text("source_financement").notNull(),
  /** Attributaire retenu apres evaluation */
  attributaireId: uuid("attributaire_id").references(() => soumissionnaires.id),
  // Dates cles de la procedure
  dateLancement: date("date_lancement"),
  dateAttributionProvisoire: date("date_attribution_provisoire"),
  /** Fin du standstill = dateAttributionProvisoire + 10 jours calendaires (Art. 79 al. 3) */
  dateStandstillFin: date("date_standstill_fin"),
  dateSignature: date("date_signature"),
  dateApprobation: date("date_approbation"),
  /** Art. 86 al. 2, Loi 2020-26 : notification definitive dans les 3 jours calendaires */
  dateNotificationDefinitive: date("date_notification_definitive"),
  dateEntreeVigueur: date("date_entree_vigueur"),
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

// Relations
export const marchesRelations = relations(marches, ({ one }) => ({
  entite: one(entites, { fields: [marches.entiteId], references: [entites.id] }),
  ppmLigne: one(ppmLignes, {
    fields: [marches.ppmLigneId],
    references: [ppmLignes.id],
  }),
  attributaire: one(soumissionnaires, {
    fields: [marches.attributaireId],
    references: [soumissionnaires.id],
  }),
  createdBy: one(users, {
    fields: [marches.createdBy],
    references: [users.id],
  }),
}));

export type Marche = typeof marches.$inferSelect;
export type NewMarche = typeof marches.$inferInsert;
