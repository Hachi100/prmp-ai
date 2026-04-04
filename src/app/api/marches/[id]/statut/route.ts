/**
 * API Route : Mise a jour du statut d'un marche
 * PATCH /api/marches/[id]/statut — changer le statut d'un marche
 * Source : Manuel de Procedures ARMP — workflow des procedures
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const STATUTS_VALIDES = [
  "planifie", "preparation", "lance", "evaluation",
  "attribution_provisoire", "standstill", "recours", "contractualisation",
  "approuve", "authentifie", "enregistre", "notifie", "en_vigueur",
  "execution", "reception_provisoire", "reception_definitive",
  "solde", "suspendu", "annule",
] as const;

const UpdateStatutSchema = z.object({
  statut: z.enum(STATUTS_VALIDES),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    const { statut } = UpdateStatutSchema.parse(body);

    const [updated] = await db
      .update(marches)
      .set({ statut, updatedAt: new Date() })
      .where(eq(marches.id, id))
      .returning({ id: marches.id, statut: marches.statut });

    if (!updated) {
      return NextResponse.json({ error: "Marche introuvable" }, { status: 404 });
    }

    return NextResponse.json({ marche: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Statut invalide", details: error.errors },
        { status: 400 }
      );
    }
    console.error("PATCH /api/marches/[id]/statut error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
