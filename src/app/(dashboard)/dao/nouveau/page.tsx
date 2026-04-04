"use client";

/**
 * Page M2 — Wizard de creation de DAO (3 etapes)
 * Source : Manuel de Procedures ARMP pp.31-42
 *          Decret 2020-602 (DAO-types ARMP)
 *          Art. 54, Loi 2020-26 (delais remise offres : 21j national, 30j UEMOA)
 *          Circulaire 2024-002 (beneficiaires effectifs)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface MarcheOption {
  id: string;
  reference: string;
  objet: string;
  nature: string;
  modePassation: string;
  montantEstime: number;
  organeControle: string;
  isCommunautaire: boolean;
}

// 10 points cles de la checklist ARMP (sur 85)
// Source : Check-lists ARMP, Manuel de Procedures
const CHECKLIST_POINTS = [
  { num: 1, libelle: "Reference au DAO-type ARMP (Decret 2020-602)" },
  { num: 2, libelle: "Specifications techniques completes et non discriminatoires" },
  { num: 3, libelle: "Criteres d'evaluation definis et ponderes" },
  { num: 4, libelle: "Cautionnement de soumission entre 1% et 3% du montant estime (Art. 81, Loi 2020-26)" },
  { num: 5, libelle: "Delai de remise des offres conforme : 21j min (national) ou 30j (UEMOA) — Art. 54, Loi 2020-26" },
  { num: 6, libelle: "CCAP (Cahier des Clauses Administratives Particulieres) signe par la PRMP" },
  { num: 7, libelle: "Mode de passation conforme aux seuils (Decret 2020-599)" },
  { num: 8, libelle: "Organe de controle identifie et competent (CCMP/DDCMP/DNCMP)" },
  { num: 9, libelle: "Formulaires ARMP joints (offre, engagement, declaration soumissionnaire)" },
  { num: 10, libelle: "Divulgation beneficiaires effectifs requise (Circulaire 2024-002)" },
];

export default function NouveauDAOPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [marches, setMarches] = useState<MarcheOption[]>([]);
  const [loadingMarches, setLoadingMarches] = useState(true);
  const [selectedMarcheId, setSelectedMarcheId] = useState("");
  const selectedMarche = marches.find(m => m.id === selectedMarcheId);

  // Step 2
  const [objet, setObjet] = useState("");
  const [dateLimiteOffres, setDateLimiteOffres] = useState("");
  const [montantCautionnementPct, setMontantCautionnementPct] = useState(2); // 2% par defaut

  // Step 3 — checklist
  const [checklist, setChecklist] = useState<Record<number, boolean>>(
    Object.fromEntries(CHECKLIST_POINTS.map(p => [p.num, false]))
  );

  useEffect(() => {
    fetch("/api/marches?statut=preparation")
      .then(r => r.json())
      .then(data => {
        setMarches(data.marches ?? []);
      })
      .catch(() => setMarches([]))
      .finally(() => setLoadingMarches(false));
  }, []);

  // Suggestion automatique de la date limite selon le mode
  useEffect(() => {
    if (!selectedMarche) return;
    const today = new Date();
    // AO communautaire : 30j, national : 21j, PI : 14j ouvrables, DRP : 15j
    // Art. 54, Loi 2020-26
    let daysToAdd = 21;
    if (selectedMarche.isCommunautaire) daysToAdd = 30;
    else if (selectedMarche.modePassation.startsWith("sfq") || selectedMarche.modePassation === "sci") daysToAdd = 21; // ~14j ouvrables
    else if (selectedMarche.modePassation.startsWith("drp")) daysToAdd = 15;
    else if (selectedMarche.modePassation === "dc") daysToAdd = 7;

    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + daysToAdd);
    setDateLimiteOffres(deadline.toISOString().split("T")[0] ?? "");

    if (selectedMarche.objet) {
      setObjet(`DAO — ${selectedMarche.objet}`);
    }
  }, [selectedMarche]);

  const montantCautionnement = selectedMarche
    ? Math.round(selectedMarche.montantEstime * montantCautionnementPct / 100)
    : 0;

  const checklistScore = Object.values(checklist).filter(Boolean).length;

  async function handleSubmit() {
    if (!selectedMarcheId) {
      setError("Veuillez selectionner un marche");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marcheId: selectedMarcheId,
          objet,
          dateLimiteOffres,
          montantCautionnement,
          mode: selectedMarche?.isCommunautaire ? "international" : "national",
          checklistItems: CHECKLIST_POINTS.map(p => ({
            pointNumero: p.num,
            libelle: p.libelle,
            conforme: checklist[p.num] ?? false,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la creation");
      }

      router.push("/dao");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dao" className="hover:text-[#008751] transition-colors">DAOs</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Nouveau DAO</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Creer un nouveau DAO</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wizard en 3 etapes — Decret 2020-602 (DAO-types ARMP)
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step
                  ? "bg-[#008751] text-white"
                  : s < step
                  ? "bg-[#008751]/20 text-[#008751]"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            <span className={`text-xs ${s === step ? "font-semibold text-gray-900" : "text-gray-400"}`}>
              {s === 1 ? "Selection marche" : s === 2 ? "Configuration DAO" : "Checklist ARMP"}
            </span>
            {s < 3 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1 : Selection du marche */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Etape 1 — Selection du marche</h2>

          {loadingMarches ? (
            <p className="text-sm text-gray-500">Chargement des marches...</p>
          ) : marches.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium">Aucun marche en preparation</p>
              <p className="text-xs mt-0.5">
                Les marches au statut &quot;preparation&quot; apparaissent ici.
                Creez d&apos;abord un marche.
              </p>
              <Link href="/marches/nouveau" className="text-[#008751] hover:underline text-xs mt-2 inline-block">
                Creer un marche →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Selectionner un marche *
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                value={selectedMarcheId}
                onChange={e => setSelectedMarcheId(e.target.value)}
              >
                <option value="">-- Choisir un marche --</option>
                {marches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.reference} — {m.objet.substring(0, 60)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedMarche && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-gray-900">{selectedMarche.objet}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Nature :</span>{" "}
                  {selectedMarche.nature.replace(/_/g, " ")}
                </div>
                <div>
                  <span className="font-medium">Mode :</span>{" "}
                  {selectedMarche.modePassation.replace(/_/g, " ").toUpperCase()}
                </div>
                <div>
                  <span className="font-medium">Montant estime :</span>{" "}
                  {selectedMarche.montantEstime.toLocaleString("fr-FR")} FCFA HT
                </div>
                <div>
                  <span className="font-medium">Organe controle :</span>{" "}
                  {selectedMarche.organeControle.toUpperCase()}
                </div>
                {selectedMarche.isCommunautaire && (
                  <div className="col-span-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      Marche communautaire UEMOA — Delai 30j
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedMarcheId}
              className="px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 : Configuration DAO */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Etape 2 — Configuration du DAO</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Objet du DAO *
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                rows={3}
                value={objet}
                onChange={e => setObjet(e.target.value)}
                placeholder="Objet du dossier d'appel d'offres..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date limite de remise des offres *
                <span className="text-gray-400 font-normal ml-1">
                  ({selectedMarche?.isCommunautaire ? "30j min UEMOA" : "21j min national"} — Art. 54, Loi 2020-26)
                </span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                value={dateLimiteOffres}
                onChange={e => setDateLimiteOffres(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Taux du cautionnement de soumission (1% - 3%)
                <span className="text-gray-400 font-normal ml-1">— Art. 81, Loi 2020-26</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.5}
                  value={montantCautionnementPct}
                  onChange={e => setMontantCautionnementPct(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-semibold text-gray-700 w-10 text-right">
                  {montantCautionnementPct}%
                </span>
              </div>
              {selectedMarche && (
                <p className="text-xs text-gray-500 mt-1">
                  Montant : {montantCautionnement.toLocaleString("fr-FR")} FCFA HT
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Langue</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                  value="Francais"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                  value={selectedMarche?.isCommunautaire ? "International (UEMOA)" : "National"}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Retour
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!objet.trim() || !dateLimiteOffres}
              className="px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 : Checklist ARMP */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Etape 3 — Checklist ARMP</h2>
            <span className="text-xs text-gray-500">
              {checklistScore}/10 points verifies
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Points cles de la checklist ARMP (extraits des 85 points) — Manuel de Procedures ARMP
          </p>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#008751] rounded-full transition-all"
              style={{ width: `${(checklistScore / 10) * 100}%` }}
            />
          </div>

          <div className="space-y-2">
            {CHECKLIST_POINTS.map((point) => (
              <label
                key={point.num}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  checklist[point.num]
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-100 hover:bg-gray-100"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[#008751]"
                  checked={checklist[point.num] ?? false}
                  onChange={e => setChecklist(prev => ({ ...prev, [point.num]: e.target.checked }))}
                />
                <div>
                  <span className="text-xs font-semibold text-gray-500 mr-1">#{point.num}</span>
                  <span className="text-sm text-gray-700">{point.libelle}</span>
                </div>
              </label>
            ))}
          </div>

          {checklistScore < 10 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
              <p className="font-medium">
                {10 - checklistScore} point(s) non confirme(s)
              </p>
              <p className="text-xs mt-0.5">
                Il est recommande de verifier tous les points avant de generer le DAO.
                Vous pouvez continuer avec des points non coches mais le DAO sera marque &quot;incomplet&quot;.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Retour
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-50 transition-colors"
            >
              {loading ? "Generation en cours..." : "Generer le DAO"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
