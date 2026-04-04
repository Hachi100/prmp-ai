/**
 * Page Evaluation — Gestion des evaluations d offres
 * Source : Loi 2020-26 Art. 81 (OAB) ; Manuel de Procedures pp.35-65
 */

import Link from "next/link";
import { formatFCFA } from "@/lib/utils";
import { EvaluationOABPanel } from "@/components/evaluation/evaluation-oab-panel";

interface MarcheEval {
  id: string;
  reference: string;
  objet: string;
  nature: string;
  montantEstime: bigint;
  organeControle: string;
  entiteNom: string | null;
  entiteCode: string | null;
}

async function fetchMarchesEnEvaluation(): Promise<MarcheEval[]> {
  try {
    const { db, sql } = await import("@/lib/db");
    const { marches } = await import("@/lib/db/schema/marches");
    const { entites } = await import("@/lib/db/schema/entites");
    const { eq } = await import("@/lib/db");

    const results = await db
      .select({
        id: marches.id,
        reference: marches.reference,
        objet: marches.objet,
        nature: marches.nature,
        montantEstime: marches.montantEstime,
        organeControle: marches.organeControle,
        entiteNom: entites.nom,
        entiteCode: entites.code,
      })
      .from(marches)
      .leftJoin(entites, eq(marches.entiteId, entites.id))
      .where(sql`${marches.statut} = ${"evaluation"}`)
      .limit(50);

    return results as MarcheEval[];
  } catch {
    return [];
  }
}

export default async function EvaluationPage() {
  const marches = await fetchMarchesEnEvaluation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluation des Offres</h1>
        <p className="text-sm text-gray-500 mt-1">
          3 phases : conformite, technique, financiere · Art. 81, Loi 2020-26 (OAB)
        </p>
      </div>

      {/* OAB Formula reminder */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Formule OAB — Offre Anormalement Basse
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-800">
          <p className="font-bold text-gray-900">M = 0,80 × (0,6 × Fm + 0,4 × Fc)</p>
          <p className="text-xs text-gray-500 mt-2 font-sans">
            Fm = moyenne arithmetique des offres financieres corrigees = (P1 + P2 + ... + Pn) / N
          </p>
          <p className="text-xs text-gray-500 font-sans">
            Fc = estimation previsionnelle de l AC pour le lot
          </p>
          <p className="text-xs text-gray-500 mt-1 font-sans">
            Toute offre dont le montant est inferieur a M est presumee anormalement basse.
            Avant rejet : demander justifications ecrites au soumissionnaire.
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Source : Art. 81, Loi 2020-26 ; Fiches memo ARMP
        </p>
      </div>

      {/* Marches en evaluation */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            Marches en phase d evaluation ({marches.length})
          </h2>
        </div>

        {marches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">⚖️</div>
            <p className="text-gray-600 font-medium">Aucun marche en evaluation</p>
            <p className="text-gray-400 text-sm mt-1">
              Les marches au statut "evaluation" apparaitront ici
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {marches.map(marche => (
              <div key={marche.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {marche.reference}
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Evaluation
                      </span>
                      <span className="text-xs text-gray-400 uppercase">{marche.organeControle}</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{marche.objet}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {marche.entiteCode} · {marche.nature.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">{formatFCFA(marche.montantEstime)}</p>
                    <Link
                      href={`/marches/${marche.id}`}
                      className="text-xs text-[#008751] hover:underline mt-1 inline-block"
                    >
                      Voir le marche →
                    </Link>
                  </div>
                </div>

                {/* OAB Calculator */}
                <EvaluationOABPanel
                  marcheId={marche.id}
                  montantEstime={Number(marche.montantEstime)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
