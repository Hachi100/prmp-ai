/**
 * API Route : Avenants au contrat
 * Plafond cumulé : 30% du montant initial — Art. 84, Loi 2020-26
 * Retourne BLOQUANT si le plafond est dépassé
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc, count, sum } from "@/lib/db";
import { avenants, contrats } from "@/lib/db/schema/contrats";
import { verifierPlafondAvenant } from "@/lib/rules/penalites";
import { z } from "zod";

const CreateAvenantSchema = z.object({
  objet: z.string().min(1),
  montantAvenant: z.number(), // peut être négatif (diminution)
  motifJuridique: z.enum(["urgence", "travaux_imprévus", "erreur_technique", "autres"]),
  dateSignature: z.string().optional(),
  dateApprobation: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await db
      .select()
      .from(avenants)
      .where(eq(avenants.contratId, id))
      .orderBy(desc(avenants.createdAt));

    const serialized = results.map((a) => ({
      ...a,
      montantInitial: Number(a.montantInitial),
      montantAvenant: Number(a.montantAvenant),
      nouveauMontant: Number(a.nouveauMontant),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("GET /api/contrats/[id]/avenants error:", error);
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
    const data = CreateAvenantSchema.parse(body);

    // Fetch contrat
    const [contrat] = await db
      .select({ montantHT: contrats.montantHT })
      .from(contrats)
      .where(eq(contrats.id, id));

    if (!contrat) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // Sum existing avenants
    const [sumResult] = await db
      .select({ total: sum(avenants.montantAvenant) })
      .from(avenants)
      .where(eq(avenants.contratId, id));

    const montantCumulAvenants = BigInt(
      Math.round(Number(sumResult?.total ?? 0))
    );

    // Validate 30% cap — Art. 84, Loi 2020-26
    const check = verifierPlafondAvenant({
      montantInitial: contrat.montantHT,
      montantCumulAvenants,
      montantNouvelAvenant: BigInt(Math.round(Math.abs(data.montantAvenant))),
    });

    if (check.depasse) {
      return NextResponse.json(
        {
          error: "BLOQUANT: Plafond 30% dépassé (Art. 84 Loi 2020-26)",
          check: {
            pctCumule: check.pctCumule,
            montantMaxAutorise: Number(check.montantMaxAutorise),
            articleSource: check.articleSource,
          },
        },
        { status: 422 }
      );
    }

    // Get next numero
    const [countResult] = await db
      .select({ n: count() })
      .from(avenants)
      .where(eq(avenants.contratId, id));
    const numero = Number(countResult?.n ?? 0) + 1;

    const montantAvenant = BigInt(Math.round(data.montantAvenant));
    const montantInitial = contrat.montantHT;
    const nouveauMontant = montantInitial + montantAvenant + montantCumulAvenants;
    const pctCumule = check.pctCumule;

    const [avenant] = await db
      .insert(avenants)
      .values({
        contratId: id,
        numero,
        objet: data.objet,
        montantInitial,
        montantAvenant,
        nouveauMontant,
        pctCumule: String(pctCumule),
        motifJuridique: data.motifJuridique,
        dateSignature: data.dateSignature,
        dateApprobation: data.dateApprobation,
      })
      .returning();

    if (!avenant) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

    return NextResponse.json(
      {
        ...avenant,
        montantInitial: Number(avenant.montantInitial),
        montantAvenant: Number(avenant.montantAvenant),
        nouveauMontant: Number(avenant.nouveauMontant),
        check: {
          pctCumule,
          montantMaxAutorise: Number(check.montantMaxAutorise),
          articleSource: check.articleSource,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("POST /api/contrats/[id]/avenants error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
