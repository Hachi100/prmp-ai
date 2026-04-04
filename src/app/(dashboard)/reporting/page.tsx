/**
 * Page Reporting — Rapports trimestriels et KPI
 * Source : Art. 2, Decret 2020-596 ; Art. 24 al. 1, Loi 2020-26
 * Rapport trimestriel PRMP : 1 mois apres la fin du trimestre
 */

import Link from "next/link";
import { formatFCFA } from "@/lib/utils";
import { ReportingActions } from "@/components/reporting/reporting-actions";

interface KPIData {
  totalMarches: number;
  marchesLances: number;
  marchesAttribues: number;
  marchesEnExecution: number;
  montantTotal: bigint;
  montantContracte: bigint;
}

interface MarcheRapport {
  id: string;
  reference: string;
  objet: string;
  nature: string;
  modePassation: string;
  statut: string;
  montantEstime: bigint;
  montantContractuel: bigint | null;
}

async function fetchKPIs(annee: number, trimestre: number): Promise<KPIData> {
  try {
    const { db, sql, count, sum } = await import("@/lib/db");
    const { marches } = await import("@/lib/db/schema/marches");

    // Determine date range for trimestre
    const moisDebut = (trimestre - 1) * 3 + 1;
    const moisFin = trimestre * 3;
    const dateDebut = `${annee}-${String(moisDebut).padStart(2, "0")}-01`;
    const dateFin = `${annee}-${String(moisFin).padStart(2, "0")}-${moisFin === 3 || moisFin === 12 ? 31 : moisFin === 6 ? 30 : moisFin === 9 ? 30 : 31}`;

    const [kpiResult] = await db
      .select({
        totalMarches: count(),
        montantTotal: sum(marches.montantEstime),
        montantContracte: sum(marches.montantContractuel),
      })
      .from(marches)
      .where(sql`${marches.exercice} = ${annee}`);

    const [lances] = await db
      .select({ n: count() })
      .from(marches)
      .where(sql`${marches.exercice} = ${annee} AND ${marches.dateLancement} BETWEEN ${dateDebut} AND ${dateFin}`);

    const [attribues] = await db
      .select({ n: count() })
      .from(marches)
      .where(sql`${marches.exercice} = ${annee} AND ${marches.statut} IN ('contractualisation','approuve','authentifie','enregistre','notifie','en_vigueur','execution','reception_provisoire','reception_definitive','solde')`);

    const [execution] = await db
      .select({ n: count() })
      .from(marches)
      .where(sql`${marches.exercice} = ${annee} AND ${marches.statut} = ${"execution"}`);

    return {
      totalMarches: Number(kpiResult?.totalMarches ?? 0),
      marchesLances: Number(lances?.n ?? 0),
      marchesAttribues: Number(attribues?.n ?? 0),
      marchesEnExecution: Number(execution?.n ?? 0),
      montantTotal: BigInt(kpiResult?.montantTotal ?? 0),
      montantContracte: BigInt(kpiResult?.montantContracte ?? 0),
    };
  } catch {
    return {
      totalMarches: 0,
      marchesLances: 0,
      marchesAttribues: 0,
      marchesEnExecution: 0,
      montantTotal: 0n,
      montantContracte: 0n,
    };
  }
}

async function fetchMarchesRapport(annee: number): Promise<MarcheRapport[]> {
  try {
    const { db, sql } = await import("@/lib/db");
    const { marches } = await import("@/lib/db/schema/marches");

    const results = await db
      .select({
        id: marches.id,
        reference: marches.reference,
        objet: marches.objet,
        nature: marches.nature,
        modePassation: marches.modePassation,
        statut: marches.statut,
        montantEstime: marches.montantEstime,
        montantContractuel: marches.montantContractuel,
      })
      .from(marches)
      .where(sql`${marches.exercice} = ${annee}`)
      .limit(50);

    return results as MarcheRapport[];
  } catch {
    return [];
  }
}

function getStatutLabel(statut: string): string {
  const map: Record<string, string> = {
    planifie: "Planifie", preparation: "Preparation", lance: "Lance",
    evaluation: "Evaluation", attribution_provisoire: "Attribution prov.",
    standstill: "Standstill", recours: "Recours", contractualisation: "Contractualisation",
    approuve: "Approuve", authentifie: "Authentifie", enregistre: "Enregistre",
    notifie: "Notifie", en_vigueur: "En vigueur", execution: "Execution",
    reception_provisoire: "Recep. prov.", reception_definitive: "Recep. def.",
    solde: "Solde", suspendu: "Suspendu", annule: "Annule",
  };
  return map[statut] ?? statut;
}

function getStatutClass(statut: string): string {
  if (["planifie", "preparation"].includes(statut)) return "bg-gray-100 text-gray-600";
  if (["lance"].includes(statut)) return "bg-blue-100 text-blue-700";
  if (["evaluation"].includes(statut)) return "bg-orange-100 text-orange-700";
  if (["attribution_provisoire", "standstill"].includes(statut)) return "bg-yellow-100 text-yellow-700";
  if (["recours", "suspendu", "annule"].includes(statut)) return "bg-red-100 text-red-700";
  if (["contractualisation", "approuve", "authentifie", "enregistre"].includes(statut)) return "bg-purple-100 text-purple-700";
  if (["notifie", "en_vigueur", "execution", "reception_provisoire", "reception_definitive"].includes(statut)) return "bg-green-100 text-green-700";
  if (statut === "solde") return "bg-gray-100 text-gray-500";
  return "bg-gray-100 text-gray-700";
}

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; trimestre?: string }>;
}) {
  const params = await searchParams;
  const annee = params.annee ? parseInt(params.annee, 10) : new Date().getFullYear();
  const trimestre = params.trimestre ? parseInt(params.trimestre, 10) : Math.ceil((new Date().getMonth() + 1) / 3);

  const [kpis, marchesRapport] = await Promise.all([
    fetchKPIs(annee, trimestre),
    fetchMarchesRapport(annee),
  ]);

  const tauxExecution = kpis.totalMarches > 0
    ? Math.round((kpis.marchesAttribues / kpis.totalMarches) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
          <p className="text-sm text-gray-500 mt-1">
            Art. 2, Decret 2020-596 · Rapport trimestriel PRMP sous 1 mois apres fin du trimestre
          </p>
        </div>
        <ReportingActions annee={annee} trimestre={trimestre} />
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Annee :</span>
            {[2024, 2025, 2026].map(y => (
              <Link
                key={y}
                href={`/reporting?annee=${y}&trimestre=${trimestre}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  y === annee
                    ? "bg-[#008751] text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Trimestre :</span>
            {[1, 2, 3, 4].map(t => (
              <Link
                key={t}
                href={`/reporting?annee=${annee}&trimestre=${t}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  t === trimestre
                    ? "bg-[#008751] text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                T{t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Total marches {annee}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.totalMarches}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Lances T{trimestre}</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{kpis.marchesLances}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Attribues</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{kpis.marchesAttribues}</p>
          <p className="text-xs text-gray-400 mt-0.5">Taux : {tauxExecution}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Montant contracte</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {kpis.montantContracte > 0n ? formatFCFA(kpis.montantContracte) : "—"}
          </p>
        </div>
      </div>

      {/* Alertes conformite */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Alertes de conformite
        </h2>
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            <p className="font-medium">Rappel legal : rapport trimestriel PRMP</p>
            <p className="text-xs mt-0.5 text-blue-600">
              A transmettre 1 mois apres la fin du trimestre T{trimestre} · Art. 2, Decret 2020-596
            </p>
          </div>
          {kpis.marchesEnExecution > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
              <p className="font-medium">{kpis.marchesEnExecution} marche{kpis.marchesEnExecution > 1 ? "s" : ""} en execution</p>
              <p className="text-xs mt-0.5 text-yellow-600">
                Verifier le respect des delais de paiement (60 jours max · Art. 116, Loi 2020-26)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Table des marches du trimestre */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            Marches exercice {annee} ({marchesRapport.length})
          </h2>
        </div>
        {marchesRapport.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-gray-500 text-sm">Aucun marche pour {annee}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Objet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nature</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Montant HT</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {marchesRapport.map(marche => (
                  <tr key={marche.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      <Link href={`/marches/${marche.id}`} className="hover:text-[#008751] hover:underline">
                        {marche.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{marche.objet}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs">
                      {marche.nature.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs uppercase">
                      {marche.modePassation.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatFCFA(marche.montantEstime)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatutClass(marche.statut)}`}>
                        {getStatutLabel(marche.statut)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
