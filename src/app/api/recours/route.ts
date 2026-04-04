/**
 * API Route : Recours des soumissionnaires
 * GET  /api/recours — liste des recours pour un marche
 * POST /api/recours — deposer un recours
 * Source : Art. 116-117, Loi 2020-26 (recours AC et ARMP)
 *          Circulaire 2023-002 (recours DRP/DC : 2 jours ouvrables)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { recours } from "@/lib/db/schema/attribution";
import { z } from "zod";

const CreateRecoursSchema = z.object({
  marcheId: z.string().uuid(),
  soumissionnaireId: z.string().uuid(),
  type: z.enum(["ac", "armp"]),
  motif: z.string().min(1),
  dateRecours: z.string(), // ISO datetime
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const marcheId = searchParams.get("marcheId");

    if (!marcheId) {
      return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
    }

    const recoursList = await db
      .select()
      .from(recours)
      .where(eq(recours.marcheId, marcheId));

    return NextResponse.json({ recours: recoursList });
  } catch (error) {
    console.error("GET /api/recours error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = CreateRecoursSchema.parse(body);

    const [newRecours] = await db
      .insert(recours)
      .values({
        marcheId: data.marcheId,
        soumissionnaireId: data.soumissionnaireId,
        typeRecours: data.type,
        motifs: data.motif,
        dateDepot: new Date(data.dateRecours).toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0] ?? "",
        statut: "depose",
      })
      .returning();

    // Passer le marche a statut "recours"
    const { marches } = await import("@/lib/db/schema/marches");
    await db
      .update(marches)
      .set({ statut: "recours" })
      .where(eq(marches.id, data.marcheId));

    return NextResponse.json({ recours: newRecours }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/recours error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
