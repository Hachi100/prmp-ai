/**
 * Schema : Autorites Contractantes (Entites)
 * Source : Decret 2020-599 Art. 1-8 ; Art. 4 al. 5, Loi 2020-26
 *
 * Determine les seuils de passation et l'organe de controle competent
 * selon le type d'entite et la presence de delegues CCMP.
 */

import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const typeEntiteEnum = pgEnum("type_entite", [
  "ministere",
  "ep_epic",
  "ep_epa",
  "commune_statut",
  "commune_sans_statut",
  "prefecture",
  "autre",
]);

export const entites = pgTable("entites", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Code court unique de l'entite (ex: MEFP, MCVT) */
  code: varchar("code", { length: 10 }).notNull().unique(),
  nom: text("nom").notNull(),
  type: typeEntiteEnum("type").notNull(),
  region: text("region").notNull(),
  /** Commune applicable pour les types commune_statut / commune_sans_statut */
  commune: text("commune"),
  /**
   * Indique si les membres du CCMP sont delegues par l'ARMP.
   * Impacte les seuils de controle DNCMP vs DDCMP.
   * Manuel de Procedures p.19-21, Table 1 & 2
   */
  hasCCMPDelegues: boolean("has_ccmp_delegues").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Entite = typeof entites.$inferSelect;
export type NewEntite = typeof entites.$inferInsert;
