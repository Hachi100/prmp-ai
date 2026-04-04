/**
 * Page M5 — Evaluation des Offres (3 phases)
 * Source : Manuel de Procedures ARMP pp.60-75
 *          Art. 81, Loi 2020-26 (OAB : M = 0.80 x (0.6 x Fm + 0.4 x Fc))
 *          Clause 31 IC DAO-types (corrections arithmetiques)
 *          Art. 3 al. 5, Decret 2020-600 (COE : 10 jours ouvrables)
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { db, eq } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { offres } from "@/lib/db/schema/reception";
import { soumissionnaires } from "@/lib/db/schema/soumissionnaires";
import { evaluations } from "@/lib/db/schema/evaluation";
import { formatFCFA } from "@/lib/utils";
import { EvaluationTabs } from "@/components/evaluation/evaluation-tabs";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [marche] = await db
    .select({
      id: marches.id,
      reference: marches.reference,
      objet: marches.objet,
      statut: marches.statut,
      nature: marches.nature,
      modePassation: marches.modePassation,
      montantEstime: marches.montantEstime,
    })
    .from(marches)
    .where(eq(marches.id, id))
    .limit(1)
    .catch(() => []);

  if (!marche) notFound();

  const [evalList, offresList] = await Promise.all([
    db
      .select()
      .from(evaluations)
      .where(eq(evaluations.marcheId, id))
      .limit(1)
      .catch(() => []),
    db
      .select({
        id: offres.id,
        numeroOrdre: offres.numeroOrdre,
        montantLu: offres.montantLu,
        montantCorrige: offres.montantCorrige,
        deltaCorrectionPct: offres.deltaCorrectionPct,
        isEcarteCorrection: offres.isEcarteCorrection,
        statut: offres.statut,
        denomination: soumissionnaires.denomination,
        soumissionnaireId: offres.soumissionnaireId,
      })
      .from(offres)
      .leftJoin(soumissionnaires, eq(offres.soumissionnaireId, soumissionnaires.id))
      .where(eq(offres.marcheId, id))
      .catch(() => []),
  ]);

  const evaluation = evalList[0] ?? null;

  // Serialize BigInt for client component
  const marcheSerialized = {
    id: marche.id,
    reference: marche.reference,
    objet: marche.objet,
    statut: marche.statut,
    nature: marche.nature,
    modePassation: marche.modePassation,
    montantEstime: Number(marche.montantEstime),
  };

  const offresSerialized = offresList.map(o => ({
    id: o.id,
    numeroOrdre: o.numeroOrdre,
    montantLu: o.montantLu ? Number(o.montantLu) : null,
    montantCorrige: o.montantCorrige ? Number(o.montantCorrige) : null,
    deltaCorrectionPct: o.deltaCorrectionPct ? Number(o.deltaCorrectionPct) : null,
    isEcarteCorrection: o.isEcarteCorrection,
    statut: o.statut,
    denomination: o.denomination ?? "Inconnu",
    soumissionnaireId: o.soumissionnaireId,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/marches" className="hover:text-[#008751]">Marches</Link>
        <span>›</span>
        <Link href={`/marches/${id}`} className="hover:text-[#008751]">{marche.reference}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Evaluation</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Evaluation — {marche.reference}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{marche.objet}</p>
            <p className="text-xs text-gray-400 mt-1">
              3 phases : conformite · technique · financiere · Art. 81, Loi 2020-26 (OAB)
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Estimation AC (Fc)</p>
            <p className="text-lg font-bold text-gray-900">{formatFCFA(marche.montantEstime)}</p>
            <p className="text-xs text-gray-400">{offresList.length} offre(s)</p>
          </div>
        </div>
      </div>

      {/* 3-phase tabs */}
      <EvaluationTabs
        marcheId={id}
        marche={marcheSerialized}
        offres={offresSerialized}
        evaluation={evaluation ? {
          id: evaluation.id,
          phaseActuelle: evaluation.phaseActuelle,
          statut: evaluation.statut,
          evaluateurs: evaluation.evaluateurs as string[],
        } : null}
      />
    </div>
  );
}
