"use client"

import { useState } from "react"

interface Etape {
  num: number
  code: string
  label: string
  statuts: string[]
}

interface MarcheForTabs {
  id: string
  reference: string
  objet: string
  nature: string
  modePassation: string
  montantEstime: string
  montantContractuel: string | null
  statut: string
  organeControle: string
  isCommunautaire: boolean
  exercice: number
  directionBeneficiaire: string
  sourceFinancement: string
  dateLancement: string | null
  dateAttributionProvisoire: string | null
  dateStandstillFin: string | null
  dateSignature: string | null
  dateApprobation: string | null
  dateNotificationDefinitive: string | null
  dateEntreeVigueur: string | null
  createdAt: Date
  entiteNom: string | null
  entiteCode: string | null
  entiteType: string | null
}

interface Props {
  marche: MarcheForTabs
  etapes: Etape[]
  etapeActuelle: number
}

type Tab = "informations" | "procedure" | "documents" | "historique"

function formatDate(d: string | null | Date): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR")
}

export function MarcheDetailTabs({ marche, etapes, etapeActuelle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("informations")
  const [isTransitioning, setIsTransitioning] = useState(false)

  const tabs: { id: Tab; label: string }[] = [
    { id: "informations", label: "Informations" },
    { id: "procedure", label: "Procedure" },
    { id: "documents", label: "Documents" },
    { id: "historique", label: "Historique" },
  ]

  async function handleNextStep() {
    setIsTransitioning(true)
    try {
      // Map current statut to next
      const transitions: Record<string, string> = {
        planifie: "preparation",
        preparation: "lance",
        lance: "evaluation",
        evaluation: "attribution_provisoire",
        attribution_provisoire: "standstill",
        standstill: "contractualisation",
        recours: "contractualisation",
        contractualisation: "approuve",
        approuve: "authentifie",
        authentifie: "enregistre",
        enregistre: "notifie",
        notifie: "en_vigueur",
        en_vigueur: "execution",
        execution: "reception_provisoire",
        reception_provisoire: "reception_definitive",
        reception_definitive: "solde",
      }
      const nextStatut = transitions[marche.statut]
      if (!nextStatut) {
        alert("Ce marche est dans un statut final ou ne peut pas avancer automatiquement.")
        return
      }
      const res = await fetch(`/api/marches/${marche.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nextStatut }),
      })
      if (res.ok) {
        window.location.reload()
      } else {
        alert("Erreur lors de la transition de statut.")
      }
    } finally {
      setIsTransitioning(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Tab bar */}
      <div className="border-b border-gray-200 px-5">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#008751] text-[#008751]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-5">
        {/* Informations tab */}
        {activeTab === "informations" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Informations generales
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Autorite contractante</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {marche.entiteNom ?? marche.entiteCode ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Type d entite</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {marche.entiteType ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Nature du marche</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5 capitalize">
                    {marche.nature.replace(/_/g, " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Mode de passation</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5 uppercase">
                    {marche.modePassation.replace(/_/g, " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Organe de controle</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5 uppercase">
                    {marche.organeControle}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Marche communautaire UEMOA</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {marche.isCommunautaire ? "Oui" : "Non"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Donnees financieres et calendrier
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Montant estime HT</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {Number(marche.montantEstime).toLocaleString("fr-FR")} FCFA
                  </dd>
                </div>
                {marche.montantContractuel && (
                  <div>
                    <dt className="text-xs text-gray-500">Montant contractuel HT</dt>
                    <dd className="text-sm font-medium text-green-700 mt-0.5">
                      {Number(marche.montantContractuel).toLocaleString("fr-FR")} FCFA
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500">Direction beneficiaire</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {marche.directionBeneficiaire}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Source de financement</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {marche.sourceFinancement}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Date de lancement</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {formatDate(marche.dateLancement)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Date entree en vigueur</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {formatDate(marche.dateEntreeVigueur)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Procedure tab */}
        {activeTab === "procedure" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Procedure : {marche.modePassation.toUpperCase().replace(/_/g, " ")}
              </h3>
              {!["solde", "annule", "suspendu"].includes(marche.statut) && (
                <button
                  onClick={handleNextStep}
                  disabled={isTransitioning}
                  className="px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006b40] disabled:opacity-50 transition-colors"
                >
                  {isTransitioning ? "..." : "Passer a l etape suivante"}
                </button>
              )}
            </div>

            {/* Stepper */}
            <div className="space-y-2">
              {etapes.map((etape, idx) => {
                const isDone = idx < etapeActuelle
                const isCurrent = idx === etapeActuelle
                const isFuture = idx > etapeActuelle

                return (
                  <div
                    key={etape.code}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      isCurrent
                        ? "border-[#008751] bg-green-50"
                        : isDone
                        ? "border-green-200 bg-green-50/50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? "bg-[#008751] text-white"
                          : isDone
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isDone ? "✓" : etape.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-medium uppercase ${
                          isCurrent
                            ? "text-[#008751]"
                            : isDone
                            ? "text-green-700"
                            : "text-gray-500"
                        }`}
                      >
                        {etape.code}
                      </span>
                      <p
                        className={`text-sm ${
                          isCurrent
                            ? "font-semibold text-gray-900"
                            : isDone
                            ? "text-gray-600"
                            : isFuture
                            ? "text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        {etape.label}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="flex-shrink-0 text-xs bg-[#008751] text-white px-2 py-0.5 rounded-full">
                        En cours
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
              Source : Manuel de Procedures ARMP pp.31-75 · 14 etapes de l AOO
            </div>
          </div>
        )}

        {/* Documents tab */}
        {activeTab === "documents" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray-600 font-medium">Gestion documentaire</p>
            <p className="text-gray-400 text-sm mt-1">
              Les documents DAO, PV, contrats seront disponibles ici
            </p>
          </div>
        )}

        {/* Historique tab */}
        {activeTab === "historique" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Journal des evenements</h3>
            <div className="space-y-2">
              {[
                { date: marche.createdAt, action: "Marche cree", detail: `Statut initial : planifie` },
                ...(marche.dateLancement ? [{ date: marche.dateLancement, action: "Lancement de l AO", detail: `Date de lancement : ${formatDate(marche.dateLancement)}` }] : []),
                ...(marche.dateAttributionProvisoire ? [{ date: marche.dateAttributionProvisoire, action: "Attribution provisoire", detail: `Standstill : 10 jours (Art. 79 al. 3)` }] : []),
                ...(marche.dateSignature ? [{ date: marche.dateSignature, action: "Signature du marche", detail: "" }] : []),
                ...(marche.dateEntreeVigueur ? [{ date: marche.dateEntreeVigueur, action: "Entree en vigueur", detail: "" }] : []),
              ].map((evt, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#008751] mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{evt.action}</p>
                    {evt.detail && <p className="text-xs text-gray-500 mt-0.5">{evt.detail}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(evt.date instanceof Date ? evt.date.toISOString() : evt.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
