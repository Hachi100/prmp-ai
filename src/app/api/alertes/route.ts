/**
 * API Route : Alertes système
 * Alertes générées par le moteur de règles et l'agent IA
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, desc } from "@/lib/db";
import { alertes } from "@/lib/db/schema/audit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unread = searchParams.get("unread");
    const severite = searchParams.get("severite");
    const marcheId = searchParams.get("marcheId");

    const conditions = [];
    if (unread === "true") conditions.push(eq(alertes.isRead, false));
    if (severite) {
      conditions.push(
        eq(
          alertes.severite,
          severite as "bloquant" | "avertissement" | "suggestion"
        )
      );
    }
    if (marcheId) conditions.push(eq(alertes.marcheId, marcheId));

    const results =
      conditions.length > 0
        ? await db
            .select()
            .from(alertes)
            .where(and(...conditions))
            .orderBy(desc(alertes.createdAt))
            .limit(100)
        : await db
            .select()
            .from(alertes)
            .orderBy(desc(alertes.createdAt))
            .limit(100);

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET /api/alertes error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
