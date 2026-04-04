"use client";

/**
 * Tabs d'evaluation 3 phases pour un marche
 * Tab 1 : Conformite administrative
 * Tab 2 : Evaluation technique
 * Tab 3 : Evaluation financiere (OAB, corrections arithmetiques)
 * Source : Manuel de Procedures ARMP pp.60-75
 *          Art. 81, Loi 2020-26 (OAB)
 *          Clause 31 IC DAO-types (corrections arithmetiques)
 */

import { useState } from "react";

interface OffreItem {
  id: string;
  numeroOrdre: number;
  montantLu: number | null;
  montantCorrige: number | null;
  deltaCorrectionPct: number | null;
  isEcarteCorrection: boolean;
  statut: string;
  denomination: string;
  soumissionnaireId: string;
}

interface MarcheInfo {
  id: string;
  reference: string;
  objet: string;
  statut: string;
  nature: string;
  modePassation: string;
  montantEstime: number; // Fc — estimation previsionnelle AC
}

interface EvaluationInfo {
  id: string;
  phaseActuelle: string;
  statut: string;
  evaluateurs: string[];
}

interface EvaluationTabsProps {
  marcheId: string;
  marche: MarcheInfo;
  offres: OffreItem[];
  evaluation: EvaluationInfo | null;
}

// Documents requis pour la conformite administrative
const DOCS_CONFORMITE = [
  "Cautionnement de soumission (1-3%)",
  "Registre de Commerce (RCCM)",
  "Quitus fiscal (IFU valide)",
  "Attestation CNSS",
  "Declaration sur l'honneur",
];

export function EvaluationTabs({ marcheId, marche, offres, evaluation }: EvaluationTabsProps) {
  const [activeTab, setActiveTab] = useState<"conformite" | "technique" | "financiere">("conformite");

  // Conformite — checklist par offre
  const [conformites, setConformites] = useState<Record<string, Record<string, boolean>>>(
    Object.fromEntries(offres.map(o => [o.id, Object.fromEntries(DOCS_CONFORMITE.map(d => [d, false]))]))
  );

  // Technique — scores par offre
  const [scorestech, setScoresTech] = useState<Record<string, number>>(
    Object.fromEntries(offres.map(o => [o.id, 0]))
  );

  // Financiere — corrections arithmetiques
  const [montantsCorr, setMontantsCorr] = useState<Record<string, string>>(
    Object.fromEntries(offres.map(o => [o.id, String(o.montantCorrige ?? o.montantLu ?? "")]))
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Offres conformes (toutes docs OK)
  const offresConformes = offres.filter(o =>
    !o.isEcarteCorrection &&
    DOCS_CONFORMITE.every(d => conformites[o.id]?.[d])
  );

  // OAB calculation — Art. 81, Loi 2020-26
  // M = 0.80 x (0.6 x Fm + 0.4 x Fc)
  const montantsValides = offresConformes
    .map(o => {
      const val = Number(montantsCorr[o.id] ?? "");
      return isNaN(val) || val <= 0 ? null : val;
    })
    .filter((v): v is number => v !== null);

  const Fm = montantsValides.length > 0
    ? montantsValides.reduce((a, b) => a + b, 0) / montantsValides.length
    : 0;
  const Fc = marche.montantEstime;
  const M_oab = Fc > 0 ? 0.80 * (0.6 * Fm + 0.4 * Fc) : 0;

  // Classement financier (hors OAB et corrections)
  const classementFinancier = offresConformes
    .map(o => {
      const montant = Number(montantsCorr[o.id] ?? "");
      const isOAB = M_oab > 0 && montant < M_oab && montant > 0;
      return { ...o, montantFinal: montant, isOAB };
    })
    .filter(o => !isNaN(o.montantFinal) && o.montantFinal > 0 && !o.isOAB)
    .sort((a, b) => a.montantFinal - b.montantFinal);

  async function handleProposeAttributaire() {
    if (classementFinancier.length === 0) return;
    const mieux = classementFinancier[0]!;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marcheId,
          offreRetenueId: mieux.id,
          montantPropose: String(mieux.montantFinal),
          dateNotificationProvisoire: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }
      setMessage("Attribution provisoire proposee avec succes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { key: "conformite" as const, label: "1. Conformite administrative" },
    { key: "technique" as const, label: "2. Evaluation technique" },
    { key: "financiere" as const, label: "3. Evaluation financiere" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? "bg-white text-[#008751] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1 : Conformite */}
      {activeTab === "conformite" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            Phase 1 : Conformite administrative
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Verifier la presence de chaque document pour chaque soumissionnaire.
            Une offre non conforme est eliminee.
          </p>

          {offres.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Aucune offre enregistree. Completez d&apos;abord la seance d&apos;ouverture.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Soumissionnaire</th>
                    {DOCS_CONFORMITE.map(d => (
                      <th key={d} className="text-center px-2 py-2 text-xs font-medium text-gray-500 max-w-20">
                        <span className="block truncate" title={d}>{d.split(" ")[0]}</span>
                      </th>
                    ))}
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {offres.map(o => {
                    const allOK = DOCS_CONFORMITE.every(d => conformites[o.id]?.[d]);
                    return (
                      <tr key={o.id} className={allOK ? "bg-green-50" : "hover:bg-gray-50"}>
                        <td className="px-3 py-2 font-medium text-gray-900 text-xs">
                          #{o.numeroOrdre} {o.denomination}
                        </td>
                        {DOCS_CONFORMITE.map(d => (
                          <td key={d} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              className="accent-[#008751]"
                              checked={conformites[o.id]?.[d] ?? false}
                              onChange={e => setConformites(prev => ({
                                ...prev,
                                [o.id]: { ...prev[o.id], [d]: e.target.checked },
                              }))}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            allOK ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {allOK ? "Conforme" : "Non conforme"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center">
            <p className="text-xs text-gray-500">
              {offresConformes.length}/{offres.length} offre(s) conforme(s)
            </p>
            <button
              onClick={() => setActiveTab("technique")}
              disabled={offresConformes.length === 0}
              className="px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-40 transition-colors"
            >
              Phase 2 : Technique →
            </button>
          </div>
        </div>
      )}

      {/* Tab 2 : Technique */}
      {activeTab === "technique" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            Phase 2 : Evaluation technique
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Score technique sur 100 points. Les offres sous le seuil minimum sont eliminées.
            Seules les offres conformes administrativement sont evaluees.
          </p>

          {offresConformes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Aucune offre conforme. Completez d&apos;abord la phase 1 (conformite administrative).
            </div>
          ) : (
            <div className="space-y-3">
              {offresConformes.map(o => {
                const score = scorestech[o.id] ?? 0;
                const passed = score >= 70; // Seuil technique minimum classique : 70/100
                return (
                  <div
                    key={o.id}
                    className={`border rounded-lg p-4 ${
                      passed ? "border-green-200 bg-green-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          #{o.numeroOrdre} {o.denomination}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {passed ? "Score suffisant (>= 70/100)" : "Score insuffisant (< 70/100)"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={score}
                          onChange={e => setScoresTech(prev => ({ ...prev, [o.id]: Number(e.target.value) }))}
                          className="w-32"
                        />
                        <span className={`text-lg font-bold w-12 text-right ${
                          passed ? "text-[#008751]" : score < 50 ? "text-red-600" : "text-orange-600"
                        }`}>
                          {score}/100
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full transition-all ${
                          passed ? "bg-[#008751]" : "bg-orange-400"
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setActiveTab("conformite")}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Phase 1
            </button>
            <button
              onClick={() => setActiveTab("financiere")}
              disabled={offresConformes.filter(o => (scorestech[o.id] ?? 0) >= 70).length === 0}
              className="px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-40 transition-colors"
            >
              Phase 3 : Financiere →
            </button>
          </div>
        </div>
      )}

      {/* Tab 3 : Financiere */}
      {activeTab === "financiere" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Phase 3 : Evaluation financiere
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Clause 31 IC DAO-types — Corrections arithmetiques ·
              Art. 81, Loi 2020-26 — OAB (M = 0,80 × (0,6 × Fm + 0,4 × Fc))
            </p>
          </div>

          {/* OAB formula display */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Calcul OAB — Art. 81, Loi 2020-26
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Fm (moyenne offres corrigees)</p>
                <p className="font-bold text-gray-900">
                  {Fm > 0 ? Fm.toLocaleString("fr-FR") + " FCFA" : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fc (estimation AC)</p>
                <p className="font-bold text-gray-900">{Fc.toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Seuil OAB (M)</p>
                <p className={`font-bold text-lg ${M_oab > 0 ? "text-[#E8112D]" : "text-gray-400"}`}>
                  {M_oab > 0 ? M_oab.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " FCFA" : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Table financiere */}
          {offresConformes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Aucune offre qualifiee techniquement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Soumissionnaire</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Montant lu</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                      Montant corrige
                      <span className="block font-normal text-gray-400">(Clause 31 IC)</span>
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">OAB?</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Rang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {offresConformes.map(o => {
                    const montantCorr = Number(montantsCorr[o.id] ?? "");
                    const isOAB = M_oab > 0 && montantCorr < M_oab && montantCorr > 0;
                    const ecartPct = o.montantLu && montantCorr && o.montantLu > 0
                      ? Math.abs((montantCorr - o.montantLu) / o.montantLu * 100)
                      : 0;
                    const isEcarte = ecartPct > 10;
                    const rang = classementFinancier.findIndex(c => c.id === o.id) + 1;

                    return (
                      <tr key={o.id} className={isOAB || isEcarte ? "bg-red-50" : rang === 1 ? "bg-green-50" : "hover:bg-gray-50"}>
                        <td className="px-3 py-3 font-medium text-gray-900">
                          #{o.numeroOrdre} {o.denomination}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {o.montantLu ? o.montantLu.toLocaleString("fr-FR") + " FCFA" : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEcarte && (
                              <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                                &gt;10% — ecartee
                              </span>
                            )}
                            <input
                              type="number"
                              min={0}
                              className={`w-36 border rounded px-2 py-1 text-xs text-right focus:outline-none ${
                                isEcarte ? "border-red-300 bg-red-50" : "border-gray-200"
                              }`}
                              value={montantsCorr[o.id] ?? ""}
                              onChange={e => setMontantsCorr(prev => ({ ...prev, [o.id]: e.target.value }))}
                            />
                          </div>
                          {ecartPct > 0 && (
                            <p className={`text-xs mt-0.5 text-right ${isEcarte ? "text-red-600 font-medium" : "text-gray-400"}`}>
                              Ecart : {ecartPct.toFixed(1)}%
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isOAB ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                              OAB
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isOAB || isEcarte ? (
                            <span className="text-xs text-red-600">Ecartee</span>
                          ) : rang > 0 ? (
                            <span className={`text-xs font-bold ${rang === 1 ? "text-[#008751]" : "text-gray-600"}`}>
                              {rang === 1 ? "1er" : `${rang}e`}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Attributaire propose */}
          {classementFinancier.length > 0 && (
            <div className="bg-[#008751]/5 border border-[#008751]/20 rounded-lg p-4">
              <p className="text-sm font-semibold text-[#008751] mb-1">
                Attributaire propose : {classementFinancier[0]!.denomination}
              </p>
              <p className="text-xs text-gray-600">
                Montant : {classementFinancier[0]!.montantFinal.toLocaleString("fr-FR")} FCFA HT
                · Offre la moins disante conforme
              </p>
              {message && (
                <p className={`text-xs mt-2 ${message.includes("succes") ? "text-green-700" : "text-red-700"}`}>
                  {message}
                </p>
              )}
              <button
                onClick={handleProposeAttributaire}
                disabled={saving}
                className="mt-3 px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-50 transition-colors"
              >
                {saving ? "Proposition en cours..." : "Proposer l'attributaire"}
              </button>
            </div>
          )}

          <div className="flex justify-start">
            <button
              onClick={() => setActiveTab("technique")}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Phase 2
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
