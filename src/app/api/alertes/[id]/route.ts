/**
 * API Route : Alerte — Marquer comme lue
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { alertes } from "@/lib/db/schema/audit";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [updated] = await db
      .update(alertes)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(alertes.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Alerte introuvable" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/alertes/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
