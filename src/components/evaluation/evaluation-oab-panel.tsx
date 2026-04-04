"use client"

import { useState } from "react"

interface Props {
  marcheId: string
  montantEstime: number
}

interface Offre {
  id: string
  montant: string
}

export function EvaluationOABPanel({ montantEstime }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [offres, setOffres] = useState<Offre[]>([
    { id: "1", montant: "" },
    { id: "2", montant: "" },
    { id: "3", montant: "" },
  ])

  const validOffres = offres
    .map(o => parseFloat(o.montant.replace(/\s/g, "")) || 0)
    .filter(v => v > 0)

  const Fm = validOffres.length > 0
    ? validOffres.reduce((a, b) => a + b, 0) / validOffres.length
    : 0

  const Fc = montantEstime
  const M = Fm > 0 ? 0.80 * (0.6 * Fm + 0.4 * Fc) : 0

  const offresOAB = validOffres.filter(o => o < M)

  function addOffre() {
    setOffres(prev => [...prev, { id: Date.now().toString(), montant: "" }])
  }

  function removeOffre(id: string) {
    setOffres(prev => prev.filter(o => o.id !== id))
  }

  function updateOffre(id: string, montant: string) {
    setOffres(prev => prev.map(o => o.id === id ? { ...o, montant } : o))
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mt-3 text-xs text-[#008751] hover:underline"
      >
        Calculer OAB →
      </button>
    )
  }

  return (
    <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Calcul OAB (Art. 81, Loi 2020-26)</h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          Fermer ×
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500">Montants des offres financieres corrigees (FCFA HT) :</p>
        {offres.map(offre => (
          <div key={offre.id} className="flex gap-2">
            <input
              type="number"
              value={offre.montant}
              onChange={e => updateOffre(offre.id, e.target.value)}
              placeholder="Montant de l offre..."
              className="flex-1 h-8 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#008751]"
            />
            {offres.length > 1 && (
              <button
                onClick={() => removeOffre(offre.id)}
                className="text-red-400 hover:text-red-600 text-sm px-2"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addOffre}
          className="text-xs text-[#008751] hover:underline"
        >
          + Ajouter une offre
        </button>
      </div>

      {M > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-sm">
          <div className="font-mono text-xs space-y-1">
            <p>Fm = {Fm.toLocaleString("fr-FR")} FCFA</p>
            <p>Fc = {Fc.toLocaleString("fr-FR")} FCFA</p>
            <p className="font-bold text-gray-900">
              M = 0,80 × (0,6 × Fm + 0,4 × Fc) = {M.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA
            </p>
          </div>

          {offresOAB.length > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              {offresOAB.length} offre{offresOAB.length > 1 ? "s" : ""} presumee{offresOAB.length > 1 ? "s" : ""} anormalement basse{offresOAB.length > 1 ? "s" : ""}.
              Obligation de demander des justifications ecrites avant rejet.
            </div>
          ) : validOffres.length > 0 ? (
            <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
              Aucune offre anormalement basse detectee.
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
