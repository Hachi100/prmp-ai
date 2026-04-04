/**
 * API Route : Marches publics
 * GET  /api/marches — liste avec filtres
 * POST /api/marches — creation d'un nouveau marche
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, desc, sql } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { entites } from "@/lib/db/schema/entites";
import { z } from "zod";

const CreateMarcheSchema = z.object({
  reference: z.string().min(1).max(50),
  objet: z.string().min(1),
  nature: z.enum(["travaux", "fournitures", "services", "pi_cabinet", "pi_individuel"]),
  modePassation: z.enum([
    "aoo", "aoo_prequalification", "ao_deux_etapes", "ao_concours", "ao_restreint",
    "gre_a_gre", "drp_travaux", "drp_fournitures", "drp_services", "dc",
    "sfqc", "sfq", "scbd", "smc", "sfqc_qualification", "sci", "entente_directe_pi",
  ]),
  entiteId: z.string().uuid(),
  montantEstime: z.number().positive(),
  organeControle: z.enum(["ccmp", "ddcmp", "dncmp"]),
  exercice: z.number().int().min(2020).max(2100),
  directionBeneficiaire: z.string().min(1),
  sourceFinancement: z.string().min(1),
  createdBy: z.string().uuid(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const statut = searchParams.get("statut");
    const nature = searchParams.get("nature");
    const search = searchParams.get("search");

    const conditions = [];
    if (statut) {
      conditions.push(sql`${marches.statut} = ${statut}`);
    }
    if (nature) {
      conditions.push(sql`${marches.nature} = ${nature}`);
    }
    if (search) {
      conditions.push(
        sql`(${marches.reference} ILIKE ${"%" + search + "%"} OR ${marches.objet} ILIKE ${"%" + search + "%"})`
      );
    }

    const results = await db
      .select({
        id: marches.id,
        reference: marches.reference,
        objet: marches.objet,
        nature: marches.nature,
        modePassation: marches.modePassation,
        montantEstime: marches.montantEstime,
        montantContractuel: marches.montantContractuel,
        statut: marches.statut,
        organeControle: marches.organeControle,
        exercice: marches.exercice,
        directionBeneficiaire: marches.directionBeneficiaire,
        dateLancement: marches.dateLancement,
        dateAttributionProvisoire: marches.dateAttributionProvisoire,
        dateEntreeVigueur: marches.dateEntreeVigueur,
        createdAt: marches.createdAt,
        entiteNom: entites.nom,
        entiteCode: entites.code,
      })
      .from(marches)
      .leftJoin(entites, eq(marches.entiteId, entites.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(marches.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("GET /api/marches error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la recuperation des marches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const raw = await request.json() as unknown;
    const body = CreateMarcheSchema.parse(raw);

    const [newMarche] = await db
      .insert(marches)
      .values({
        reference: body.reference,
        objet: body.objet,
        nature: body.nature,
        modePassation: body.modePassation,
        entiteId: body.entiteId,
        montantEstime: BigInt(Math.round(body.montantEstime)),
        organeControle: body.organeControle,
        exercice: body.exercice,
        directionBeneficiaire: body.directionBeneficiaire,
        sourceFinancement: body.sourceFinancement,
        statut: "planifie",
        createdBy: body.createdBy,
      })
      .returning();

    return NextResponse.json({ success: true, data: newMarche }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Donnees invalides", details: err.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/marches error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la creation du marche" },
      { status: 500 }
    );
  }
}
