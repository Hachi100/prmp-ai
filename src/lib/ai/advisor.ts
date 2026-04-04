/**
 * Agent IA conseiller PRMP-Pro — Streaming avec tool use
 * Utilise DeepSeek API (deepseek-chat) via le SDK OpenAI-compatible
 */

import OpenAI from "openai";
import { buildSystemPrompt } from "./prompts/system";
import { rechercherContexteMarche } from "./rag/retriever";
import { executeCalculerSeuils } from "./tools/calculate-thresholds";
import { executeCalculerDelais } from "./tools/compute-deadlines";
import { executeDetecterOAB } from "./tools/detect-oab";
import { executeCalculerPenalites } from "./tools/compute-penalties";
import { executeDetecterFractionnement } from "./tools/detect-fragmentation";
import { executeRechercherJuridique } from "./tools/search-juridique";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const client = new OpenAI({
  apiKey: process.env["DEEPSEEK_API_KEY"],
  baseURL: process.env["DEEPSEEK_BASE_URL"] ?? "https://api.deepseek.com/v1",
});

const MODEL = process.env["DEEPSEEK_MODEL"] ?? "deepseek-chat";

// ---------------------------------------------------------------------------
// Definitions des tools au format OpenAI function calling
// ---------------------------------------------------------------------------

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculer_seuils",
      description:
        "Calcule les seuils de passation applicables et determine l'organe de controle competent pour un marche selon son montant, sa nature et le type d'autorite contractante. Source : Decret 2020-599 Art. 1-8.",
      parameters: {
        type: "object",
        properties: {
          montant: {
            type: "number",
            description: "Montant estimatif du marche en FCFA HT",
          },
          nature: {
            type: "string",
            enum: ["travaux", "fournitures", "services", "pi_cabinet", "pi_individuel"],
            description: "Nature du marche",
          },
          typeEntite: {
            type: "string",
            enum: ["ministere", "ep_epic", "ep_epa", "commune_statut", "commune_sans_statut", "prefecture", "autre"],
            description: "Type de l'autorite contractante",
          },
          hasCCMPDelegues: {
            type: "boolean",
            description: "Les membres du CCMP sont-ils delegues par l'ARMP ?",
          },
        },
        required: ["montant", "nature", "typeEntite"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculer_delais",
      description:
        "Calcule les delais legaux d'une procedure de passation a partir d'une date de reference. Retourne toutes les echeances avec leur source juridique. Source : Decret 2020-600 Art. 3-8 ; Loi 2020-26 Art. 54.",
      parameters: {
        type: "object",
        properties: {
          dateReference: {
            type: "string",
            description: "Date de reference au format ISO 8601 (ex: 2025-03-15)",
          },
          mode: {
            type: "string",
            enum: ["aoo", "aoo_prequalification", "ao_deux_etapes", "ao_concours", "ao_restreint", "gre_a_gre", "drp_travaux", "drp_fournitures", "drp_services", "dc", "sfqc", "sfq", "scbd", "smc", "sfqc_qualification", "sci", "entente_directe_pi"],
            description: "Mode de passation",
          },
          organeControle: {
            type: "string",
            enum: ["ccmp", "ddcmp", "dncmp"],
            description: "Organe de controle competent",
          },
          isCommunautaire: {
            type: "boolean",
            description: "Le marche est-il au-dessus des seuils UEMOA ?",
          },
        },
        required: ["dateReference", "mode", "organeControle"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detecter_oab",
      description:
        "Detecte les offres anormalement basses (OAB) selon la formule legale : M = 0,80 x (0,6 x Fm + 0,4 x Fc). Toute offre inferieure a M est presumee OAB. Art. 81, Loi 2020-26.",
      parameters: {
        type: "object",
        properties: {
          offres: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                soumissionnaireNom: { type: "string" },
                montantCorrige: { type: "number", description: "Montant corrige en FCFA HT" },
              },
              required: ["id", "soumissionnaireNom", "montantCorrige"],
            },
            description: "Liste des offres avec leurs montants corriges",
          },
          estimationAC: {
            type: "number",
            description: "Estimation previsionnelle de l'AC pour ce lot en FCFA HT",
          },
        },
        required: ["offres", "estimationAC"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculer_penalites",
      description:
        "Calcule les penalites de retard et verifie le plafond de 10%. Formule : penalite = montantTTC x taux_journalier x jours_retard. Art. 113-114, Loi 2020-26.",
      parameters: {
        type: "object",
        properties: {
          montantTTC: {
            type: "number",
            description: "Montant TTC du contrat en FCFA",
          },
          joursRetard: {
            type: "number",
            description: "Nombre de jours de retard",
          },
          tauxJournalier: {
            type: "number",
            description: "Taux journalier (defaut 1/2000 = 0.0005 pour services). Peut varier entre 1/5000 et 1/1000 selon le CCAP.",
          },
          montantCumulePrecedent: {
            type: "number",
            description: "Montant cumule des penalites deja appliquees (default 0)",
          },
        },
        required: ["montantTTC", "joursRetard"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detecter_fractionnement",
      description:
        "Detecte si un nouveau marche constitue un fractionnement illegal en cumulant les marches de meme nature pour la meme entite et le meme exercice. Art. 24 al. 7 et Art. 26, Loi 2020-26. Sanctions Art. 126 : 5-10 ans de prison et 50-500M FCFA d'amende.",
      parameters: {
        type: "object",
        properties: {
          entiteId: {
            type: "string",
            description: "ID de l'autorite contractante",
          },
          typeEntite: {
            type: "string",
            enum: ["ministere", "ep_epic", "ep_epa", "commune_statut", "commune_sans_statut", "prefecture", "autre"],
          },
          nature: {
            type: "string",
            enum: ["travaux", "fournitures", "services", "pi_cabinet", "pi_individuel"],
          },
          montantNouveauMarche: {
            type: "number",
            description: "Montant du nouveau marche en FCFA HT",
          },
          directionBeneficiaire: {
            type: "string",
            description: "Direction ou service beneficiaire du marche",
          },
          exercice: {
            type: "number",
            description: "Annee budgetaire",
          },
          marchesExistants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                montant: { type: "number" },
                directionBeneficiaire: { type: "string" },
                nature: { type: "string" },
              },
              required: ["id", "montant", "directionBeneficiaire", "nature"],
            },
            description: "Liste des marches deja passes pour cette entite et cet exercice",
          },
        },
        required: ["entiteId", "typeEntite", "nature", "montantNouveauMarche", "directionBeneficiaire", "exercice", "marchesExistants"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rechercher_juridique",
      description:
        "Effectue une recherche semantique dans la base juridique complete (Loi 2020-26, decrets, Manuel ARMP, circulaires). Retourne les passages les plus pertinents avec leurs references exactes.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Question ou contexte juridique a rechercher (en francais)",
          },
          k: {
            type: "number",
            description: "Nombre de resultats a retourner (defaut 4, max 10)",
          },
        },
        required: ["query"],
      },
    },
  },
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
 * Gere automatiquement les tool use loops (tool_calls → tool results → continuation).
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

  // Construire l'historique des messages au format OpenAI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
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
          // Accumuler la reponse complete (texte + tool_calls) via streaming
          let accumulatedText = "";
          const accumulatedToolCalls: Array<{
            index: number;
            id: string;
            name: string;
            argumentsRaw: string;
          }> = [];

          const stream = await client.chat.completions.create({
            model: MODEL,
            max_tokens: 4096,
            messages: currentMessages,
            tools: TOOLS,
            tool_choice: "auto",
            stream: true,
          });

          let finishReason: string | null = null;

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            finishReason = chunk.choices[0]?.finish_reason ?? finishReason;

            // Texte normal — streamer immediatement au client
            if (delta.content) {
              accumulatedText += delta.content;
              const sseChunk = JSON.stringify({ type: "text", text: delta.content });
              controller.enqueue(encoder.encode(`data: ${sseChunk}\n\n`));
            }

            // Accumulation des tool_calls (peuvent arriver en plusieurs chunks)
            if (delta.tool_calls) {
              for (const tcDelta of delta.tool_calls) {
                const idx = tcDelta.index;
                if (!accumulatedToolCalls[idx]) {
                  accumulatedToolCalls[idx] = {
                    index: idx,
                    id: tcDelta.id ?? "",
                    name: tcDelta.function?.name ?? "",
                    argumentsRaw: tcDelta.function?.arguments ?? "",
                  };
                } else {
                  if (tcDelta.id) accumulatedToolCalls[idx]!.id = tcDelta.id;
                  if (tcDelta.function?.name) accumulatedToolCalls[idx]!.name = tcDelta.function.name;
                  if (tcDelta.function?.arguments) {
                    accumulatedToolCalls[idx]!.argumentsRaw += tcDelta.function.arguments;
                  }
                }
              }
            }
          }

          // Construire le message assistant pour l'historique
          const assistantMessage: OpenAI.Chat.ChatCompletionMessageParam = {
            role: "assistant",
            content: accumulatedText || null,
            ...(accumulatedToolCalls.length > 0
              ? {
                  tool_calls: accumulatedToolCalls.map((tc) => ({
                    id: tc.id,
                    type: "function" as const,
                    function: { name: tc.name, arguments: tc.argumentsRaw },
                  })),
                }
              : {}),
          };

          currentMessages = [...currentMessages, assistantMessage];

          // Executer les tool calls si present
          if (accumulatedToolCalls.length > 0 && finishReason === "tool_calls") {
            const toolResultMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

            for (const tc of accumulatedToolCalls) {
              if (!tc.name) continue;

              // Signaler l'utilisation d'un outil au client
              const toolChunk = JSON.stringify({
                type: "tool_use",
                toolName: tc.name,
                toolInput: (() => {
                  try { return JSON.parse(tc.argumentsRaw); } catch { return {}; }
                })(),
              });
              controller.enqueue(encoder.encode(`data: ${toolChunk}\n\n`));

              // Executer le tool
              let toolInput: Record<string, unknown> = {};
              try {
                toolInput = JSON.parse(tc.argumentsRaw) as Record<string, unknown>;
              } catch {
                toolInput = {};
              }

              const toolResult = await executeTool(tc.name, toolInput, userId);

              // Signaler le resultat au client
              let parsedResult: unknown;
              try {
                parsedResult = JSON.parse(toolResult);
              } catch {
                parsedResult = toolResult;
              }
              const resultChunk = JSON.stringify({
                type: "tool_result",
                toolName: tc.name,
                toolResult: parsedResult,
              });
              controller.enqueue(encoder.encode(`data: ${resultChunk}\n\n`));

              toolResultMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: toolResult,
              });
            }

            // Ajouter les resultats des tools dans l'historique et continuer
            currentMessages = [...currentMessages, ...toolResultMessages];
            continueLoop = true;
          } else {
            // Pas de tool calls, on a la reponse finale
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
