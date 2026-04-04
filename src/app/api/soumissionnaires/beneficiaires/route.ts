/**
 * API Route : Beneficiaires Effectifs
 * POST /api/soumissionnaires/beneficiaires — creer un beneficiaire effectif
 * Source : Circulaire 2024-002 (champ sexe OBLIGATOIRE depuis nov. 2024)
 *          Art. 123, Loi 2020-26 (sanctions fausses declarations)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { beneficiairesEffectifs } from "@/lib/db/schema/soumissionnaires";
import { z } from "zod";

const CreateBeneficiaireSchema = z.object({
  soumissionnaireId: z.string().uuid(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  /**
   * Champ sexe OBLIGATOIRE depuis Circulaire 2024-002 (novembre 2024)
   */
  sexe: z.enum(["masculin", "feminin"]),
  nationalite: z.string().length(3),
  pourcentageDetention: z.number().min(25).max(100),
  typeControle: z.enum(["actions", "votes", "conseil_administration"]).default("actions"),
  dateNaissance: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = CreateBeneficiaireSchema.parse(body);

    const today = new Date().toISOString().split("T")[0] ?? "";
    const [newBenef] = await db
      .insert(beneficiairesEffectifs)
      .values({
        soumissionnaireId: data.soumissionnaireId,
        nom: data.nom,
        prenom: data.prenom,
        sexe: data.sexe,
        nationalite: data.nationalite,
        pourcentageDetention: String(data.pourcentageDetention),
        typeControle: data.typeControle,
        dateNaissance: data.dateNaissance ?? null,
        declarationDate: today,
      })
      .returning();

    return NextResponse.json({ beneficiaire: newBenef }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/soumissionnaires/beneficiaires error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
