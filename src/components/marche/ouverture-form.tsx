"use client";

/**
 * Formulaire d'ouverture des plis (COE)
 * Source : Art. 75, Loi 2020-26 (seance publique, quorum COE)
 *          Art. 55, Loi 2020-26 (quorum : 3 membres sur 5 minimum)
 *          Manuel de Procedures ARMP pp.50-60
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OuvertureFormProps {
  marcheId: string;
}

// 5 membres type de la COE
const MEMBRES_COE_DEFAUT = [
  { nom: "", qualite: "President de la COE" },
  { nom: "", qualite: "Membre technicien 1" },
  { nom: "", qualite: "Membre technicien 2" },
  { nom: "", qualite: "Membre juriste" },
  { nom: "", qualite: "Membre financier" },
];

interface OffreItem {
  soumissionnaire: string;
  montantLu: string;
  hasGarantie: boolean;
}

export function OuvertureForm({ marcheId }: OuvertureFormProps) {
  const router = useRouter();

  const today = new Date();
  const [dateSeance, setDateSeance] = useState(today.toISOString().split("T")[0]);
  const [heureSeance, setHeureSeance] = useState("09:00");
  const [lieu, setLieu] = useState("Salle de conference de la PRMP");
  const [observations, setObservations] = useState("");

  const [membres, setMembres] = useState(MEMBRES_COE_DEFAUT.map(m => ({
    ...m,
    present: false,
  })));

  const [offres, setOffres] = useState<OffreItem[]>([
    { soumissionnaire: "", montantLu: "", hasGarantie: true },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const membresPresents = membres.filter(m => m.present && m.nom.trim()).length;
  // Quorum : 3 membres sur 5 minimum — Art. 55, Loi 2020-26
  const quorumAtteint = membresPresents >= 3;

  function addOffre() {
    setOffres(prev => [...prev, { soumissionnaire: "", montantLu: "", hasGarantie: true }]);
  }

  function removeOffre(idx: number) {
    setOffres(prev => prev.filter((_, i) => i !== idx));
  }

  function updateOffre(idx: number, field: keyof OffreItem, value: string | boolean) {
    setOffres(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!quorumAtteint) {
      setError("Le quorum de la COE n'est pas atteint (3 membres minimum sur 5 — Art. 55, Loi 2020-26)");
      return;
    }

    const offresValides = offres.filter(o => o.soumissionnaire.trim());
    if (offresValides.length === 0) {
      setError("Au moins une offre doit etre enregistree");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateSeanceISO = new Date(`${dateSeance}T${heureSeance}:00`).toISOString();

      const res = await fetch(`/api/marches/${marcheId}/ouverture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marcheId,
          dateSeance: dateSeanceISO,
          lieu,
          observations,
          membresCOE: membres
            .filter(m => m.present && m.nom.trim())
            .map(m => ({ nom: m.nom, qualite: m.qualite })),
          offres: offresValides.map((o, i) => ({
            numeroOrdre: i + 1,
            soumissionnaire: o.soumissionnaire,
            montantLu: o.montantLu ? parseInt(o.montantLu.replace(/\s/g, ""), 10) : null,
            hasGarantie: o.hasGarantie,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la cloture");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Date et lieu */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Date de la seance *
          </label>
          <input
            type="date"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            value={dateSeance}
            onChange={e => setDateSeance(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Heure *
          </label>
          <input
            type="time"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            value={heureSeance}
            onChange={e => setHeureSeance(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Lieu *
          </label>
          <input
            type="text"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
            value={lieu}
            onChange={e => setLieu(e.target.value)}
          />
        </div>
      </div>

      {/* Membres COE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-700">
            Membres de la COE
            <span className="text-gray-400 font-normal ml-1">
              (quorum : 3/5 minimum — Art. 55, Loi 2020-26)
            </span>
          </label>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            quorumAtteint
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            {membresPresents}/5 present{membresPresents > 1 ? "s" : ""}
            {quorumAtteint ? " ✓" : " — quorum non atteint"}
          </span>
        </div>

        <div className="space-y-2">
          {membres.map((m, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              m.present ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"
            }`}>
              <input
                type="checkbox"
                className="accent-[#008751]"
                checked={m.present}
                onChange={e => setMembres(prev => prev.map((mb, j) => j === i ? { ...mb, present: e.target.checked } : mb))}
              />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={`Nom du ${m.qualite.toLowerCase()}`}
                  className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#008751]/30 bg-white"
                  value={m.nom}
                  onChange={e => setMembres(prev => prev.map((mb, j) => j === i ? { ...mb, nom: e.target.value } : mb))}
                />
                <span className="text-xs text-gray-500 self-center">{m.qualite}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offres recues */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-700">
            Offres recues a la seance
          </label>
          <button
            type="button"
            onClick={addOffre}
            className="text-xs text-[#008751] hover:underline"
          >
            + Ajouter une offre
          </button>
        </div>

        <div className="space-y-2">
          {offres.map((o, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="text-xs text-gray-400 col-span-1">#{i + 1}</span>
                <input
                  type="text"
                  placeholder="Nom soumissionnaire *"
                  className="col-span-4 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#008751]/30 bg-white"
                  value={o.soumissionnaire}
                  onChange={e => updateOffre(i, "soumissionnaire", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Montant lu (FCFA HT)"
                  className="col-span-4 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#008751]/30 bg-white"
                  value={o.montantLu}
                  onChange={e => updateOffre(i, "montantLu", e.target.value)}
                />
                <label className="col-span-2 flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="accent-[#008751]"
                    checked={o.hasGarantie}
                    onChange={e => updateOffre(i, "hasGarantie", e.target.checked)}
                  />
                  Garantie
                </label>
                {offres.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOffre(i)}
                    className="col-span-1 text-red-400 hover:text-red-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observations */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Observations
        </label>
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
          rows={3}
          value={observations}
          onChange={e => setObservations(e.target.value)}
          placeholder="Observations de la seance d'ouverture..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !quorumAtteint}
          className="px-5 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Cloture en cours..." : "Cloturer l'ouverture et publier le PV"}
        </button>
      </div>
    </form>
  );
}
