/**
 * API Route : Ordres de Service
 * L'OS de démarrage déclenche le délai d'exécution du contrat
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc, count } from "@/lib/db";
import { ordresServices } from "@/lib/db/schema/contrats";
import { z } from "zod";

const CreateOSSchema = z.object({
  type: z.enum(["demarrage", "arret", "reprise", "cloture"]),
  dateEmission: z.string(),
  dateNotification: z.string().optional(),
  observations: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await db
      .select()
      .from(ordresServices)
      .where(eq(ordresServices.contratId, id))
      .orderBy(desc(ordresServices.dateEmission));

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET /api/contrats/[id]/os error:", error);
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
    const data = CreateOSSchema.parse(body);

    // Get next numero
    const [countResult] = await db
      .select({ n: count() })
      .from(ordresServices)
      .where(eq(ordresServices.contratId, id));

    const numero = Number(countResult?.n ?? 0) + 1;

    const [os] = await db
      .insert(ordresServices)
      .values({
        contratId: id,
        numero,
        type: data.type,
        dateEmission: data.dateEmission,
        dateNotification: data.dateNotification,
        observations: data.observations,
      })
      .returning();

    return NextResponse.json(os, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("POST /api/contrats/[id]/os error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
