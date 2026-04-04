/**
 * API Route : Décomptes (factures de travaux/services)
 * Délai de paiement : 60 jours calendaires maximum — Art. 116, Loi 2020-26
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc, count } from "@/lib/db";
import { decomptes } from "@/lib/db/schema/execution";
import { z } from "zod";

const CreateDecompteSchema = z.object({
  type: z.enum(["partiel", "final", "dgd"]),
  montantHT: z.number().positive(),
  montantTTC: z.number().positive(),
  dateDepot: z.string(),
  dateValidation: z.string().optional(),
  datePaiement: z.string().optional(),
});

/** Calcule les jours restants avant dépassement du délai de 60j — Art. 116, Loi 2020-26 */
function calculerDelaiPaiementRestant(dateDepot: string): number {
  const depot = new Date(dateDepot);
  const today = new Date();
  const jourEcoules = Math.floor(
    (today.getTime() - depot.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, 60 - jourEcoules); // Art. 116, Loi 2020-26
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await db
      .select()
      .from(decomptes)
      .where(eq(decomptes.contratId, id))
      .orderBy(desc(decomptes.dateDepot));

    // Recalculate delaiPaiementRestant dynamically
    const enriched = results.map((d) => ({
      ...d,
      montantHT: Number(d.montantHT),
      montantTTC: Number(d.montantTTC),
      delaiPaiementRestant:
        d.statut !== "paye"
          ? calculerDelaiPaiementRestant(d.dateDepot)
          : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /api/contrats/[id]/decomptes error:", error);
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
    const data = CreateDecompteSchema.parse(body);

    // Get next numero
    const [countResult] = await db
      .select({ n: count() })
      .from(decomptes)
      .where(eq(decomptes.contratId, id));

    const numero = Number(countResult?.n ?? 0) + 1;

    // Auto-calculate délai paiement restant — Art. 116, Loi 2020-26
    const delaiPaiementRestant = calculerDelaiPaiementRestant(data.dateDepot);

    const [decompte] = await db
      .insert(decomptes)
      .values({
        contratId: id,
        numero,
        type: data.type,
        montantHT: BigInt(Math.round(data.montantHT)),
        montantTTC: BigInt(Math.round(data.montantTTC)),
        dateDepot: data.dateDepot,
        dateValidation: data.dateValidation,
        datePaiement: data.datePaiement,
        delaiPaiementRestant,
        statut: "soumis",
      })
      .returning();

    if (!decompte) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

    return NextResponse.json(
      {
        ...decompte,
        montantHT: Number(decompte.montantHT),
        montantTTC: Number(decompte.montantTTC),
        delaiPaiementRestant,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("POST /api/contrats/[id]/decomptes error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
