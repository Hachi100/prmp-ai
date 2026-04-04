"use client";

/**
 * Actions interactives pour la page Attribution
 * - Formulaire beneficiaires effectifs (Circulaire 2024-002)
 * - Notification attribution definitive
 * Source : Art. 79 al. 3, Loi 2020-26 (standstill 10 jours)
 *          Circulaire 2024-002 (sexe OBLIGATOIRE)
 *          Art. 123, Loi 2020-26 (sanctions)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AttributionActionsProps {
  marcheId: string;
  attribution: {
    id: string;
    denomination: string;
    soumissionnaireId: string | null;
  } | null;
  standstillExpire: boolean;
  hasBlockingRecours: boolean;
  hasBeneficiaires: boolean;
}

export function AttributionActions({
  marcheId,
  attribution,
  standstillExpire,
  hasBlockingRecours,
  hasBeneficiaires,
}: AttributionActionsProps) {
  const router = useRouter();
  const [showBenefForm, setShowBenefForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Formulaire beneficiaire effectif
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [sexe, setSexe] = useState<"masculin" | "feminin">("masculin");
  const [nationalite, setNationalite] = useState("BEN");
  const [pctDetention, setPctDetention] = useState(25);

  const canNotify = standstillExpire && !hasBlockingRecours;

  async function handleAddBeneficiaire(e: React.FormEvent) {
    e.preventDefault();
    if (!attribution?.soumissionnaireId) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/soumissionnaires/beneficiaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soumissionnaireId: attribution.soumissionnaireId,
          nom,
          prenom,
          sexe, // OBLIGATOIRE — Circulaire 2024-002
          nationalite,
          pourcentageDetention: pctDetention,
          typeControle: "actions",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }

      setMessage("Beneficiaire effectif enregistre.");
      setShowBenefForm(false);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function handleNotifierDefinitif() {
    if (!canNotify) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/marches/${marcheId}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "contractualisation" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }

      setMessage("Attribution definitive notifiee. Le marche passe en contractualisation.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  if (!attribution) return null;

  return (
    <div className="space-y-4">
      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.includes("Erreur") ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {/* Ajouter beneficiaire */}
      {!hasBeneficiaires && (
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-sm font-medium text-orange-800 mb-2">
            Declaration obligatoire des beneficiaires effectifs — Circulaire 2024-002
          </p>
          {!showBenefForm ? (
            <button
              onClick={() => setShowBenefForm(true)}
              className="px-4 py-2 bg-[#FCD116] text-gray-900 text-sm font-medium rounded-lg hover:bg-[#E5BE00] transition-colors"
            >
              Declarer les beneficiaires effectifs
            </button>
          ) : (
            <form onSubmit={handleAddBeneficiaire} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Nom *</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Prenom *</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                    value={prenom}
                    onChange={e => setPrenom(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Sexe * <span className="text-red-500">(OBLIGATOIRE — Circ. 2024-002)</span>
                  </label>
                  <select
                    required
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                    value={sexe}
                    onChange={e => setSexe(e.target.value as "masculin" | "feminin")}
                  >
                    <option value="masculin">Masculin</option>
                    <option value="feminin">Feminin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Nationalite *</label>
                  <input
                    required
                    type="text"
                    maxLength={3}
                    placeholder="BEN"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                    value={nationalite}
                    onChange={e => setNationalite(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    % Actions (min 25%)
                  </label>
                  <input
                    required
                    type="number"
                    min={25}
                    max={100}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                    value={pctDetention}
                    onChange={e => setPctDetention(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#008751] text-white text-xs font-medium rounded hover:bg-[#006B40] disabled:opacity-50 transition-colors"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBenefForm(false)}
                  className="px-4 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Notification definitive */}
      <div className={`rounded-xl border p-5 ${
        canNotify
          ? "bg-[#008751]/5 border-[#008751]/20"
          : "bg-gray-50 border-gray-200"
      }`}>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Notification de l&apos;attribution definitive
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Notification definitive : 3 jours calendaires apres approbation (Art. 86 al. 2, Loi 2020-26).
          Publication avis attribution definitive : 15 jours calendaires apres entree en vigueur (Art. 87)
        </p>

        {!standstillExpire && (
          <p className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded mb-3">
            En attente de l&apos;expiration du standstill (10 jours calendaires — Art. 79 al. 3)
          </p>
        )}
        {hasBlockingRecours && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded mb-3">
            Un recours est en cours de traitement. La notification est bloquee.
          </p>
        )}

        <button
          onClick={handleNotifierDefinitif}
          disabled={!canNotify || saving}
          className="px-5 py-2 bg-[#008751] text-white text-sm font-semibold rounded-lg hover:bg-[#006B40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "En cours..." : "Notifier l'attribution definitive"}
        </button>
      </div>
    </div>
  );
}
