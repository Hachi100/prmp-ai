/**
 * Types pour les requetes et reponses API
 */

import type { NiveauAlerte, ModePassation, NatureMarche, StatutProcedure } from "./enums";

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Reponses API generiques
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// API Marches
// ---------------------------------------------------------------------------

export interface CreateMarcheInput {
  objet: string;
  nature: NatureMarche;
  modePassation: ModePassation;
  entiteId: string;
  montantEstime: number;
  exercice: number;
  directionBeneficiaire: string;
  sourceFinancement: string;
  ppmLigneId?: string;
}

export interface UpdateMarcheStatutInput {
  marcheId: string;
  nouveauStatut: StatutProcedure;
  commentaire?: string;
}

export interface ListMarchesParams extends PaginationParams {
  statut?: StatutProcedure;
  nature?: NatureMarche;
  mode?: ModePassation;
  exercice?: number;
  entiteId?: string;
  search?: string;
}

// ---------------------------------------------------------------------------
// API IA Advisor (streaming)
// ---------------------------------------------------------------------------

export interface AdvisorRequest {
  message: string;
  marcheId?: string;
  module: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

/** Chunk SSE envoye par le streaming */
export interface StreamChunk {
  type: "text" | "tool_use" | "tool_result" | "error" | "done";
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
}

// ---------------------------------------------------------------------------
// API OAB
// ---------------------------------------------------------------------------

export interface CalculerOABInput {
  offres: Array<{
    id: string;
    soumissionnaireNom: string;
    montantCorrige: number;
  }>;
  estimationAC: number;
}

// ---------------------------------------------------------------------------
// API Penalites
// ---------------------------------------------------------------------------

export interface CalculerPenaliteInput {
  contratId: string;
  montantTTC: number;
  joursRetard: number;
  tauxJournalier?: number;
}

// ---------------------------------------------------------------------------
// API Seuils
// ---------------------------------------------------------------------------

export interface VerifierSeuilsInput {
  montant: number;
  nature: NatureMarche;
  typeEntite: string;
  hasCCMPDelegues?: boolean;
}

// ---------------------------------------------------------------------------
// API Alertes
// ---------------------------------------------------------------------------

export interface AlerteDTO {
  id: string;
  marcheId?: string;
  marcheObjet?: string;
  typeAlerte: string;
  severite: NiveauAlerte;
  message: string;
  isRead: boolean;
  createdAt: string;
}
