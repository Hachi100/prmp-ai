/**
 * Page detail d'un marche public
 * Source : Loi 2020-26, Manuel de Procedures ARMP pp.31-75
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatFCFA, formatDate } from "@/lib/utils";
import { MarcheDetailTabs } from "@/components/marche/marche-detail-tabs";

// Les 14 etapes de l'AOO — Manuel de Procedures pp.31-75
const ETAPES_AOO = [
  { num: 1, code: "E1", label: "Definition des specifications techniques", statuts: ["planifie", "preparation"] },
  { num: 2, code: "E2", label: "Preparation du DAO", statuts: ["preparation"] },
  { num: 3, code: "E3", label: "Lancement de l'AO et delai de preparation", statuts: ["lance"] },
  { num: 4, code: "E4", label: "Reception des offres", statuts: ["lance"] },
  { num: 5, code: "E5", label: "Ouverture des plis (seance publique)", statuts: ["lance"] },
  { num: 6, code: "E6", label: "Evaluation des offres et proposition d'attribution", statuts: ["evaluation"] },
  { num: 7, code: "E7", label: "Notification d'attribution provisoire", statuts: ["attribution_provisoire", "standstill", "recours"] },
  { num: 8, code: "E8", label: "Elaboration et signature du marche", statuts: ["contractualisation"] },
  { num: 9, code: "E9", label: "Approbation du marche", statuts: ["approuve"] },
  { num: 10, code: "E10", label: "Authentification et numerotation (DNCMP)", statuts: ["authentifie"] },
  { num: 11, code: "E11", label: "Enregistrement du marche (DGI, redevance ARMP)", statuts: ["enregistre"] },
  { num: 12, code: "E12", label: "Notification de l'attribution definitive", statuts: ["notifie"] },
  { num: 13, code: "E13", label: "Entree en vigueur du marche", statuts: ["en_vigueur", "execution"] },
  { num: 14, code: "E14", label: "Publication de l'avis d'attribution definitive", statuts: ["reception_provisoire", "reception_definitive", "solde"] },
];

type StatutProcedure =
  | "planifie" | "preparation" | "lance" | "evaluation"
  | "attribution_provisoire" | "standstill" | "recours" | "contractualisation"
  | "approuve" | "authentifie" | "enregistre" | "notifie" | "en_vigueur"
  | "execution" | "reception_provisoire" | "reception_definitive"
  | "solde" | "suspendu" | "annule";

function getStatutLabel(statut: StatutProcedure): string {
  const map: Record<StatutProcedure, string> = {
    planifie: "Planifie", preparation: "Preparation", lance: "Lance",
    evaluation: "Evaluation", attribution_provisoire: "Attribution provisoire",
    standstill: "Standstill (10j)", recours: "Recours", contractualisation: "Contractualisation",
    approuve: "Approuve", authentifie: "Authentifie", enregistre: "Enregistre",
    notifie: "Notifie", en_vigueur: "En vigueur", execution: "En execution",
    reception_provisoire: "Reception provisoire", reception_definitive: "Reception definitive",
    solde: "Solde", suspendu: "Suspendu", annule: "Annule",
  };
  return map[statut] ?? statut;
}

function getStatutBadgeClass(statut: StatutProcedure): string {
  if (["planifie", "preparation"].includes(statut)) return "bg-gray-100 text-gray-700";
  if (["lance"].includes(statut)) return "bg-blue-100 text-blue-700";
  if (["evaluation"].includes(statut)) return "bg-orange-100 text-orange-700";
  if (["attribution_provisoire", "standstill"].includes(statut)) return "bg-yellow-100 text-yellow-700";
  if (["recours", "suspendu", "annule"].includes(statut)) return "bg-red-100 text-red-700";
  if (["contractualisation", "approuve", "authentifie", "enregistre"].includes(statut)) return "bg-purple-100 text-purple-700";
  if (["notifie", "en_vigueur", "execution", "reception_provisoire", "reception_definitive"].includes(statut)) return "bg-green-100 text-green-700";
  if (statut === "solde") return "bg-gray-100 text-gray-500";
  return "bg-gray-100 text-gray-700";
}

function getCurrentEtapeIndex(statut: StatutProcedure): number {
  for (let i = 0; i < ETAPES_AOO.length; i++) {
    const etape = ETAPES_AOO[i];
    if (etape && etape.statuts.includes(statut)) return i;
  }
  return -1;
}

interface MarcheDetail {
  id: string;
  reference: string;
  objet: string;
  nature: string;
  modePassation: string;
  montantEstime: bigint;
  montantContractuel: bigint | null;
  statut: StatutProcedure;
  organeControle: string;
  isCommunautaire: boolean;
  exercice: number;
  directionBeneficiaire: string;
  sourceFinancement: string;
  dateLancement: string | null;
  dateAttributionProvisoire: string | null;
  dateStandstillFin: string | null;
  dateSignature: string | null;
  dateApprobation: string | null;
  dateNotificationDefinitive: string | null;
  dateEntreeVigueur: string | null;
  createdAt: Date;
  updatedAt: Date;
  entiteId: string | null;
  entiteNom: string | null;
  entiteCode: string | null;
  entiteType: string | null;
}

async function fetchMarche(id: string): Promise<MarcheDetail | null> {
  try {
    const { db, eq } = await import("@/lib/db");
    const { marches } = await import("@/lib/db/schema/marches");
    const { entites } = await import("@/lib/db/schema/entites");

    const results = await db
      .select({
        id: marches.id,
        reference: marches.reference,
        objet: marches.objet,
        nature: marches.nature,
        modePassation: marches.modePassation,
        montantEstime: marches.montantEstime,
        montantContractuel: marches.montantContractuel,
        statut: marches.statut,
        organeControle: marches.organeControle,
        isCommunautaire: marches.isCommunautaire,
        exercice: marches.exercice,
        directionBeneficiaire: marches.directionBeneficiaire,
        sourceFinancement: marches.sourceFinancement,
        dateLancement: marches.dateLancement,
        dateAttributionProvisoire: marches.dateAttributionProvisoire,
        dateStandstillFin: marches.dateStandstillFin,
        dateSignature: marches.dateSignature,
        dateApprobation: marches.dateApprobation,
        dateNotificationDefinitive: marches.dateNotificationDefinitive,
        dateEntreeVigueur: marches.dateEntreeVigueur,
        createdAt: marches.createdAt,
        updatedAt: marches.updatedAt,
        entiteId: marches.entiteId,
        entiteNom: entites.nom,
        entiteCode: entites.code,
        entiteType: entites.type,
      })
      .from(marches)
      .leftJoin(entites, eq(marches.entiteId, entites.id))
      .where(eq(marches.id, id))
      .limit(1);

    return results.length > 0 ? (results[0] as MarcheDetail) : null;
  } catch {
    return null;
  }
}

export default async function MarcheDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const marche = await fetchMarche(id);

  if (!marche) {
    notFound();
  }

  const etapeActuelle = getCurrentEtapeIndex(marche.statut);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/marches" className="hover:text-[#008751] transition-colors">
          Marches
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{marche.reference}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {marche.reference}
              </span>
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${getStatutBadgeClass(marche.statut)}`}
              >
                {getStatutLabel(marche.statut)}
              </span>
              {marche.isCommunautaire && (
                <Badge variant="info">UEMOA</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{marche.objet}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{marche.entiteNom ?? marche.entiteCode}</span>
              <span>·</span>
              <span>{marche.modePassation.toUpperCase().replace(/_/g, " ")}</span>
              <span>·</span>
              <span>{marche.organeControle.toUpperCase()}</span>
              <span>·</span>
              <span>Exercice {marche.exercice}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Montant estime HT</p>
            <p className="text-2xl font-bold text-gray-900">{formatFCFA(marche.montantEstime)}</p>
            {marche.montantContractuel && (
              <p className="text-sm text-green-600 mt-1">
                Contractuel : {formatFCFA(marche.montantContractuel)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs with client-side interactivity */}
      <MarcheDetailTabs
        marche={{
          ...marche,
          montantEstime: marche.montantEstime.toString(),
          montantContractuel: marche.montantContractuel?.toString() ?? null,
        }}
        etapes={ETAPES_AOO}
        etapeActuelle={etapeActuelle}
      />
    </div>
  );
}
