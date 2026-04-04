"use client";

/**
 * Formulaire de publication d'un AAO (Avis d'Appel d'Offres)
 * Source : Art. 54, Loi 2020-26 (delais remise offres)
 *          Art. 3 al. 4, Decret 2020-600 (publication 2j apres BAL)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PublicationFormProps {
  marcheId: string;
  modePassation: string;
  isCommunautaire: boolean;
}

function getDefaultDelaiDays(modePassation: string, isCommunautaire: boolean): number {
  if (isCommunautaire) return 30;
  if (modePassation.startsWith("sfq") || modePassation === "sci") return 21;
  if (modePassation.startsWith("drp")) return 15;
  if (modePassation === "dc") return 7;
  return 21; // AOO national par defaut — Art. 54, Loi 2020-26
}

function getDefaultDelaiType(modePassation: string, isCommunautaire: boolean): string {
  if (isCommunautaire) return "communautaire_30j";
  if (modePassation.startsWith("drp")) return "drp_15j";
  if (modePassation.startsWith("sfq") || modePassation === "sci") return "pi_14j_ouvrables";
  return "national_21j";
}

export function PublicationForm({ marcheId, modePassation, isCommunautaire }: PublicationFormProps) {
  const router = useRouter();
  const today = new Date();
  const defaultDays = getDefaultDelaiDays(modePassation, isCommunautaire);

  const defaultDeadline = new Date(today);
  defaultDeadline.setDate(defaultDeadline.getDate() + defaultDays);

  const [numeroAAO, setNumeroAAO] = useState(`AAO-${new Date().getFullYear()}-001`);
  const [datePublication, setDatePublication] = useState(today.toISOString().split("T")[0] ?? "");
  const [dateLimiteSoumission, setDateLimiteSoumission] = useState(defaultDeadline.toISOString().split("T")[0] ?? "");
  const [lieuRetrait, setLieuRetrait] = useState("Secretariat de la PRMP");
  const [montantDossier, setMontantDossier] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delaiType = getDefaultDelaiType(modePassation, isCommunautaire);

  // Verification du delai minimum legal
  const pubDate = new Date(datePublication);
  const limDate = new Date(dateLimiteSoumission);
  const diffDays = Math.ceil((limDate.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
  const minDays = isCommunautaire ? 30 : modePassation.startsWith("drp") ? 15 : 21;
  const isDelaiValide = diffDays >= minDays;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDelaiValide) {
      setError(`Le delai minimum est de ${minDays} jours calendaires (Art. 54, Loi 2020-26)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/publication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marcheId,
          numeroAAO,
          datePublication: new Date(datePublication).toISOString(),
          dateLimiteSoumission: new Date(dateLimiteSoumission + "T17:00:00").toISOString(),
          delaiType,
          lieuRetrait,
          montantDossier: montantDossier === "" ? undefined : Number(montantDossier),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la publication");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Numero AAO *
          </label>
          <input
            type="text"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            value={numeroAAO}
            onChange={e => setNumeroAAO(e.target.value)}
            placeholder="AAO-2025-001"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Montant dossier (FCFA)
          </label>
          <input
            type="number"
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            value={montantDossier}
            onChange={e => setMontantDossier(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="0 = gratuit"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Date de publication *
          </label>
          <input
            type="date"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            value={datePublication}
            onChange={e => setDatePublication(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Date limite soumission *
            <span className="text-gray-400 font-normal ml-1">(min {minDays}j)</span>
          </label>
          <input
            type="date"
            required
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              isDelaiValide ? "border-gray-200 focus:ring-[#008751]/30" : "border-red-300 focus:ring-red-300"
            }`}
            value={dateLimiteSoumission}
            onChange={e => setDateLimiteSoumission(e.target.value)}
          />
          <p className={`text-xs mt-0.5 ${isDelaiValide ? "text-[#008751]" : "text-red-600"}`}>
            {diffDays} jours (min {minDays}j — Art. 54, Loi 2020-26)
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Lieu de retrait du DAO
        </label>
        <input
          type="text"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
          value={lieuRetrait}
          onChange={e => setLieuRetrait(e.target.value)}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
        <p className="font-medium">Type de delai : {delaiType.replace(/_/g, " ")}</p>
        <p className="mt-0.5">
          La publication de l&apos;AAO passera le marche au statut &quot;Lance&quot;.
          Source : Art. 3 al. 4, Decret 2020-600
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !isDelaiValide}
          className="px-5 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Publication en cours..." : "Publier l'AAO"}
        </button>
      </div>
    </form>
  );
}
