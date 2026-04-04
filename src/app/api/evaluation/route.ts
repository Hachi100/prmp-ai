/**
 * API Route : Evaluations des Offres (3 phases)
 * GET  /api/evaluation — liste des evaluations pour un marche
 * POST /api/evaluation — creer/mettre a jour une evaluation
 * Source : Manuel de Procedures ARMP pp.60-75
 *          Art. 81, Loi 2020-26 (OAB)
 *          Art. 3 al. 5, Decret 2020-600 (COE : 10 jours ouvrables)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { evaluations } from "@/lib/db/schema/evaluation";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const CreateEvaluationSchema = z.object({
  marcheId: z.string().uuid(),
  evaluateurs: z.array(z.string()).min(3), // Quorum COE : 3 sur 5 minimum
  createdBy: z.string().uuid().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const marcheId = searchParams.get("marcheId");

    if (!marcheId) {
      return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
    }

    const evalList = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.marcheId, marcheId))
      .limit(1);

    return NextResponse.json({ evaluation: evalList[0] ?? null });
  } catch (error) {
    console.error("GET /api/evaluation error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = CreateEvaluationSchema.parse(body);

    // Get default user
    const { users } = await import("@/lib/db/schema/users");
    const userList = await db.select({ id: users.id }).from(users).limit(1);
    const userId = data.createdBy ?? userList[0]?.id;

    if (!userId) {
      return NextResponse.json({ error: "Utilisateur requis" }, { status: 401 });
    }

    // Verifier que le marche existe
    const [marche] = await db
      .select({ id: marches.id, statut: marches.statut })
      .from(marches)
      .where(eq(marches.id, data.marcheId))
      .limit(1);

    if (!marche) {
      return NextResponse.json({ error: "Marche introuvable" }, { status: 404 });
    }

    // Verifier si une evaluation existe deja
    const existing = await db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(eq(evaluations.marcheId, data.marcheId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Une evaluation existe deja pour ce marche" },
        { status: 409 }
      );
    }

    const [newEval] = await db
      .insert(evaluations)
      .values({
        marcheId: data.marcheId,
        phaseActuelle: "conformite",
        dateDebut: new Date(),
        evaluateurs: data.evaluateurs,
        statut: "en_cours",
        createdBy: userId,
      })
      .returning();

    // Passer le marche a statut "evaluation"
    await db
      .update(marches)
      .set({ statut: "evaluation" })
      .where(eq(marches.id, data.marcheId));

    return NextResponse.json({ evaluation: newEval }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/evaluation error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
