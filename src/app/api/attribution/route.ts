/**
 * API Route : Attributions et suivi standstill
 * GET  /api/attribution — attribution pour un marche
 * POST /api/attribution — creer une attribution provisoire
 * Source : Art. 79 al. 3, Loi 2020-26 (standstill 10 jours calendaires)
 *          Art. 3 al. 6, Decret 2020-600 (notification 1j ouvrable apres avis)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { attributions } from "@/lib/db/schema/attribution";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const CreateAttributionSchema = z.object({
  marcheId: z.string().uuid(),
  offreRetenueId: z.string().uuid(),
  montantPropose: z.string(), // Montant en FCFA HT sous forme de string
  dateNotificationProvisoire: z.string(), // ISO datetime
});

function addCalendarDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0] ?? "";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const marcheId = searchParams.get("marcheId");

    if (!marcheId) {
      return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
    }

    const attrList = await db
      .select()
      .from(attributions)
      .where(eq(attributions.marcheId, marcheId))
      .limit(1);

    return NextResponse.json({ attribution: attrList[0] ?? null });
  } catch (error) {
    console.error("GET /api/attribution error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = CreateAttributionSchema.parse(body);

    // Verifier que le marche existe
    const [marche] = await db
      .select({ id: marches.id, statut: marches.statut })
      .from(marches)
      .where(eq(marches.id, data.marcheId))
      .limit(1);

    if (!marche) {
      return NextResponse.json({ error: "Marche introuvable" }, { status: 404 });
    }

    const notifDate = new Date(data.dateNotificationProvisoire);
    // Standstill : 10 jours calendaires apres notification provisoire
    // Art. 79 al. 3, Loi 2020-26
    const dateFinStandstill = addCalendarDays(notifDate, 10);

    const [newAttr] = await db
      .insert(attributions)
      .values({
        marcheId: data.marcheId,
        offreRetenueId: data.offreRetenueId,
        montantPropose: data.montantPropose,
        dateNotificationProvisoire: notifDate,
        dateFinStandstill,
        statut: "provisoire",
      })
      .returning();

    // Passer le marche a statut "attribution_provisoire"
    await db
      .update(marches)
      .set({
        statut: "attribution_provisoire",
        dateAttributionProvisoire: notifDate.toISOString().split("T")[0],
        dateStandstillFin: dateFinStandstill,
      })
      .where(eq(marches.id, data.marcheId));

    return NextResponse.json({ attribution: newAttr }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/attribution error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
