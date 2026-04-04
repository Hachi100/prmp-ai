/**
 * Page M3 — Publication AO pour un marche
 * Source : Art. 54 al. 1, Loi 2020-26 (delais : 21j national, 30j UEMOA)
 *          Art. 3 al. 4, Decret 2020-600 (publication dans 2j ouvrables apres BAL)
 *          Clauses 7/8 IC DAO-types (eclaircissements : 10j/15j, reponse 3j ouvrables)
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { db, eq } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { avisAppelOffres, clarifications, registreRetrait } from "@/lib/db/schema/publication";
import { formatFCFA, formatDate } from "@/lib/utils";
import { PublicationForm } from "@/components/marche/publication-form";

async function fetchPublicationData(marcheId: string) {
  const [marche] = await db
    .select({
      id: marches.id,
      reference: marches.reference,
      objet: marches.objet,
      nature: marches.nature,
      modePassation: marches.modePassation,
      montantEstime: marches.montantEstime,
      statut: marches.statut,
      isCommunautaire: marches.isCommunautaire,
    })
    .from(marches)
    .where(eq(marches.id, marcheId))
    .limit(1)
    .catch(() => []);

  if (!marche) return null;

  const [aaoList, clariList, retraitList] = await Promise.all([
    db.select().from(avisAppelOffres).where(eq(avisAppelOffres.marcheId, marcheId)).catch(() => []),
    db.select().from(clarifications).where(eq(clarifications.marcheId, marcheId)).catch(() => []),
    db
      .select({
        id: registreRetrait.id,
        nomRepresentant: registreRetrait.nomRepresentant,
        dateRetrait: registreRetrait.dateRetrait,
        modeRetrait: registreRetrait.modeRetrait,
      })
      .from(registreRetrait)
      .innerJoin(avisAppelOffres, eq(registreRetrait.aaoId, avisAppelOffres.id))
      .where(eq(avisAppelOffres.marcheId, marcheId))
      .catch(() => []),
  ]);

  return { marche, aao: aaoList[0] ?? null, clarifications: clariList, retraits: retraitList };
}

// Countdown en jours depuis aujourd'hui
function countdownDays(dateStr: string | Date): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDelaiLabel(delaiType: string): string {
  const map: Record<string, string> = {
    national_21j: "AO national — 21 jours calendaires min",
    communautaire_30j: "AO communautaire UEMOA — 30 jours calendaires min",
    pi_14j_ouvrables: "PI — 14 jours ouvrables min",
    drp_15j: "DRP — 15 jours calendaires",
  };
  return map[delaiType] ?? delaiType;
}

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchPublicationData(id);

  if (!data) notFound();

  const { marche, aao, clarifications: clariList, retraits } = data;
  const daysLeft = aao ? countdownDays(aao.dateLimiteSoumission) : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/marches" className="hover:text-[#008751]">Marches</Link>
        <span>›</span>
        <Link href={`/marches/${id}`} className="hover:text-[#008751]">{marche.reference}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Publication AO</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Publication — {marche.reference}</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">{marche.objet}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>{marche.modePassation.toUpperCase().replace(/_/g, " ")}</span>
              <span>·</span>
              <span>{marche.nature.replace(/_/g, " ")}</span>
              {marche.isCommunautaire && (
                <>
                  <span>·</span>
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">UEMOA</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Montant estime</p>
            <p className="text-lg font-bold text-gray-900">{formatFCFA(marche.montantEstime)}</p>
          </div>
        </div>
      </div>

      {/* Status AAO */}
      {!aao ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Publier l&apos;Avis d&apos;Appel d&apos;Offres (AAO)
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 mb-4">
            <p className="font-medium">AAO non encore publie</p>
            <p className="text-xs mt-0.5">
              Publication dans les 2 jours ouvrables apres reception du BAL.
              Art. 3 al. 4, Decret 2020-600
            </p>
          </div>
          <PublicationForm
            marcheId={id}
            modePassation={marche.modePassation}
            isCommunautaire={marche.isCommunautaire}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* AAO publie */}
          <div className="bg-white rounded-xl border border-[#008751]/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#008751]/10 text-[#008751] text-xs font-semibold px-2 py-1 rounded">
                    AAO PUBLIE
                  </span>
                  <span className="font-mono text-xs text-gray-500">{aao.numeroAAO}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Publie le {formatDate(aao.datePublication)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {getDelaiLabel(aao.delaiType)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Date limite soumission</p>
                <p className="text-base font-bold text-gray-900">
                  {formatDate(aao.dateLimiteSoumission)}
                </p>
              </div>
            </div>

            {/* Compte a rebours */}
            {daysLeft !== null && (
              <div className={`mt-4 rounded-lg p-4 text-center ${
                daysLeft <= 0
                  ? "bg-red-50 border border-red-200"
                  : daysLeft <= 5
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-blue-50 border border-blue-200"
              }`}>
                <p className={`text-3xl font-bold ${
                  daysLeft <= 0 ? "text-red-700" : daysLeft <= 5 ? "text-orange-700" : "text-blue-700"
                }`}>
                  {daysLeft <= 0 ? "Expire" : `J-${daysLeft}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {daysLeft <= 0
                    ? "La date limite de soumission est depassee"
                    : `jours restants avant la date limite de soumission`}
                </p>
              </div>
            )}
          </div>

          {/* Registre de retrait */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Registre de retrait des DAO ({retraits.length})
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Manuel de Procedures p.47 — Horodatage obligatoire de chaque retrait
            </p>
            {retraits.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucun retrait enregistre
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Soumissionnaire</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date retrait</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {retraits.map(r => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-gray-900">{r.nomRepresentant}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{formatDate(r.dateRetrait)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.modeRetrait === "electronique"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {r.modeRetrait}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Eclaircissements */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Eclaircissements ({clariList.length})
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Clauses 7/8 IC DAO-types — Reponse PRMP dans 3 jours ouvrables
                </p>
              </div>
            </div>

            {clariList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucune demande d&apos;eclaircissement recue
              </p>
            ) : (
              <div className="space-y-3">
                {clariList.map(c => (
                  <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">
                          #{c.numero} — {c.demandeur}
                        </p>
                        <p className="text-sm text-gray-900 mt-1">{c.question}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {c.dateDemande}
                      </span>
                    </div>
                    {c.reponse && (
                      <div className="mt-2 bg-green-50 rounded-lg p-2 text-xs text-green-800">
                        <p className="font-medium">Reponse :</p>
                        <p>{c.reponse}</p>
                      </div>
                    )}
                    {!c.reponse && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-2 inline-block">
                        En attente de reponse (3j ouvrables)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
