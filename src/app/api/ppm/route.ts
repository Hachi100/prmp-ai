/**
 * API Route : Plan de Passation des Marches (PPM)
 * GET  /api/ppm — liste des lignes PPM
 * POST /api/ppm — creation d'une ligne PPM
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc, sql } from "@/lib/db";
import { ppms, ppmLignes } from "@/lib/db/schema/ppm";
import { entites } from "@/lib/db/schema/entites";
import { z } from "zod";

const CreatePPMLigneSchema = z.object({
  ppmId: z.string().uuid().optional(),
  entiteId: z.string().uuid(),
  annee: z.number().int().min(2020).max(2100),
  reference: z.string().min(1),
  objet: z.string().min(1),
  nature: z.enum(["travaux", "fournitures", "services", "pi_cabinet", "pi_individuel"]),
  modePassation: z.enum([
    "aoo", "aoo_prequalification", "ao_deux_etapes", "ao_concours", "ao_restreint",
    "gre_a_gre", "drp_travaux", "drp_fournitures", "drp_services", "dc",
    "sfqc", "sfq", "scbd", "smc", "sfqc_qualification", "sci", "entente_directe_pi",
  ]),
  montantPrevisionnel: z.number().positive(),
  trimestreLancement: z.number().int().min(1).max(4),
  trimestreReception: z.number().int().min(1).max(4),
  directionBeneficiaire: z.string().min(1),
  sourceFinancement: z.string().min(1),
  notes: z.string().optional(),
  createdBy: z.string().uuid(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const anneeParam = searchParams.get("annee");
    const annee = anneeParam ? parseInt(anneeParam, 10) : new Date().getFullYear();
    const nature = searchParams.get("nature");

    const conditions = [sql`${ppms.annee} = ${annee}`];
    if (nature) {
      conditions.push(sql`${ppmLignes.nature} = ${nature}`);
    }

    const results = await db
      .select({
        id: ppmLignes.id,
        ppmId: ppmLignes.ppmId,
        reference: ppmLignes.reference,
        objet: ppmLignes.objet,
        nature: ppmLignes.nature,
        modePassation: ppmLignes.modePassation,
        montantPrevisionnel: ppmLignes.montantPrevisionnel,
        trimestreLancement: ppmLignes.trimestreLancement,
        trimestreReception: ppmLignes.trimestreReception,
        directionBeneficiaire: ppmLignes.directionBeneficiaire,
        sourceFinancement: ppmLignes.sourceFinancement,
        statut: ppmLignes.statut,
        marcheId: ppmLignes.marcheId,
        notes: ppmLignes.notes,
        createdAt: ppmLignes.createdAt,
        annee: ppms.annee,
        entiteNom: entites.nom,
        entiteCode: entites.code,
      })
      .from(ppmLignes)
      .innerJoin(ppms, eq(ppmLignes.ppmId, ppms.id))
      .leftJoin(entites, eq(ppms.entiteId, entites.id))
      .where(sql`${ppms.annee} = ${annee}${nature ? sql` AND ${ppmLignes.nature} = ${nature}` : sql``}`)
      .orderBy(desc(ppmLignes.createdAt))
      .limit(200);

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("GET /api/ppm error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la recuperation du PPM" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const raw = await request.json() as unknown;
    const body = CreatePPMLigneSchema.parse(raw);

    // Get or create PPM for the year
    let ppmId = body.ppmId;
    if (!ppmId) {
      const existingPpm = await db
        .select({ id: ppms.id })
        .from(ppms)
        .where(sql`${ppms.entiteId} = ${body.entiteId} AND ${ppms.annee} = ${body.annee}`)
        .limit(1);

      if (existingPpm.length > 0 && existingPpm[0]) {
        ppmId = existingPpm[0].id;
      } else {
        const [newPpm] = await db
          .insert(ppms)
          .values({
            entiteId: body.entiteId,
            annee: body.annee,
            statut: "draft",
            createdBy: body.createdBy,
          })
          .returning({ id: ppms.id });
        if (!newPpm) throw new Error("Erreur creation PPM");
        ppmId = newPpm.id;
      }
    }

    const [newLigne] = await db
      .insert(ppmLignes)
      .values({
        ppmId,
        reference: body.reference,
        objet: body.objet,
        nature: body.nature,
        modePassation: body.modePassation,
        montantPrevisionnel: BigInt(Math.round(body.montantPrevisionnel)),
        trimestreLancement: body.trimestreLancement,
        trimestreReception: body.trimestreReception,
        directionBeneficiaire: body.directionBeneficiaire,
        sourceFinancement: body.sourceFinancement,
        notes: body.notes,
        statut: "planifie",
      })
      .returning();

    return NextResponse.json({ success: true, data: newLigne }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Donnees invalides", details: err.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/ppm error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la creation de la ligne PPM" },
      { status: 500 }
    );
  }
}
