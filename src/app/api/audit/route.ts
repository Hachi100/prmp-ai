/**
 * API Route : Piste d'audit — Consultation avec filtres et pagination
 * Table append-only — archivage 10 ans minimum
 * Art. archivage, Loi 2020-26
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, gte, lte, desc, count } from "@/lib/db";
import { auditTrail } from "@/lib/db/schema/audit";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("table");
    const action = searchParams.get("action");
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (tableName) conditions.push(eq(auditTrail.tableName, tableName));
    if (action)
      conditions.push(
        eq(auditTrail.action, action as "insert" | "update" | "delete")
      );
    if (dateFrom)
      conditions.push(gte(auditTrail.changedAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(auditTrail.changedAt, new Date(dateTo)));

    const [entries, [totalResult]] = await Promise.all([
      conditions.length > 0
        ? db
            .select()
            .from(auditTrail)
            .where(and(...conditions))
            .orderBy(desc(auditTrail.changedAt))
            .limit(limit)
            .offset(offset)
        : db
            .select()
            .from(auditTrail)
            .orderBy(desc(auditTrail.changedAt))
            .limit(limit)
            .offset(offset),

      conditions.length > 0
        ? db
            .select({ total: count() })
            .from(auditTrail)
            .where(and(...conditions))
        : db.select({ total: count() }).from(auditTrail),
    ]);

    const total = Number(totalResult?.total ?? 0);
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      entries,
      pagination: { page, limit, total, pages },
    });
  } catch (error) {
    console.error("GET /api/audit error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
