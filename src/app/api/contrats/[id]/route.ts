/**
 * API Route : Contrat — Détail et mise à jour
 * Source : Art. 84-87, Loi 2020-26
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { contrats } from "@/lib/db/schema/contrats";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const UpdateContratSchema = z.object({
  numeroMarche: z.string().max(50).optional(),
  dateSignatureAttributaire: z.string().optional(),
  dateSignaturePRMP: z.string().optional(),
  dateApprobation: z.string().optional(),
  dateAuthentification: z.string().optional(),
  dateEnregistrementDGI: z.string().optional(),
  dateNotificationDefinitive: z.string().optional(),
  dateEntreeVigueur: z.string().optional(),
  dureeExecution: z.number().int().positive().optional(),
  dateFinPrevisionnelle: z.string().optional(),
  garantieLiberationDate: z.string().optional(),
  sousTraitancePct: z.number().min(0).max(40).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [result] = await db
      .select({
        id: contrats.id,
        marcheId: contrats.marcheId,
        numeroMarche: contrats.numeroMarche,
        montantTTC: contrats.montantTTC,
        montantHT: contrats.montantHT,
        tauxTVA: contrats.tauxTVA,
        dateSignatureAttributaire: contrats.dateSignatureAttributaire,
        dateSignaturePRMP: contrats.dateSignaturePRMP,
        dateApprobation: contrats.dateApprobation,
        dateAuthentification: contrats.dateAuthentification,
        dateEnregistrementDGI: contrats.dateEnregistrementDGI,
        dateNotificationDefinitive: contrats.dateNotificationDefinitive,
        dateEntreeVigueur: contrats.dateEntreeVigueur,
        dureeExecution: contrats.dureeExecution,
        dateDePrevue: contrats.dateDePrevue,
        dateFinPrevisionnelle: contrats.dateFinPrevisionnelle,
        garantieSoumissionPct: contrats.garantieSoumissionPct,
        garantieExecutionPct: contrats.garantieExecutionPct,
        garantieLiberationDate: contrats.garantieLiberationDate,
        sousTraitancePct: contrats.sousTraitancePct,
        createdAt: contrats.createdAt,
        updatedAt: contrats.updatedAt,
        marcheReference: marches.reference,
        marcheObjet: marches.objet,
        marcheNature: marches.nature,
        marcheModePassation: marches.modePassation,
        marcheStatut: marches.statut,
        marcheMontantEstime: marches.montantEstime,
        marcheAttributaireId: marches.attributaireId,
        marcheDirBeneficiaire: marches.directionBeneficiaire,
      })
      .from(contrats)
      .leftJoin(marches, eq(contrats.marcheId, marches.id))
      .where(eq(contrats.id, id));

    if (!result) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      montantTTC: Number(result.montantTTC),
      montantHT: Number(result.montantHT),
      marcheMontantEstime: result.marcheMontantEstime
        ? Number(result.marcheMontantEstime)
        : null,
    });
  } catch (error) {
    console.error("GET /api/contrats/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateContratSchema.parse(body);

    const updateData: Partial<typeof data> & {
      updatedAt?: Date;
      sousTraitancePct?: string;
    } = { ...data, updatedAt: new Date() };

    if (data.sousTraitancePct !== undefined) {
      updateData.sousTraitancePct = String(data.sousTraitancePct);
    }

    const [updated] = await db
      .update(contrats)
      .set(updateData)
      .where(eq(contrats.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ...updated,
      montantTTC: Number(updated.montantTTC),
      montantHT: Number(updated.montantHT),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("PATCH /api/contrats/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
