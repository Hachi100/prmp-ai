/**
 * Schema : Dossiers d'Appel d'Offres (DAO)
 * Source : Manuel de Procedures ARMP pp.31-42 (preparation DAO)
 *          Decret 2020-602 (DAO-types ARMP)
 *          Art. 3 al. 1, Decret 2020-600 (delai 30j avant lancement)
 *
 * Les parties fixes (IC, CCAG) sont VERROUILLEES par hash SHA-256.
 * Aucune modification autorisee apres verrouillage.
 * La checklist ARMP comporte 85 points de conformite.
 */

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { marches } from "./marches";
import { users } from "./users";

export const statutDAOEnum = pgEnum("statut_dao", [
  "brouillon",
  "soumis_controle",
  "observations_recues",
  "bal_obtenu",
  "publie",
]);

export const daos = pgTable("daos", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .unique()
    .references(() => marches.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  statut: statutDAOEnum("statut").notNull().default("brouillon"),
  /**
   * Hash SHA-256 de la section IC (Instructions aux Candidats) fixe.
   * Toute modification invalide le hash et est BLOQUEE.
   * Decret 2020-602, Clauses IC DAO-types ARMP
   */
  hashIC: varchar("hash_ic", { length: 64 }),
  /**
   * Hash SHA-256 du CCAG (Cahier des Clauses Administratives Generales) fixe.
   */
  hashCCAG: varchar("hash_ccag", { length: 64 }),
  dateTransmissionControle: timestamp("date_transmission_controle", {
    withTimezone: true,
  }),
  dateBAL: timestamp("date_bal", { withTimezone: true }),
  /** Numero du Bon a Lancer delivre par l'organe de controle */
  balNumero: varchar("bal_numero", { length: 50 }),
  /** Observations de l'organe de controle (format libre) */
  observationsControle: text("observations_controle"),
  /** Score sur 85 points de la checklist ARMP */
  checklistScore: integer("checklist_score"),
  /** Donnees detaillees de la checklist (85 points) en JSON */
  checklistData: jsonb("checklist_data"),
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
 * Points individuels de la checklist ARMP (85 points)
 * Manuel de Procedures ARMP — Check-lists
 */
export const daoChecklistItems = pgTable("dao_checklist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  daoId: uuid("dao_id")
    .notNull()
    .references(() => daos.id, { onDelete: "cascade" }),
  /** Numero du point (1 a 85) */
  pointNumero: integer("point_numero").notNull(),
  libelle: text("libelle").notNull(),
  /** null = non verifie, true = conforme, false = non conforme */
  conforme: boolean("conforme"),
  commentaire: text("commentaire"),
});

// Relations
export const daosRelations = relations(daos, ({ one, many }) => ({
  marche: one(marches, { fields: [daos.marcheId], references: [marches.id] }),
  createdBy: one(users, { fields: [daos.createdBy], references: [users.id] }),
  checklistItems: many(daoChecklistItems),
}));

export const daoChecklistItemsRelations = relations(
  daoChecklistItems,
  ({ one }) => ({
    dao: one(daos, { fields: [daoChecklistItems.daoId], references: [daos.id] }),
  })
);

export type DAO = typeof daos.$inferSelect;
export type NewDAO = typeof daos.$inferInsert;
export type DAOChecklistItem = typeof daoChecklistItems.$inferSelect;
