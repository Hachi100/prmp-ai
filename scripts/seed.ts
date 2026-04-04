/**
 * Script de seed — Donnees de test PRMP-Pro
 * Cree 3 entites test + 1 PRMP par entite + marches de test
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/db/schema";
import { crypto } from "node:crypto";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const db = drizzle(pool, { schema });

async function hashPassword(password: string): Promise<string> {
  // En production, utiliser bcrypt via better-auth
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function main() {
  console.log("🌱 Seed PRMP-Pro...");

  // 1. Entites
  const [entiteMinistere] = await db
    .insert(schema.entites)
    .values({
      code: "MEFP",
      nom: "Ministere de l'Economie et des Finances du Plan",
      type: "ministere",
      region: "Littoral",
      commune: "Cotonou",
      hasCCMPDelegues: true,
    })
    .returning();

  const [entiteCommuneStatut] = await db
    .insert(schema.entites)
    .values({
      code: "MCOT",
      nom: "Mairie de Cotonou",
      type: "commune_statut",
      region: "Littoral",
      commune: "Cotonou",
      hasCCMPDelegues: true,
    })
    .returning();

  const [entiteEPIC] = await db
    .insert(schema.entites)
    .values({
      code: "SBEE",
      nom: "Societe Beninoise d'Energie Electrique",
      type: "ep_epic",
      region: "Littoral",
      hasCCMPDelegues: false, // CCMP sans delegues → seuils DNCMP reduits
    })
    .returning();

  console.log("✅ 3 entites creees");

  if (!entiteMinistere || !entiteCommuneStatut || !entiteEPIC) {
    throw new Error("Erreur lors de la creation des entites");
  }

  // 2. Utilisateurs PRMP
  const hashedPw = await hashPassword("prmp2025!");

  const [userMEFP] = await db
    .insert(schema.users)
    .values({
      email: "prmp@mefp.gouv.bj",
      name: "PRMP MEFP",
      role: "prmp",
      entiteId: entiteMinistere.id,
      hashedPassword: hashedPw,
    })
    .returning();

  const [userMairie] = await db
    .insert(schema.users)
    .values({
      email: "prmp@mairie-cotonou.bj",
      name: "PRMP Mairie Cotonou",
      role: "prmp",
      entiteId: entiteCommuneStatut.id,
      hashedPassword: hashedPw,
    })
    .returning();

  await db.insert(schema.users).values({
    email: "prmp@sbee.bj",
    name: "PRMP SBEE",
    role: "prmp",
    entiteId: entiteEPIC.id,
    hashedPassword: hashedPw,
  });

  console.log("✅ 3 utilisateurs PRMP crees (mot de passe : prmp2025!)");

  if (!userMEFP || !userMairie) {
    throw new Error("Erreur lors de la creation des utilisateurs");
  }

  // 3. PPM pour le MEFP
  const [ppmMEFP] = await db
    .insert(schema.ppms)
    .values({
      entiteId: entiteMinistere.id,
      annee: 2025,
      dateApprobationBudget: "2025-01-15",
      statut: "approuve",
      totalPrevisionnel: 2_500_000_000n,
      createdBy: userMEFP.id,
    })
    .returning();

  if (!ppmMEFP) throw new Error("Erreur PPM");

  const [lignePPM1] = await db
    .insert(schema.ppmLignes)
    .values({
      ppmId: ppmMEFP.id,
      reference: "PPM-2025-MEFP-001",
      objet: "Construction du batiment administratif de la DGTCP",
      nature: "travaux",
      modePassation: "aoo",
      montantPrevisionnel: 800_000_000n,
      trimestreLancement: 1,
      trimestreReception: 4,
      directionBeneficiaire: "DGTCP",
      sourceFinancement: "Budget National",
    })
    .returning();

  await db.insert(schema.ppmLignes).values({
    ppmId: ppmMEFP.id,
    reference: "PPM-2025-MEFP-002",
    objet: "Acquisition de materiel informatique",
    nature: "fournitures",
    modePassation: "aoo",
    montantPrevisionnel: 120_000_000n,
    trimestreLancement: 2,
    trimestreReception: 3,
    directionBeneficiaire: "DSI",
    sourceFinancement: "Budget National",
  });

  console.log("✅ PPM 2025 MEFP cree avec 2 lignes");

  if (!lignePPM1) throw new Error("Erreur ligne PPM");

  // 4. Un marche en cours (statut: evaluation)
  const [marche1] = await db
    .insert(schema.marches)
    .values({
      reference: "MEFP-AOO-2025-001",
      objet: "Construction du batiment administratif de la DGTCP",
      nature: "travaux",
      modePassation: "aoo",
      entiteId: entiteMinistere.id,
      ppmLigneId: lignePPM1.id,
      montantEstime: 800_000_000n,
      devise: "XOF",
      statut: "evaluation",
      organeControle: "dncmp",
      isCommunautaire: false,
      exercice: 2025,
      directionBeneficiaire: "DGTCP",
      sourceFinancement: "Budget National",
      dateLancement: "2025-02-15",
      createdBy: userMEFP.id,
    })
    .returning();

  if (!marche1) throw new Error("Erreur marche 1");

  // 5. Soumissionnaire de test
  const [soumissionnaire1] = await db
    .insert(schema.soumissionnaires)
    .values({
      rccm: "RB/COT/2020/B/1234",
      ifu: "3202012345678",
      denomination: "ECOTRA SARL",
      adresse: "08 BP 1234 Cotonou",
      email: "contact@ecotra.bj",
      telephone: "+22997123456",
      pays: "BEN",
    })
    .returning();

  if (!soumissionnaire1) throw new Error("Erreur soumissionnaire");

  // 6. Beneficiaire effectif (avec champ sexe — Circulaire 2024-002)
  await db.insert(schema.beneficiairesEffectifs).values({
    soumissionnaireId: soumissionnaire1.id,
    nom: "AMOUSSOU",
    prenom: "Kofi",
    sexe: "masculin", // Obligatoire — Circulaire 2024-002
    nationalite: "BEN",
    dateNaissance: "1975-06-15",
    pourcentageDetention: "65.00",
    typeControle: "actions",
    declarationDate: "2025-01-10",
  });

  console.log("✅ 1 soumissionnaire + 1 beneficiaire effectif crees");
  console.log("✅ 1 marche en cours d'evaluation cree (ref: MEFP-AOO-2025-001)");

  await pool.end();
  console.log("\n🚀 Seed termine avec succes !");
  console.log("\nComptes de test :");
  console.log("  prmp@mefp.gouv.bj / prmp2025!");
  console.log("  prmp@mairie-cotonou.bj / prmp2025!");
  console.log("  prmp@sbee.bj / prmp2025!");
}

main().catch((err) => {
  console.error("❌ Erreur de seed :", err);
  process.exit(1);
});
