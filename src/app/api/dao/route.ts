/**
 * API Route : Dossiers d'Appel d'Offres (DAO)
 * GET  /api/dao — liste des DAOs avec info marche
 * POST /api/dao — creation d'un nouveau DAO
 * Source : Manuel de Procedures ARMP pp.31-42
 *          Art. 3 al. 1, Decret 2020-600 (preparation 30j avant lancement)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, desc } from "@/lib/db";
import { daos } from "@/lib/db/schema/dao";
import { marches } from "@/lib/db/schema/marches";
import { z } from "zod";

const CreateDAOSchema = z.object({
  marcheId: z.string().uuid(),
  objet: z.string().min(1).max(500),
  dateLimiteOffres: z.string(), // ISO date string
  montantCautionnement: z.number().int().positive(),
  mode: z.enum(["national", "international"]),
  checklistItems: z.array(z.object({
    pointNumero: z.number().int().min(1).max(85),
    libelle: z.string(),
    conforme: z.boolean(),
  })).optional(),
  createdBy: z.string().uuid().optional(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const daoList = await db
      .select({
        id: daos.id,
        marcheId: daos.marcheId,
        version: daos.version,
        statut: daos.statut,
        checklistScore: daos.checklistScore,
        dateBAL: daos.dateBAL,
        balNumero: daos.balNumero,
        dateCreation: daos.createdAt,
        marcheRef: marches.reference,
        marcheObjet: marches.objet,
        modePassation: marches.modePassation,
        nature: marches.nature,
        montantEstime: marches.montantEstime,
      })
      .from(daos)
      .leftJoin(marches, eq(daos.marcheId, marches.id))
      .orderBy(desc(daos.createdAt))
      .limit(50);

    // Serialize BigInt
    const serialized = daoList.map(d => ({
      ...d,
      montantEstime: d.montantEstime ? Number(d.montantEstime) : null,
    }));

    return NextResponse.json({ daos: serialized });
  } catch (error) {
    console.error("GET /api/dao error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = CreateDAOSchema.parse(body);

    // Get a default user id for now (in production, use session)
    const { db: dbClient } = await import("@/lib/db");
    const { users } = await import("@/lib/db/schema/users");
    const userList = await dbClient.select({ id: users.id }).from(users).limit(1);
    const userId = data.createdBy ?? userList[0]?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Aucun utilisateur trouve. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    // Check if a DAO already exists for this marche
    const existing = await db
      .select({ id: daos.id })
      .from(daos)
      .where(eq(daos.marcheId, data.marcheId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Un DAO existe deja pour ce marche" },
        { status: 409 }
      );
    }

    const [newDAO] = await db
      .insert(daos)
      .values({
        marcheId: data.marcheId,
        version: 1,
        statut: "brouillon",
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ dao: newDAO }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/dao error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
