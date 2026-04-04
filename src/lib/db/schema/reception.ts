/**
 * Schema : Reception et Ouverture des Offres
 * Source : Manuel de Procedures ARMP pp.50-60 (reception, ouverture des plis)
 *          Art. 3 al. 5, Decret 2020-600 (evaluation COE : 10 jours ouvrables)
 *          Clause 31 IC DAO-types (corrections arithmetiques)
 *          Art. 75, Loi 2020-26 (seance d'ouverture publique, quorum COE)
 */

import {
  bigint,
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { marches } from "./marches";
import { soumissionnaires } from "./soumissionnaires";

export const statutOffreEnum = pgEnum("statut_offre", [
  "recu",
  "ouvert",
  "conforme",
  "non_conforme",
  "retenu",
  "rejete",
]);

/**
 * Offres recues pour un marche
 * Le numero d'ordre est attribue chronologiquement a la reception
 */
export const offres = pgTable("offres", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .references(() => marches.id, { onDelete: "cascade" }),
  soumissionnaireId: uuid("soumissionnaire_id")
    .notNull()
    .references(() => soumissionnaires.id),
  /** Ordre de reception (1er recu = 1) */
  numeroOrdre: integer("numero_ordre").notNull(),
  /** Horodatage precis de la reception */
  dateReception: timestamp("date_reception", { withTimezone: true }).notNull(),
  heureReception: time("heure_reception"),
  /**
   * Montant tel que lu a la seance d'ouverture publique
   * Avant toute correction arithmetique
   */
  montantLu: bigint("montant_lu", { mode: "bigint" }),
  /**
   * Montant apres corrections arithmetiques — Clause 31 IC DAO-types
   * PU x quantite prevaut sur le total ; lettres prevalent sur chiffres
   */
  montantCorrige: bigint("montant_corrige", { mode: "bigint" }),
  /**
   * Ecart en % entre montantLu et montantCorrige
   * Si > 10% : offre ecartee (Clause 31.3 IC DAO-types)
   */
  deltaCorrectionPct: decimal("delta_correction_pct", {
    precision: 5,
    scale: 2,
  }),
  /** Offre ecartee car la correction arithmetique depasse 10% */
  isEcarteCorrection: boolean("is_ecarte_correction").notNull().default(false),
  /** Reference de l'enveloppe technique (pour PI a 2 enveloppes) */
  enveloppeTechniqueRef: text("enveloppe_technique_ref"),
  /** Reference de l'enveloppe financiere */
  enveloppeFinanciereRef: text("enveloppe_financiere_ref"),
  statut: statutOffreEnum("statut").notNull().default("recu"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Proces-Verbal d'ouverture des plis
 * Seance publique obligatoire — Art. 75, Loi 2020-26
 * Quorum COE : 3 membres sur 5 minimum
 * Publication immediate obligatoire
 */
export const pvOuverture = pgTable("pv_ouverture", {
  id: uuid("id").primaryKey().defaultRandom(),
  marcheId: uuid("marche_id")
    .notNull()
    .unique()
    .references(() => marches.id, { onDelete: "cascade" }),
  dateSeance: timestamp("date_seance", { withTimezone: true }).notNull(),
  lieu: text("lieu").notNull(),
  /**
   * Membres de la COE presents — format JSON
   * [{nom: string, qualite: string, signatureAt: string | null}]
   * Quorum minimum : 3 membres sur 5 (Art. 75, Loi 2020-26)
   */
  membresCOE: jsonb("membres_coe").notNull(),
  quorumAtteint: boolean("quorum_atteint").notNull().default(false),
  nombreOffresRecues: integer("nombre_offres_recues").notNull(),
  nombreOffresOuvertes: integer("nombre_offres_ouvertes").notNull(),
  observations: text("observations"),
  /** Hash SHA-256 du document PV genere — immutabilite */
  hashDocument: text("hash_document"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const offresRelations = relations(offres, ({ one }) => ({
  marche: one(marches, { fields: [offres.marcheId], references: [marches.id] }),
  soumissionnaire: one(soumissionnaires, {
    fields: [offres.soumissionnaireId],
    references: [soumissionnaires.id],
  }),
}));

export const pvOuvertureRelations = relations(pvOuverture, ({ one }) => ({
  marche: one(marches, {
    fields: [pvOuverture.marcheId],
    references: [marches.id],
  }),
}));

export type Offre = typeof offres.$inferSelect;
export type NewOffre = typeof offres.$inferInsert;
export type PVOuverture = typeof pvOuverture.$inferSelect;
