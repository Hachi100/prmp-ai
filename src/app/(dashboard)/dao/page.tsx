/**
 * Page M2 — Gestion des Dossiers d'Appel d'Offres (DAO)
 * Source : Manuel de Procedures ARMP pp.31-42 (preparation DAO)
 *          Decret 2020-602 (DAO-types ARMP)
 *          Art. 3 al. 1, Decret 2020-600 (delai 30j avant lancement)
 */

import Link from "next/link";
import { db, desc, eq } from "@/lib/db";
import { daos } from "@/lib/db/schema/dao";
import { marches } from "@/lib/db/schema/marches";
import { formatFCFA } from "@/lib/utils";

type StatutDAO = "brouillon" | "soumis_controle" | "observations_recues" | "bal_obtenu" | "publie";

function getStatutBadgeClass(statut: StatutDAO): string {
  const map: Record<StatutDAO, string> = {
    brouillon: "bg-gray-100 text-gray-600",
    soumis_controle: "bg-blue-100 text-blue-700",
    observations_recues: "bg-yellow-100 text-yellow-700",
    bal_obtenu: "bg-green-100 text-green-700",
    publie: "bg-[#008751]/10 text-[#008751]",
  };
  return map[statut] ?? "bg-gray-100 text-gray-600";
}

function getStatutLabel(statut: StatutDAO): string {
  const map: Record<StatutDAO, string> = {
    brouillon: "Brouillon",
    soumis_controle: "Soumis controle",
    observations_recues: "Observations recues",
    bal_obtenu: "BAL obtenu",
    publie: "Publie",
  };
  return map[statut] ?? statut;
}

export default async function DAOPage() {
  const daoList = await db
    .select({
      id: daos.id,
      marcheId: daos.marcheId,
      version: daos.version,
      statut: daos.statut,
      checklistScore: daos.checklistScore,
      dateBAL: daos.dateBAL,
      balNumero: daos.balNumero,
      dateCreation: daos.createdAt,
      marcheRef: marches.reference,
      marcheObjet: marches.objet,
      modePassation: marches.modePassation,
      nature: marches.nature,
      montantEstime: marches.montantEstime,
    })
    .from(daos)
    .leftJoin(marches, eq(daos.marcheId, marches.id))
    .orderBy(desc(daos.createdAt))
    .limit(50)
    .catch(() => []);

  // Stats
  const enCours = daoList.filter(d => ["brouillon", "observations_recues"].includes(d.statut)).length;
  const enAttenteBal = daoList.filter(d => d.statut === "soumis_controle").length;
  const balAccorde = daoList.filter(d => ["bal_obtenu", "publie"].includes(d.statut)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers d&apos;Appel d&apos;Offres</h1>
          <p className="text-sm text-gray-500 mt-1">
            M2 — Generation DAO · Decret 2020-602 (DAO-types ARMP) · 30j avant lancement
          </p>
        </div>
        <Link
          href="/dao/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] transition-colors"
        >
          <span>+</span> Nouveau DAO
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">DAOs en cours</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{enCours}</p>
          <p className="text-xs text-gray-400 mt-0.5">brouillon ou observations</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">En attente BAL</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{enAttenteBal}</p>
          <p className="text-xs text-gray-400 mt-0.5">soumis au controle</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">BAL accorde</p>
          <p className="text-3xl font-bold text-[#008751] mt-1">{balAccorde}</p>
          <p className="text-xs text-gray-400 mt-0.5">pret a publier</p>
        </div>
      </div>

      {/* DAO Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            Tous les DAOs ({daoList.length})
          </h2>
        </div>

        {daoList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-600 font-medium">Aucun DAO cree</p>
            <p className="text-gray-400 text-sm mt-1">
              Cliquez sur &quot;Nouveau DAO&quot; pour commencer
            </p>
            <Link
              href="/dao/nouveau"
              className="mt-4 px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] transition-colors"
            >
              Creer le premier DAO
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Marche</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Montant HT</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Version</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Checklist</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daoList.map((dao) => (
                  <tr key={dao.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded inline-block mb-0.5">
                        {dao.marcheRef ?? "—"}
                      </p>
                      <p className="text-sm text-gray-900 truncate max-w-xs">
                        {dao.marcheObjet ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 uppercase">
                      {dao.modePassation?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {dao.montantEstime ? formatFCFA(dao.montantEstime) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      v{dao.version}
                    </td>
                    <td className="px-4 py-3">
                      {dao.checklistScore != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#008751] rounded-full"
                              style={{ width: `${Math.round((dao.checklistScore / 85) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{dao.checklistScore}/85</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Non verifiee</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatutBadgeClass(dao.statut as StatutDAO)}`}>
                        {getStatutLabel(dao.statut as StatutDAO)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/marches/${dao.marcheId}`}
                        className="text-xs text-[#008751] hover:underline"
                      >
                        Voir marche →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legal reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Rappel : Delais de preparation et transmission</p>
        <p className="text-xs mt-0.5 text-blue-600">
          Preparation du DAO : 30 jours calendaires avant la date de lancement prevue au PPM ·
          Transmission a l&apos;organe de controle : 10 jours ouvrables avant le lancement ·
          Art. 3, Decret 2020-600
        </p>
      </div>
    </div>
  );
}
