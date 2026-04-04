/**
 * Page M4 — Reception et Ouverture des Plis
 * Source : Art. 75, Loi 2020-26 (seance publique, quorum COE)
 *          Manuel de Procedures ARMP pp.50-60
 *          Art. 3 al. 5, Decret 2020-600 (COE : 10 jours ouvrables)
 *          Quorum COE : 3 membres sur 5 minimum (Art. 55, Loi 2020-26)
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { db, eq } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { offres, pvOuverture } from "@/lib/db/schema/reception";
import { soumissionnaires } from "@/lib/db/schema/soumissionnaires";
import { formatFCFA, formatDate } from "@/lib/utils";
import { OuvertureForm } from "@/components/marche/ouverture-form";

export default async function OuverturePage({
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
      modePassation: marches.modePassation,
      montantEstime: marches.montantEstime,
    })
    .from(marches)
    .where(eq(marches.id, id))
    .limit(1)
    .catch(() => []);

  if (!marche) notFound();

  const [pvList, offresList] = await Promise.all([
    db
      .select()
      .from(pvOuverture)
      .where(eq(pvOuverture.marcheId, id))
      .limit(1)
      .catch(() => []),
    db
      .select({
        id: offres.id,
        numeroOrdre: offres.numeroOrdre,
        montantLu: offres.montantLu,
        montantCorrige: offres.montantCorrige,
        statut: offres.statut,
        isEcarteCorrection: offres.isEcarteCorrection,
        dateReception: offres.dateReception,
        denomination: soumissionnaires.denomination,
        soumissionnaireId: offres.soumissionnaireId,
      })
      .from(offres)
      .leftJoin(soumissionnaires, eq(offres.soumissionnaireId, soumissionnaires.id))
      .where(eq(offres.marcheId, id))
      .catch(() => []),
  ]);

  const pv = pvList[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/marches" className="hover:text-[#008751]">Marches</Link>
        <span>›</span>
        <Link href={`/marches/${id}`} className="hover:text-[#008751]">{marche.reference}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Ouverture des plis</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Ouverture des plis — {marche.reference}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{marche.objet}</p>
            <p className="text-xs text-gray-400 mt-1">
              Art. 75, Loi 2020-26 — Seance publique obligatoire · Quorum COE : 3/5 minimum
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Montant estime</p>
            <p className="text-lg font-bold">{formatFCFA(marche.montantEstime)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{offresList.length} offre(s) recue(s)</p>
          </div>
        </div>
      </div>

      {/* PV existant */}
      {pv ? (
        <div className="space-y-4">
          <div className="bg-[#008751]/5 border border-[#008751]/20 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#008751]/10 text-[#008751] text-xs font-semibold px-2 py-1 rounded">
                    PV D&apos;OUVERTURE CLOTURE
                  </span>
                  {pv.quorumAtteint && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                      Quorum atteint
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900">
                  Seance du {formatDate(pv.dateSeance)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{pv.lieu}</p>
                {pv.observations && (
                  <p className="text-xs text-gray-600 mt-2 bg-white rounded p-2 border border-gray-200">
                    {pv.observations}
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                <p className="text-xs text-gray-500">Offres recues</p>
                <p className="text-2xl font-bold text-gray-900">{pv.nombreOffresRecues}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pv.nombreOffresOuvertes} ouvertes</p>
              </div>
            </div>

            {/* Membres COE */}
            {Array.isArray(pv.membresCOE) && pv.membresCOE.length > 0 && (
              <div className="mt-4 border-t border-[#008751]/20 pt-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Membres COE presents ({(pv.membresCOE as Array<{nom: string; qualite: string}>).length}/5)
                </p>
                <div className="flex flex-wrap gap-2">
                  {(pv.membresCOE as Array<{nom: string; qualite: string}>).map((m, i) => (
                    <span key={i} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded">
                      {m.nom} — {m.qualite}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Liste des offres */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Offres ouvertes ({offresList.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Clause 31 IC DAO-types — Corrections arithmetiques
              </p>
            </div>
            {offresList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune offre enregistree</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">#</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Soumissionnaire</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Montant lu</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Montant corrige</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {offresList.map(o => (
                      <tr key={o.id} className={o.isEcarteCorrection ? "bg-red-50" : "hover:bg-gray-50"}>
                        <td className="px-4 py-3 text-gray-500 text-xs">{o.numeroOrdre}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {o.denomination ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {o.montantLu ? formatFCFA(o.montantLu) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {o.montantCorrige ? (
                            <span className={o.isEcarteCorrection ? "text-red-600 font-medium" : "text-gray-900"}>
                              {formatFCFA(o.montantCorrige)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            o.statut === "retenu" ? "bg-green-100 text-green-700" :
                            o.statut === "rejete" || o.isEcarteCorrection ? "bg-red-100 text-red-700" :
                            o.statut === "conforme" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {o.isEcarteCorrection ? "Ecarte (correction >10%)" : o.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Link to evaluation */}
          <div className="flex justify-end">
            <Link
              href={`/marches/${id}/evaluation`}
              className="px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] transition-colors"
            >
              Passer a l&apos;evaluation →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Organiser la seance d&apos;ouverture des plis
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mb-4">
            <p className="font-medium">Seance publique obligatoire — Art. 75, Loi 2020-26</p>
            <p className="text-xs mt-0.5">
              La COE doit comporter au moins 3 membres sur 5 pour atteindre le quorum.
              Le PV est publie immediatement apres la seance.
            </p>
          </div>
          <OuvertureForm marcheId={id} />
        </div>
      )}
    </div>
  );
}
