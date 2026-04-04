/**
 * API Route : Réceptions (provisoire et définitive)
 * Libération de la garantie de bonne exécution : 30 jours après achèvement
 * Manuel de Procédures — réception provisoire puis définitive
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc } from "@/lib/db";
import { receptions } from "@/lib/db/schema/execution";
import { z } from "zod";

const CreateReceptionSchema = z.object({
  type: z.enum(["provisoire", "definitive"]),
  dateDemande: z.string(),
  dateReception: z.string().optional(),
  reserves: z.string().optional(),
  leveeReservesDate: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await db
      .select()
      .from(receptions)
      .where(eq(receptions.contratId, id))
      .orderBy(desc(receptions.createdAt));

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET /api/contrats/[id]/receptions error:", error);
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
    const data = CreateReceptionSchema.parse(body);

    const [reception] = await db
      .insert(receptions)
      .values({
        contratId: id,
        type: data.type,
        dateDemande: data.dateDemande,
        dateReception: data.dateReception,
        reserves: data.reserves,
        leveeReservesDate: data.leveeReservesDate,
      })
      .returning();

    // Calculate garantie liberation date (30j after définitive reception)
    let garantieLiberationDate: string | null = null;
    if (data.type === "definitive" && data.dateReception) {
      const d = new Date(data.dateReception);
      d.setDate(d.getDate() + 30);
      garantieLiberationDate = d.toISOString().split("T")[0]!;
    }

    return NextResponse.json(
      { ...reception, garantieLiberationDate },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("POST /api/contrats/[id]/receptions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
