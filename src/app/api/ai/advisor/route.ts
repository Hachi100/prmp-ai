/**
 * API Route : Agent IA conseiller (streaming SSE)
 * POST /api/ai/advisor
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdvisorStream } from "@/lib/ai/advisor";
import type { AdvisorRequest } from "@/types/api";
import { z } from "zod";

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  marcheId: z.string().uuid().optional(),
  module: z.string().default("dashboard"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  // Validation de l'entree
  let body: AdvisorRequest;
  try {
    const raw = await request.json() as unknown;
    body = RequestSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { success: false, error: "Requete invalide" },
      { status: 400 }
    );
  }

  // Creer le stream de l'agent IA
  try {
    const stream = await createAdvisorStream({
      message: body.message,
      marcheId: body.marcheId,
      module: body.module,
      conversationHistory: body.conversationHistory,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("Erreur agent IA:", err);
    return NextResponse.json(
      { success: false, error: "Erreur interne de l'agent IA" },
      { status: 500 }
    );
  }
}
