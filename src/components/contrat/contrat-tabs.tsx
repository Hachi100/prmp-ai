"use client";

/**
 * Onglets du détail contrat (5 onglets)
 * OS — Décomptes — Pénalités — Avenants — Réceptions
 */

import { useState } from "react";
import { OSDialog } from "./os-dialog";
import { DecompteDialog } from "./decompte-dialog";
import { AvenantDialog } from "./avenant-dialog";
import { PenaliteCalculator } from "./penalite-calculator";
import { ReceptionForm } from "./reception-form";
import { formatDate, formatMontant } from "@/lib/utils";

type OrdreService = {
  id: string;
  numero: number;
  type: string;
  dateEmission: string;
  dateNotification: string | null;
  observations: string | null;
};

type Decompte = {
  id: string;
  numero: number;
  type: string;
  montantHT: number;
  montantTTC: number;
  dateDepot: string;
  datePaiement: string | null;
  statut: string;
  delaiPaiementRestant: number | null;
};

type Penalite = {
  id: string;
  joursRetard: number;
  montantPenalite: number;
  montantCumule: number;
  plafond10pct: number;
  dateDebutRetard: string;
  isResiliationDeclenchee: boolean;
};

type Avenant = {
  id: string;
  numero: number;
  objet: string;
  montantInitial: number;
  montantAvenant: number;
  nouveauMontant: number;
  pctCumule: string;
  motifJuridique: string;
  dateSignature: string | null;
};

type Reception = {
  id: string;
  type: string;
  dateDemande: string;
  dateReception: string | null;
  reserves: string | null;
};

interface ContratTabsProps {
  contratId: string;
  montantTTC: number;
  montantHT: number;
  ordresServices: OrdreService[];
  decomptes: Decompte[];
  penalites: Penalite[];
  avenants: Avenant[];
  receptions: Reception[];
}

const TABS = ["OS", "Décomptes", "Pénalités", "Avenants", "Réceptions"] as const;

export function ContratTabs({
  contratId,
  montantTTC,
  montantHT,
  ordresServices,
  decomptes,
  penalites,
  avenants,
  receptions,
}: ContratTabsProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("OS");

  const hasProvisoire = receptions.some((r) => r.type === "provisoire");
  const montantCumulAvenants = avenants.reduce(
    (sum, a) => sum + Number(a.montantAvenant),
    0
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Tab headers */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "border-b-2 border-[#008751] text-[#008751]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            {tab === "OS" && ordresServices.length > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                {ordresServices.length}
              </span>
            )}
            {tab === "Décomptes" && decomptes.length > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                {decomptes.length}
              </span>
            )}
            {tab === "Pénalités" && penalites.length > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-600 text-xs rounded-full px-1.5 py-0.5">
                {penalites.length}
              </span>
            )}
            {tab === "Avenants" && avenants.length > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                {avenants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {/* ── OS ── */}
        {activeTab === "OS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Ordres de Service
              </h3>
              <OSDialog contratId={contratId} />
            </div>
            {ordresServices.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Aucun ordre de service émis.
              </p>
            ) : (
              <div className="space-y-2">
                {ordresServices.map((os) => (
                  <div
                    key={os.id}
                    className="flex items-start gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <span className="text-xs font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                      OS #{os.numero}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            os.type === "demarrage"
                              ? "bg-green-100 text-green-700"
                              : os.type === "cloture"
                              ? "bg-gray-100 text-gray-700"
                              : os.type === "arret"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {os.type.charAt(0).toUpperCase() + os.type.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(os.dateEmission)}
                        </span>
                      </div>
                      {os.observations && (
                        <p className="text-xs text-gray-500 mt-1">
                          {os.observations}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Décomptes ── */}
        {activeTab === "Décomptes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Décomptes — Art. 116, Loi 2020-26 (délai 60j)
              </h3>
              <DecompteDialog contratId={contratId} />
            </div>
            {decomptes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Aucun décompte enregistré.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">N°</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Type</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Montant TTC</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Dépôt</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Délai restant</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {decomptes.map((d) => {
                      const delai = d.delaiPaiementRestant;
                      const delaiColor =
                        d.statut === "paye"
                          ? "text-gray-400"
                          : delai === null
                          ? "text-gray-400"
                          : delai > 30
                          ? "text-green-600"
                          : delai > 15
                          ? "text-orange-600"
                          : "text-red-600 font-bold";

                      return (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">#{d.numero}</td>
                          <td className="px-3 py-2 capitalize text-xs">{d.type}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatMontant(d.montantTTC)}
                          </td>
                          <td className="px-3 py-2 text-xs">{formatDate(d.dateDepot)}</td>
                          <td className={`px-3 py-2 text-xs ${delaiColor}`}>
                            {d.statut === "paye"
                              ? "Payé"
                              : delai !== null
                              ? `${delai}j`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                d.statut === "paye"
                                  ? "bg-green-100 text-green-700"
                                  : d.statut === "valide"
                                  ? "bg-blue-100 text-blue-700"
                                  : d.statut === "rejete"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {d.statut.charAt(0).toUpperCase() + d.statut.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Pénalités ── */}
        {activeTab === "Pénalités" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Pénalités de retard — Art. 113-114, Loi 2020-26
            </h3>
            {penalites.length > 0 && (
              <div className="space-y-2 mb-4">
                {penalites.map((p) => {
                  const pct = p.plafond10pct > 0
                    ? (p.montantCumule / p.plafond10pct) * 100
                    : 0;
                  return (
                    <div
                      key={p.id}
                      className={`px-4 py-3 rounded-lg border text-sm ${
                        p.isResiliationDeclenchee
                          ? "bg-red-50 border-red-300"
                          : pct > 80
                          ? "bg-orange-50 border-orange-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>Retard de <strong>{p.joursRetard} jours</strong> depuis {formatDate(p.dateDebutRetard)}</span>
                        <span className="font-bold">{formatMontant(p.montantPenalite)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Cumul : {formatMontant(p.montantCumule)} / Plafond 10% : {formatMontant(p.plafond10pct)}
                        {" "}({pct.toFixed(1)}%)
                      </div>
                      {p.isResiliationDeclenchee && (
                        <div className="text-xs font-bold text-red-700 mt-1">
                          RÉSILIATION DE PLEIN DROIT déclenchée
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <PenaliteCalculator
              contratId={contratId}
              montantTTC={montantTTC}
            />
          </div>
        )}

        {/* ── Avenants ── */}
        {activeTab === "Avenants" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Avenants — Plafond 30% (Art. 84, Loi 2020-26)
              </h3>
              <AvenantDialog
                contratId={contratId}
                montantInitial={montantHT}
                montantCumulAvenants={montantCumulAvenants}
              />
            </div>

            {/* Progress bar cumul avenants */}
            {montantHT > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border border-gray-200">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Cumul avenants : {formatMontant(montantCumulAvenants)} HT</span>
                  <span>
                    {((montantCumulAvenants / montantHT) * 100).toFixed(1)}% / 30%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      montantCumulAvenants / montantHT <= 0.2
                        ? "bg-green-500"
                        : montantCumulAvenants / montantHT <= 0.28
                        ? "bg-orange-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        ((montantCumulAvenants / montantHT) / 0.3) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {avenants.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Aucun avenant enregistré.
              </p>
            ) : (
              <div className="space-y-2">
                {avenants.map((a) => (
                  <div
                    key={a.id}
                    className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono text-gray-500">
                          Avenant #{a.numero}
                        </span>
                        <p className="text-sm text-gray-800 mt-0.5">{a.objet}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Motif : {a.motifJuridique}
                          {a.dateSignature && ` · Signé le ${formatDate(a.dateSignature)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            Number(a.montantAvenant) >= 0
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {Number(a.montantAvenant) >= 0 ? "+" : ""}
                          {formatMontant(a.montantAvenant)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Cumul : {parseFloat(a.pctCumule).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Réceptions ── */}
        {activeTab === "Réceptions" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Réceptions — Workflow provisoire → définitive
            </h3>

            {/* Workflow status */}
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  hasProvisoire
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {hasProvisoire ? "✓" : "○"} Provisoire
              </div>
              <div className="h-px w-6 bg-gray-300" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  receptions.some((r) => r.type === "definitive")
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {receptions.some((r) => r.type === "definitive") ? "✓" : "○"}{" "}
                Définitive
              </div>
            </div>

            {receptions.length > 0 && (
              <div className="space-y-2">
                {receptions.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">{r.type}</span>
                      <span className="text-gray-500 text-xs">
                        Demande : {formatDate(r.dateDemande)}
                      </span>
                    </div>
                    {r.dateReception && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Réception effective : {formatDate(r.dateReception)}
                      </p>
                    )}
                    {r.reserves && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        Réserves : {r.reserves}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-3">
                Enregistrer une nouvelle réception :
              </p>
              <ReceptionForm
                contratId={contratId}
                hasProvisoire={hasProvisoire}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
