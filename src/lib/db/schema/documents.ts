/**
 * Schema : Documents (stockage centralise MinIO)
 * Source : Art. archivage, Loi 2020-26 (10 ans minimum)
 *          Regles de codage CLAUDE.md (hash SHA-256 obligatoire)
 *
 * Table append-only : pas de updatedAt, pas de DELETE autorise
 * en production. Immutabilite garantie par le hash SHA-256.
 */

import {
  bigint,
  boolean,
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
import { entites } from "./entites";
import { users } from "./users";

export const typeDocumentEnum = pgEnum("type_document", [
  "dao",
  "aao",
  "pv_ouverture",
  "rapport_evaluation",
  "marche",
  "ordre_service",
  "decompte",
  "avenant",
  "pv_reception",
  "rapport_trimestriel",
  "rapport_special_gre",
  "beneficiaires_effectifs",
]);

/**
 * Documents generes et archives
 * - Les fichiers sont stockes dans MinIO (S3-compatible)
 * - Le hash SHA-256 garantit l'integrite et l'immutabilite
 * - is_locked = true pour les parties fixes des DAO-types
 * - Pas de updated_at : les documents sont immuables
 */
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id").references(() => marches.id),
  entiteId: uuid("entite_id").references(() => entites.id),
  typeDocument: typeDocumentEnum("type_document").notNull(),
  nomFichier: text("nom_fichier").notNull(),
  minioBacket: varchar("minio_bucket", { length: 100 }).notNull(),
  minioKey: text("minio_key").notNull().unique(),
  tailleOctets: bigint("taille_octets", { mode: "bigint" }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  /**
   * Hash SHA-256 du fichier — garantit l'integrite
   * Pour les parties fixes des DAO-types : toute modification invalide le hash
   * Regles de codage, CLAUDE.md
   */
  hashSHA256: varchar("hash_sha256", { length: 64 }).notNull(),
  /**
   * Documents verrouilles : parties fixes des DAO-types (IC, CCAG)
   * Aucune modification autorisee apres verrouillage
   */
  isLocked: boolean("is_locked").notNull().default(false),
  version: integer("version").notNull().default(1),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Pas de updatedAt — documents immuables (archivage 10 ans)
});

// Relations
export const documentsRelations = relations(documents, ({ one }) => ({
  marche: one(marches, {
    fields: [documents.marcheId],
    references: [marches.id],
  }),
  entite: one(entites, {
    fields: [documents.entiteId],
    references: [entites.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
