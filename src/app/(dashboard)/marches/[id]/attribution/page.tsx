/**
 * Page M6 — Attribution et Contrat
 * Source : Art. 79 al. 3, Loi 2020-26 (standstill 10 jours calendaires)
 *          Art. 116-117, Loi 2020-26 (recours AC : 5j ouvrables, ARMP : 2j)
 *          Art. 3 al. 6, Decret 2020-600 (notification 1j ouvrable)
 *          Circulaire 2024-002 (beneficiaires effectifs, champ sexe obligatoire)
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { db, eq } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { attributions, recours } from "@/lib/db/schema/attribution";
import { offres } from "@/lib/db/schema/reception";
import { soumissionnaires, beneficiairesEffectifs } from "@/lib/db/schema/soumissionnaires";
import { formatFCFA, formatDate } from "@/lib/utils";
import { AttributionActions } from "@/components/marche/attribution-actions";

function countdownDays(dateStr: string | Date): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function AttributionPage({
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
      montantEstime: marches.montantEstime,
    })
    .from(marches)
    .where(eq(marches.id, id))
    .limit(1)
    .catch(() => []);

  if (!marche) notFound();

  const [attrList, recoursList] = await Promise.all([
    db
      .select({
        id: attributions.id,
        montantPropose: attributions.montantPropose,
        dateNotificationProvisoire: attributions.dateNotificationProvisoire,
        dateFinStandstill: attributions.dateFinStandstill,
        statut: attributions.statut,
        offreRetenueId: attributions.offreRetenueId,
        denomination: soumissionnaires.denomination,
        soumissionnaireId: offres.soumissionnaireId,
      })
      .from(attributions)
      .leftJoin(offres, eq(attributions.offreRetenueId, offres.id))
      .leftJoin(soumissionnaires, eq(offres.soumissionnaireId, soumissionnaires.id))
      .where(eq(attributions.marcheId, id))
      .limit(1)
      .catch(() => []),
    db
      .select({
        id: recours.id,
        typeRecours: recours.typeRecours,
        dateDepot: recours.dateDepot,
        motifs: recours.motifs,
        statut: recours.statut,
        denomination: soumissionnaires.denomination,
      })
      .from(recours)
      .leftJoin(soumissionnaires, eq(recours.soumissionnaireId, soumissionnaires.id))
      .where(eq(recours.marcheId, id))
      .catch(() => []),
  ]);

  const attribution = attrList[0] ?? null;
  const standstillDays = attribution ? countdownDays(attribution.dateFinStandstill) : null;
  const standstillExpire = standstillDays !== null && standstillDays <= 0;
  const hasBlockingRecours = recoursList.some(r => r.statut === "depose" || r.statut === "en_cours");

  // Beneficiaires effectifs de l'attributaire
  const beneficiaires = attribution?.soumissionnaireId
    ? await db
        .select()
        .from(beneficiairesEffectifs)
        .where(eq(beneficiairesEffectifs.soumissionnaireId, attribution.soumissionnaireId))
        .catch(() => [])
    : [];

  // Serialize for client
  const attributionSerialized = attribution ? {
    id: attribution.id,
    montantPropose: attribution.montantPropose,
    dateNotificationProvisoire: attribution.dateNotificationProvisoire?.toISOString() ?? null,
    dateFinStandstill: attribution.dateFinStandstill,
    statut: attribution.statut,
    denomination: attribution.denomination ?? "Inconnu",
    soumissionnaireId: attribution.soumissionnaireId ?? null,
  } : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/marches" className="hover:text-[#008751]">Marches</Link>
        <span>›</span>
        <Link href={`/marches/${id}`} className="hover:text-[#008751]">{marche.reference}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Attribution</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attribution — {marche.reference}</h1>
            <p className="text-sm text-gray-500 mt-1">{marche.objet}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Montant estime</p>
            <p className="text-lg font-bold">{formatFCFA(marche.montantEstime)}</p>
          </div>
        </div>
      </div>

      {!attribution ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="text-sm font-medium text-yellow-800">
            Aucune attribution provisoire enregistree
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            L&apos;attribution provisoire est proposee apres l&apos;evaluation des offres.
            Retournez a la phase d&apos;evaluation pour proposer un attributaire.
          </p>
          <Link
            href={`/marches/${id}/evaluation`}
            className="mt-3 inline-block px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] transition-colors"
          >
            Aller a l&apos;evaluation →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Attribution provisoire + standstill */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Attribution provisoire</h2>
                <p className="font-semibold text-gray-900 text-lg">{attribution.denomination}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Montant propose : {Number(attribution.montantPropose).toLocaleString("fr-FR")} FCFA HT
                </p>
                {attribution.dateNotificationProvisoire && (
                  <p className="text-xs text-gray-500 mt-1">
                    Notifie le : {formatDate(attribution.dateNotificationProvisoire)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  Standstill (Art. 79 al. 3, Loi 2020-26)
                </p>
                <div className={`rounded-lg p-3 text-center ${
                  standstillExpire
                    ? "bg-green-50 border border-green-200"
                    : "bg-orange-50 border border-orange-200"
                }`}>
                  {standstillExpire ? (
                    <>
                      <p className="text-lg font-bold text-green-700">Expire</p>
                      <p className="text-xs text-green-600">Standstill termine</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-orange-700">J-{standstillDays}</p>
                      <p className="text-xs text-orange-600">
                        Fin le {attribution.dateFinStandstill}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">10 jours calendaires</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recours */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Recours ({recoursList.length})
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Art. 116 : Recours AC dans 5j ouvrables · Reponse 3j ouvrables
                </p>
              </div>
            </div>

            {recoursList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">
                Aucun recours depose
              </p>
            ) : (
              <div className="space-y-2">
                {recoursList.map(r => (
                  <div key={r.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          {r.denomination ?? "—"} · Recours {r.typeRecours.toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-800 mt-1">{r.motifs}</p>
                        <p className="text-xs text-gray-400 mt-1">Depose le {r.dateDepot}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        r.statut === "accepte" ? "bg-green-100 text-green-700" :
                        r.statut === "rejete" ? "bg-gray-100 text-gray-600" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {r.statut === "depose" ? "En attente" :
                         r.statut === "en_cours" ? "En cours" :
                         r.statut === "accepte" ? "Accepte" : "Rejete"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Beneficiaires effectifs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Beneficiaires effectifs
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Obligatoire depuis Circulaire 2024-002 · Seuil : 25% des actions/votes/CA
                  · Champ sexe OBLIGATOIRE
                </p>
              </div>
            </div>

            {beneficiaires.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium">Beneficiaires effectifs non declares</p>
                <p className="text-xs mt-0.5">
                  La declaration des beneficiaires effectifs est obligatoire depuis novembre 2024.
                  Sanctions pour fausses declarations : Art. 123, Loi 2020-26
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {beneficiaires.map(b => (
                  <div key={b.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{b.prenom} {b.nom}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.sexe === "masculin" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                      }`}>
                        {b.sexe === "masculin" ? "M" : "F"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Nationalite : {b.nationalite} ·
                      Detention : {b.pourcentageDetention}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <AttributionActions
            marcheId={id}
            attribution={attributionSerialized}
            standstillExpire={standstillExpire}
            hasBlockingRecours={hasBlockingRecours}
            hasBeneficiaires={beneficiaires.length > 0}
          />
        </div>
      )}
    </div>
  );
}
