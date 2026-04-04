/**
 * API Route : Publication des Avis d'Appel d'Offres (AAO)
 * GET  /api/publication — liste des AAO pour un marche
 * POST /api/publication — creer un AAO (passe le marche a statut "lance")
 * Source : Art. 54, Loi 2020-26 (delais remise offres)
 *          Art. 3 al. 4, Decret 2020-600 (publication dans 2j ouvrables apres BAL)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { avisAppelOffres } from "@/lib/db/schema/publication";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const CreateAAOSchema = z.object({
  marcheId: z.string().uuid(),
  numeroAAO: z.string().min(1).max(50),
  datePublication: z.string(),         // ISO datetime
  dateLimiteSoumission: z.string(),    // ISO datetime
  dateLimiteRetrait: z.string().optional(),
  delaiType: z.enum(["national_21j", "communautaire_30j", "pi_14j_ouvrables", "drp_15j"]),
  lieuRetrait: z.string().optional(),
  montantDossier: z.number().int().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const marcheId = searchParams.get("marcheId");

    if (!marcheId) {
      return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
    }

    const avis = await db
      .select()
      .from(avisAppelOffres)
      .where(eq(avisAppelOffres.marcheId, marcheId))
      .limit(10);

    return NextResponse.json({ avis });
  } catch (error) {
    console.error("GET /api/publication error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = CreateAAOSchema.parse(body);

    // Verifier que le marche existe
    const [marche] = await db
      .select({ id: marches.id, statut: marches.statut })
      .from(marches)
      .where(eq(marches.id, data.marcheId))
      .limit(1);

    if (!marche) {
      return NextResponse.json({ error: "Marche introuvable" }, { status: 404 });
    }

    // Creer l'AAO
    const [newAAO] = await db
      .insert(avisAppelOffres)
      .values({
        marcheId: data.marcheId,
        numeroAAO: data.numeroAAO,
        datePublication: new Date(data.datePublication),
        dateLimiteSoumission: new Date(data.dateLimiteSoumission),
        dateLimiteRetrait: data.dateLimiteRetrait ?? null,
        delaiType: data.delaiType,
        lieuRetrait: data.lieuRetrait ?? null,
        montantDossier: data.montantDossier ?? null,
        isAdditif: false,
      })
      .returning();

    // Passer le marche au statut "lance"
    // Art. 3 al. 4, Decret 2020-600
    await db
      .update(marches)
      .set({ statut: "lance", dateLancement: new Date(data.datePublication).toISOString().split("T")[0] })
      .where(eq(marches.id, data.marcheId));

    return NextResponse.json({ aao: newAAO }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/publication error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
