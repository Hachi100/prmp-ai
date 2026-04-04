/**
 * API Route : Ouverture des Plis (PV)
 * POST /api/marches/[id]/ouverture — creer le PV d'ouverture et enregistrer les offres
 * Source : Art. 75, Loi 2020-26 (seance publique obligatoire)
 *          Art. 55, Loi 2020-26 (quorum COE : 3/5 minimum)
 *          Manuel de Procedures ARMP pp.50-60
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { offres, pvOuverture } from "@/lib/db/schema/reception";
import { soumissionnaires } from "@/lib/db/schema/soumissionnaires";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const OuvertureSchema = z.object({
  dateSeance: z.string(),
  lieu: z.string().min(1),
  observations: z.string().optional(),
  membresCOE: z.array(z.object({
    nom: z.string().min(1),
    qualite: z.string().min(1),
  })).min(3, "Quorum insuffisant : 3 membres minimum requis — Art. 55, Loi 2020-26"),
  offres: z.array(z.object({
    numeroOrdre: z.number().int().positive(),
    soumissionnaire: z.string().min(1),
    montantLu: z.number().nullable(),
    hasGarantie: z.boolean(),
  })).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: marcheId } = await params;
    const body = await request.json();
    const data = OuvertureSchema.parse(body);

    // Quorum COE : 3/5 minimum — Art. 55, Loi 2020-26
    if (data.membresCOE.length < 3) {
      return NextResponse.json(
        { error: "Quorum COE insuffisant : 3 membres minimum — Art. 55, Loi 2020-26" },
        { status: 400 }
      );
    }

    // Verifier que le PV n'existe pas deja
    const existingPV = await db
      .select({ id: pvOuverture.id })
      .from(pvOuverture)
      .where(eq(pvOuverture.marcheId, marcheId))
      .limit(1);

    if (existingPV.length > 0) {
      return NextResponse.json(
        { error: "Un PV d'ouverture existe deja pour ce marche" },
        { status: 409 }
      );
    }

    // Creer les soumissionnaires si ils n'existent pas et enregistrer les offres
    const offresCreees = [];
    for (const offre of data.offres) {
      // Verifier si le soumissionnaire existe deja
      const existing = await db
        .select({ id: soumissionnaires.id })
        .from(soumissionnaires)
        .where(eq(soumissionnaires.denomination, offre.soumissionnaire))
        .limit(1);

      let soumId: string;
      if (existing.length > 0) {
        soumId = existing[0]!.id;
      } else {
        // Creer le soumissionnaire
        const [newSoum] = await db
          .insert(soumissionnaires)
          .values({
            denomination: offre.soumissionnaire,
            pays: "BEN",
          })
          .returning({ id: soumissionnaires.id });
        soumId = newSoum!.id;
      }

      // Creer l'offre
      const [newOffre] = await db
        .insert(offres)
        .values({
          marcheId,
          soumissionnaireId: soumId,
          numeroOrdre: offre.numeroOrdre,
          dateReception: new Date(data.dateSeance),
          montantLu: offre.montantLu ? BigInt(offre.montantLu) : null,
          statut: "ouvert",
        })
        .returning();

      offresCreees.push(newOffre);
    }

    // Creer le PV d'ouverture
    const [newPV] = await db
      .insert(pvOuverture)
      .values({
        marcheId,
        dateSeance: new Date(data.dateSeance),
        lieu: data.lieu,
        membresCOE: data.membresCOE,
        quorumAtteint: data.membresCOE.length >= 3,
        nombreOffresRecues: data.offres.length,
        nombreOffresOuvertes: data.offres.length,
        observations: data.observations ?? null,
      })
      .returning();

    // Passer le marche au statut evaluation
    await db
      .update(marches)
      .set({ statut: "evaluation" })
      .where(eq(marches.id, marcheId));

    return NextResponse.json({
      pv: newPV,
      offres: offresCreees,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/marches/[id]/ouverture error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
