/**
 * Agent IA conseiller PRMP-Pro — Streaming avec tool use
 * Utilise Claude API (Sonnet) avec les 6 tool functions
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/system";
import { rechercherContexteMarche } from "./rag/retriever";
import { calculateThresholdsTool, executeCalculerSeuils } from "./tools/calculate-thresholds";
import { computeDeadlinesTool, executeCalculerDelais } from "./tools/compute-deadlines";
import { detectOABTool, executeDetecterOAB } from "./tools/detect-oab";
import { computePenaltiesTool, executeCalculerPenalites } from "./tools/compute-penalties";
import { detectFragmentationTool, executeDetecterFractionnement } from "./tools/detect-fragmentation";
import { searchJuridiqueTool, executeRechercherJuridique } from "./tools/search-juridique";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

const TOOLS = [
  calculateThresholdsTool,
  computeDeadlinesTool,
  detectOABTool,
  computePenaltiesTool,
  detectFragmentationTool,
  searchJuridiqueTool,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdvisorParams {
  message: string;
  marcheId?: string;
  module: string;
  userId?: string;
  modePassation?: string;
  statut?: string;
  nature?: string;
  montantEstime?: string;
  organeControle?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

// ---------------------------------------------------------------------------
// Execution des tools
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId?: string
): Promise<string> {
  switch (toolName) {
    case "calculer_seuils":
      return executeCalculerSeuils(toolInput as Parameters<typeof executeCalculerSeuils>[0]);
    case "calculer_delais":
      return executeCalculerDelais(toolInput as Parameters<typeof executeCalculerDelais>[0]);
    case "detecter_oab":
      return executeDetecterOAB(toolInput as Parameters<typeof executeDetecterOAB>[0]);
    case "calculer_penalites":
      return executeCalculerPenalites(toolInput as Parameters<typeof executeCalculerPenalites>[0]);
    case "detecter_fractionnement":
      return executeDetecterFractionnement(toolInput as Parameters<typeof executeDetecterFractionnement>[0]);
    case "rechercher_juridique":
      return executeRechercherJuridique({
        ...(toolInput as Parameters<typeof executeRechercherJuridique>[0]),
        userId,
      });
    default:
      return JSON.stringify({ error: `Outil inconnu : ${toolName}` });
  }
}

// ---------------------------------------------------------------------------
// Stream principal
// ---------------------------------------------------------------------------

/**
 * Cree un stream de l'agent IA conseiller.
 * Gere automatiquement les tool use loops (tool_use → tool_result → continuation).
 *
 * Retourne un ReadableStream de chunks SSE.
 */
export async function createAdvisorStream(
  params: AdvisorParams
): Promise<ReadableStream<Uint8Array>> {
  const {
    message,
    module: moduleNom,
    userId,
    modePassation,
    statut,
    nature,
    montantEstime,
    organeControle,
    conversationHistory = [],
  } = params;

  // Pre-charger le contexte juridique pertinent
  let articlesPertinents: Array<{ articleRef: string; source: string; contenu: string }> = [];
  try {
    const chunks = await rechercherContexteMarche({
      module: moduleNom,
      modePassation,
      statut,
      nature,
    });
    articlesPertinents = chunks;
  } catch {
    // Continuer sans contexte RAG si l'indexation n'est pas encore faite
  }

  // Construire le prompt systeme avec contexte
  const systemPrompt = buildSystemPrompt({
    module: moduleNom,
    statut,
    modePassation,
    nature,
    montantEstime,
    organeControle,
    articlesPertinents,
  });

  // Construire l'historique des messages
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let continueLoop = true;
        let currentMessages = [...messages];

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: systemPrompt,
            tools: TOOLS,
            messages: currentMessages,
            stream: false, // On fait le streaming manuellement pour gerer les tool loops
          });

          // Traiter les blocs de contenu
          for (const block of response.content) {
            if (block.type === "text") {
              // Envoyer le texte au client
              const chunk = JSON.stringify({ type: "text", content: block.text });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            } else if (block.type === "tool_use") {
              // Signaler l'utilisation d'un outil au client
              const toolChunk = JSON.stringify({
                type: "tool_use",
                toolName: block.name,
                toolInput: block.input,
              });
              controller.enqueue(encoder.encode(`data: ${toolChunk}\n\n`));

              // Executer le tool
              const toolResult = await executeTool(
                block.name,
                block.input as Record<string, unknown>,
                userId
              );

              // Signaler le resultat au client
              const resultChunk = JSON.stringify({
                type: "tool_result",
                toolName: block.name,
                toolResult: JSON.parse(toolResult),
              });
              controller.enqueue(encoder.encode(`data: ${resultChunk}\n\n`));

              // Ajouter le resultat du tool dans les messages pour la prochaine iteration
              currentMessages = [
                ...currentMessages,
                { role: "assistant" as const, content: response.content },
                {
                  role: "user" as const,
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: block.id,
                      content: toolResult,
                    },
                  ],
                },
              ];
            }
          }

          // Verifier si on doit continuer la boucle
          if (response.stop_reason === "end_turn") {
            continueLoop = false;
          } else if (response.stop_reason === "tool_use") {
            // Continuer pour obtenir la reponse finale apres les tools
            continueLoop = true;
          } else {
            continueLoop = false;
          }
        }

        // Signaler la fin du stream
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
        const errorChunk = JSON.stringify({ type: "error", content: errorMsg });
        controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
        controller.close();
      }
    },
  });
}
