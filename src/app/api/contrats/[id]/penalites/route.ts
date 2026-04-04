/**
 * API Route : Pénalités de retard
 * Formule : pénalité = montantTTC × taux_journalier × jours_retard
 * Plafond : 10% du montant TTC — Art. 114, Loi 2020-26
 * Mise en demeure : 8 jours calendaires avant application — Art. 113
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc } from "@/lib/db";
import { penalites } from "@/lib/db/schema/execution";
import { contrats } from "@/lib/db/schema/contrats";
import { calculerPenalite } from "@/lib/rules/penalites";
import { z } from "zod";

const CreatePenaliteSchema = z.object({
  dateDebutRetard: z.string(),
  joursRetard: z.number().int().positive(),
  tauxJournalier: z.number().positive().max(0.1).default(1 / 2000),
  penaliteCumuleeAvant: z.number().nonnegative().default(0),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await db
      .select()
      .from(penalites)
      .where(eq(penalites.contratId, id))
      .orderBy(desc(penalites.createdAt));

    const serialized = results.map((p) => ({
      ...p,
      montantPenalite: Number(p.montantPenalite),
      montantCumule: Number(p.montantCumule),
      plafond10pct: Number(p.plafond10pct),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("GET /api/contrats/[id]/penalites error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = CreatePenaliteSchema.parse(body);

    // Fetch contract to get montantTTC
    const [contrat] = await db
      .select({ montantTTC: contrats.montantTTC })
      .from(contrats)
      .where(eq(contrats.id, id));

    if (!contrat) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // Call rules engine — Art. 113-114, Loi 2020-26
    const result = calculerPenalite({
      montantTTC: contrat.montantTTC,
      tauxJournalier: data.tauxJournalier,
      joursRetard: data.joursRetard,
      montantCumulePrecedent: BigInt(Math.round(data.penaliteCumuleeAvant)),
    });

    // Persist to DB
    const [penalite] = await db
      .insert(penalites)
      .values({
        contratId: id,
        dateDebutRetard: data.dateDebutRetard,
        joursRetard: data.joursRetard,
        tauxJournalier: String(data.tauxJournalier),
        montantPenalite: result.montantPenalite,
        montantCumule: result.montantCumule,
        plafond10pct: result.plafond10pct,
        isResiliationDeclenchee: result.declencheResiliation,
      })
      .returning();

    if (!penalite) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

    return NextResponse.json(
      {
        ...penalite,
        montantPenalite: Number(penalite.montantPenalite),
        montantCumule: Number(penalite.montantCumule),
        plafond10pct: Number(penalite.plafond10pct),
        calcul: {
          pourcentagePlafond: result.pourcentagePlafond,
          declencheResiliation: result.declencheResiliation,
          articleSource: result.articleSource,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("POST /api/contrats/[id]/penalites error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
