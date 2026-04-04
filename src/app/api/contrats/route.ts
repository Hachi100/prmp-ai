/**
 * API Route : Contrats — Liste et création
 * Source : Art. 84-87, Loi 2020-26 ; Art. 6-7, Decret 2020-600
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc } from "@/lib/db";
import { contrats } from "@/lib/db/schema/contrats";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const CreateContratSchema = z.object({
  marcheId: z.string().uuid(),
  numeroMarche: z.string().max(50).optional(),
  montantTTC: z.number().positive(),
  montantHT: z.number().positive(),
  tauxTVA: z.number().min(0).max(100).default(18),
  dateSignatureAttributaire: z.string().optional(),
  dateSignaturePRMP: z.string().optional(),
  dateApprobation: z.string().optional(),
  dateEntreeVigueur: z.string().optional(),
  dureeExecution: z.number().int().positive().optional(),
  dateFinPrevisionnelle: z.string().optional(),
  garantieExecutionPct: z.number().min(0).max(5).default(5),
});

export async function GET() {
  try {
    const results = await db
      .select({
        id: contrats.id,
        marcheId: contrats.marcheId,
        numeroMarche: contrats.numeroMarche,
        montantTTC: contrats.montantTTC,
        montantHT: contrats.montantHT,
        dateEntreeVigueur: contrats.dateEntreeVigueur,
        dateFinPrevisionnelle: contrats.dateFinPrevisionnelle,
        dureeExecution: contrats.dureeExecution,
        garantieExecutionPct: contrats.garantieExecutionPct,
        garantieLiberationDate: contrats.garantieLiberationDate,
        createdAt: contrats.createdAt,
        // Marché joint
        marcheReference: marches.reference,
        marcheObjet: marches.objet,
        marcheNature: marches.nature,
        marcheStatut: marches.statut,
        marcheAttributaireId: marches.attributaireId,
      })
      .from(contrats)
      .leftJoin(marches, eq(contrats.marcheId, marches.id))
      .orderBy(desc(contrats.createdAt));

    // Convert BigInt for JSON serialization
    const serialized = results.map((r) => ({
      ...r,
      montantTTC: Number(r.montantTTC),
      montantHT: Number(r.montantHT),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("GET /api/contrats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateContratSchema.parse(body);

    const [contrat] = await db
      .insert(contrats)
      .values({
        marcheId: data.marcheId,
        numeroMarche: data.numeroMarche,
        montantTTC: BigInt(Math.round(data.montantTTC)),
        montantHT: BigInt(Math.round(data.montantHT)),
        tauxTVA: String(data.tauxTVA),
        dateSignatureAttributaire: data.dateSignatureAttributaire,
        dateSignaturePRMP: data.dateSignaturePRMP,
        dateApprobation: data.dateApprobation,
        dateEntreeVigueur: data.dateEntreeVigueur,
        dureeExecution: data.dureeExecution,
        dateFinPrevisionnelle: data.dateFinPrevisionnelle,
        garantieExecutionPct: String(data.garantieExecutionPct),
      })
      .returning();

    if (!contrat) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

    return NextResponse.json(
      {
        ...contrat,
        montantTTC: Number(contrat.montantTTC),
        montantHT: Number(contrat.montantHT),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("POST /api/contrats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
