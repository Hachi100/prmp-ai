/**
 * API Route : Marche individuel
 * GET   /api/marches/[id] — detail du marche
 * PATCH /api/marches/[id] — mise a jour (statut, transition)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { entites } from "@/lib/db/schema/entites";
import { z } from "zod";

const UpdateMarcheSchema = z.object({
  statut: z.enum([
    "planifie", "preparation", "lance", "evaluation", "attribution_provisoire",
    "standstill", "recours", "contractualisation", "approuve", "authentifie",
    "enregistre", "notifie", "en_vigueur", "execution", "reception_provisoire",
    "reception_definitive", "solde", "suspendu", "annule",
  ]).optional(),
  montantContractuel: z.number().positive().optional(),
  dateLancement: z.string().optional(),
  dateAttributionProvisoire: z.string().optional(),
  dateSignature: z.string().optional(),
  dateApprobation: z.string().optional(),
  dateEntreeVigueur: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

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
        isCommunautaire: marches.isCommunautaire,
        exercice: marches.exercice,
        directionBeneficiaire: marches.directionBeneficiaire,
        sourceFinancement: marches.sourceFinancement,
        dateLancement: marches.dateLancement,
        dateAttributionProvisoire: marches.dateAttributionProvisoire,
        dateStandstillFin: marches.dateStandstillFin,
        dateSignature: marches.dateSignature,
        dateApprobation: marches.dateApprobation,
        dateNotificationDefinitive: marches.dateNotificationDefinitive,
        dateEntreeVigueur: marches.dateEntreeVigueur,
        createdAt: marches.createdAt,
        updatedAt: marches.updatedAt,
        entiteId: marches.entiteId,
        entiteNom: entites.nom,
        entiteCode: entites.code,
        entiteType: entites.type,
      })
      .from(marches)
      .leftJoin(entites, eq(marches.entiteId, entites.id))
      .where(eq(marches.id, id))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: "Marche non trouve" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: results[0] });
  } catch (err) {
    console.error("GET /api/marches/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la recuperation du marche" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const raw = await request.json() as unknown;
    const body = UpdateMarcheSchema.parse(raw);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.statut !== undefined) updateData["statut"] = body.statut;
    if (body.montantContractuel !== undefined) {
      updateData["montantContractuel"] = BigInt(Math.round(body.montantContractuel));
    }
    if (body.dateLancement !== undefined) updateData["dateLancement"] = body.dateLancement;
    if (body.dateAttributionProvisoire !== undefined) {
      updateData["dateAttributionProvisoire"] = body.dateAttributionProvisoire;
    }
    if (body.dateSignature !== undefined) updateData["dateSignature"] = body.dateSignature;
    if (body.dateApprobation !== undefined) updateData["dateApprobation"] = body.dateApprobation;
    if (body.dateEntreeVigueur !== undefined) updateData["dateEntreeVigueur"] = body.dateEntreeVigueur;

    const [updated] = await db
      .update(marches)
      .set(updateData)
      .where(eq(marches.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Marche non trouve" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Donnees invalides", details: err.errors },
        { status: 400 }
      );
    }
    console.error("PATCH /api/marches/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la mise a jour du marche" },
      { status: 500 }
    );
  }
}
