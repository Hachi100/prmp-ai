/**
 * Schema : Audit Trail Immutable et Alertes Systeme
 * Source : Art. archivage, Loi 2020-26 (10 ans minimum)
 *          Regles de codage CLAUDE.md (audit trail immutable)
 *
 * La table audit_trail est APPEND-ONLY en production.
 * Les privileges DELETE et UPDATE sont retires au niveau PostgreSQL.
 * Alimente par des triggers PostgreSQL sur toutes les tables cles.
 */

import {
  boolean,
  inet,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { marches } from "./marches";

export const actionAuditEnum = pgEnum("action_audit", [
  "insert",
  "update",
  "delete",
]);

export const typeAlerteEnum = pgEnum("type_alerte_systeme", [
  "delai_depassement",
  "fragmentation",
  "oab",
  "penalite_plafond",
  "recours_urgent",
  "ppm_retard",
  "gre_a_gre_cumul",
]);

export const severiteAlerteEnum = pgEnum("severite_alerte", [
  "bloquant",
  "avertissement",
  "suggestion",
]);

/**
 * Piste d'audit immutable
 * Chaque modification sur les tables cles est tracee ici via trigger PostgreSQL
 * Table APPEND-ONLY : pas de UPDATE ni DELETE en production
 * Archivage minimum 10 ans — Art. archivage, Loi 2020-26
 */
export const auditTrail = pgTable("audit_trail", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Nom de la table modifiee */
  tableName: varchar("table_name", { length: 100 }).notNull(),
  /** UUID de l'enregistrement modifie */
  recordId: uuid("record_id").notNull(),
  action: actionAuditEnum("action").notNull(),
  changedBy: uuid("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Anciennes valeurs (null pour INSERT) */
  oldData: jsonb("old_data"),
  /** Nouvelles valeurs (null pour DELETE) */
  newData: jsonb("new_data"),
  /** Adresse IP de la requete */
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  // Pas de updatedAt — table append-only
});

/**
 * Alertes generees par le systeme et l'agent IA
 * Les alertes de niveau BLOQUANT empechent la progression de la procedure
 */
export const alertes = pgTable("alertes", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id").references(() => marches.id),
  typeAlerte: typeAlerteEnum("type_alerte").notNull(),
  severite: severiteAlerteEnum("severite").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

// Relations
export const alertesRelations = relations(alertes, ({ one }) => ({
  marche: one(marches, {
    fields: [alertes.marcheId],
    references: [marches.id],
  }),
  user: one(users, {
    fields: [alertes.userId],
    references: [users.id],
  }),
}));

export type AuditTrailEntry = typeof auditTrail.$inferSelect;
export type Alerte = typeof alertes.$inferSelect;
export type NewAlerte = typeof alertes.$inferInsert;
