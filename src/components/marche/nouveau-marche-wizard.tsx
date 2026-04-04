"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type NatureMarche = "travaux" | "fournitures" | "services" | "pi_cabinet" | "pi_individuel"
type TypeEntite = "ministere" | "ep_epic" | "ep_epa" | "commune_statut" | "commune_sans_statut" | "prefecture" | "autre"
type ModePassation = string

// Seuils en FCFA (valeurs simplifiees pour le client)
const SEUILS_STANDARD: Record<NatureMarche, number> = {
  travaux: 100_000_000,
  fournitures: 70_000_000,
  services: 70_000_000,
  pi_cabinet: 50_000_000,
  pi_individuel: 20_000_000,
}

const SEUILS_COMMUNE: Record<NatureMarche, number> = {
  travaux: 35_000_000,
  fournitures: 25_000_000,
  services: 25_000_000,
  pi_cabinet: 20_000_000,
  pi_individuel: 15_000_000,
}

function calcSeuil(nature: NatureMarche, typeEntite: TypeEntite): number {
  return typeEntite === "commune_sans_statut"
    ? SEUILS_COMMUNE[nature]
    : SEUILS_STANDARD[nature]
}

function calcOrgane(montant: number, nature: NatureMarche, typeEntite: TypeEntite): string {
  // Seuils DNCMP simplifies
  const dncmpStd: Record<NatureMarche, number> = {
    travaux: 500_000_000, fournitures: 300_000_000, services: 300_000_000,
    pi_cabinet: 200_000_000, pi_individuel: 100_000_000,
  }
  const dncmpCommune: Record<NatureMarche, number> = {
    travaux: 300_000_000, fournitures: 150_000_000, services: 150_000_000,
    pi_cabinet: 120_000_000, pi_individuel: 80_000_000,
  }
  const isCommuneSsp = typeEntite === "commune_sans_statut"
  const isCommuneSp = typeEntite === "commune_statut"
  const dncmpSeuil = isCommuneSsp ? dncmpCommune[nature] : dncmpStd[nature]

  if (montant >= dncmpSeuil) return "dncmp"

  // DDCMP pour communes
  if (isCommuneSp || isCommuneSsp) {
    const ddcmpMin: Record<NatureMarche, number> = {
      travaux: isCommuneSp ? 200_000_000 : 150_000_000,
      fournitures: isCommuneSp ? 100_000_000 : 50_000_000,
      services: isCommuneSp ? 100_000_000 : 50_000_000,
      pi_cabinet: isCommuneSp ? 100_000_000 : 50_000_000,
      pi_individuel: isCommuneSp ? 60_000_000 : 30_000_000,
    }
    if (montant >= ddcmpMin[nature]) return "ddcmp"
  }

  return "ccmp"
}

function calcModesValides(montant: number, nature: NatureMarche, typeEntite: TypeEntite): ModePassation[] {
  const seuilPassation = calcSeuil(nature, typeEntite)
  const isPI = nature === "pi_cabinet" || nature === "pi_individuel"

  if (montant <= 4_000_000) return []
  if (montant <= 10_000_000) {
    return isPI ? ["sci"] : ["dc"]
  }
  if (montant < seuilPassation) {
    if (isPI) return ["sfqc_qualification", "sci"]
    if (nature === "travaux") return ["drp_travaux"]
    if (nature === "fournitures") return ["drp_fournitures"]
    return ["drp_services"]
  }
  if (isPI) {
    return ["sfqc", "sfq", "scbd", "smc", "sci", "gre_a_gre", "entente_directe_pi"]
  }
  return ["aoo", "aoo_prequalification", "ao_deux_etapes", "ao_concours", "ao_restreint", "gre_a_gre"]
}

const MODE_LABELS: Record<string, string> = {
  aoo: "Appel d Offres Ouvert (AOO)",
  aoo_prequalification: "AOO avec prequalification",
  ao_deux_etapes: "AO en deux etapes",
  ao_concours: "AO avec concours",
  ao_restreint: "AO restreint",
  gre_a_gre: "Gre a gre (cas limitatifs + autorisation DNCMP)",
  drp_travaux: "Demande de Renseignements et de Prix (DRP Travaux)",
  drp_fournitures: "Demande de Renseignements et de Prix (DRP Fournitures)",
  drp_services: "Demande de Renseignements et de Prix (DRP Services)",
  dc: "Demande de Cotation (DC)",
  sfqc: "Selection Fondee sur la Qualite et le Cout (SFQC)",
  sfq: "Selection Fondee sur la Qualite (SFQ)",
  scbd: "Selection dans le Cadre d un Budget Determine (SCBD)",
  smc: "Selection au Moindre Cout (SMC)",
  sfqc_qualification: "Selection Fondee sur les Qualifications (SfQC)",
  sci: "Selection de Consultants Individuels (SCI)",
  entente_directe_pi: "Entente directe PI (autorisation DNCMP)",
}

interface Step1Data {
  objet: string
  nature: NatureMarche | ""
  typeEntite: TypeEntite | ""
  montantEstime: string
  directionBeneficiaire: string
  sourceFinancement: string
  exercice: string
}

interface Step2Data {
  modePassation: ModePassation
}

interface Step3Data {
  reference: string
  // Dates calcules automatiquement
}

export function NouveauMarcheWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [step1, setStep1] = useState<Step1Data>({
    objet: "",
    nature: "",
    typeEntite: "ministere",
    montantEstime: "",
    directionBeneficiaire: "",
    sourceFinancement: "Budget National",
    exercice: new Date().getFullYear().toString(),
  })

  const [step2, setStep2] = useState<Step2Data>({
    modePassation: "",
  })

  const [step3, setStep3] = useState<Step3Data>({
    reference: "",
  })

  // Calculs en temps reel
  const montantNum = parseFloat(step1.montantEstime.replace(/\s/g, "")) || 0
  const nature = step1.nature as NatureMarche
  const typeEntite = step1.typeEntite as TypeEntite

  const seuilPassation = nature && typeEntite ? calcSeuil(nature, typeEntite) : 0
  const organeControle = nature && typeEntite && montantNum > 0
    ? calcOrgane(montantNum, nature, typeEntite)
    : ""
  const modesValides = nature && typeEntite && montantNum > 0
    ? calcModesValides(montantNum, nature, typeEntite)
    : []

  const dispense = montantNum > 0 && montantNum <= 4_000_000
  const isCommunautaire = nature && montantNum > 0 && (() => {
    const seuils: Record<NatureMarche, number> = {
      travaux: 1_000_000_000, fournitures: 500_000_000, services: 500_000_000,
      pi_cabinet: 150_000_000, pi_individuel: 150_000_000,
    }
    return montantNum >= (seuils[nature] ?? Infinity)
  })()

  async function handleSubmit() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/marches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: step3.reference,
          objet: step1.objet,
          nature: step1.nature,
          modePassation: step2.modePassation,
          entiteId: "00000000-0000-0000-0000-000000000001", // placeholder — a remplacer par selection reelle
          montantEstime: montantNum,
          organeControle,
          exercice: parseInt(step1.exercice, 10),
          directionBeneficiaire: step1.directionBeneficiaire,
          sourceFinancement: step1.sourceFinancement,
          createdBy: "00000000-0000-0000-0000-000000000001", // placeholder
        }),
      })

      if (res.ok) {
        const data = await res.json() as { data?: { id?: string } }
        router.push(data.data?.id ? `/marches/${data.data.id}` : "/marches")
      } else {
        const err = await res.json() as { error?: string }
        setError(err.error ?? "Erreur lors de la creation")
      }
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step
                  ? "bg-[#008751] text-white"
                  : s < step
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            <span className={`text-sm font-medium ${s === step ? "text-gray-900" : "text-gray-400"}`}>
              {s === 1 ? "Informations" : s === 2 ? "Mode de passation" : "Reference"}
            </span>
            {s < 3 && <div className="w-12 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Informations generales</h2>

          <div className="space-y-2">
            <Label htmlFor="objet">Objet du marche *</Label>
            <Input
              id="objet"
              value={step1.objet}
              onChange={e => setStep1(p => ({ ...p, objet: e.target.value }))}
              placeholder="Ex: Construction du siege de la DGTCP"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nature">Nature *</Label>
              <select
                id="nature"
                value={step1.nature}
                onChange={e => setStep1(p => ({ ...p, nature: e.target.value as NatureMarche, }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#008751]"
              >
                <option value="">Selectionner...</option>
                <option value="travaux">Travaux</option>
                <option value="fournitures">Fournitures</option>
                <option value="services">Services</option>
                <option value="pi_cabinet">PI Cabinet</option>
                <option value="pi_individuel">PI Individuel</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeEntite">Type d entite *</Label>
              <select
                id="typeEntite"
                value={step1.typeEntite}
                onChange={e => setStep1(p => ({ ...p, typeEntite: e.target.value as TypeEntite }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#008751]"
              >
                <option value="ministere">Ministere</option>
                <option value="ep_epic">EP (EPIC)</option>
                <option value="ep_epa">EP (EPA)</option>
                <option value="commune_statut">Commune a statut particulier</option>
                <option value="commune_sans_statut">Commune sans statut particulier</option>
                <option value="prefecture">Prefecture</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant">Montant estime HT (FCFA) *</Label>
            <Input
              id="montant"
              type="number"
              value={step1.montantEstime}
              onChange={e => setStep1(p => ({ ...p, montantEstime: e.target.value }))}
              placeholder="Ex: 150000000"
            />
          </div>

          {/* Real-time analysis */}
          {montantNum > 0 && step1.nature && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-blue-900">Analyse automatique :</p>
              {dispense ? (
                <p className="text-blue-700">Dispense de procedure formelle (montant &lt;= 4 000 000 FCFA). Comparer minimum 3 pro forma.</p>
              ) : (
                <>
                  <p className="text-blue-700">
                    Seuil de passation ({step1.nature}) : {seuilPassation.toLocaleString("fr-FR")} FCFA HT
                    <br />
                    Source : Decret 2020-599 Art. 1-2
                  </p>
                  <p className="text-blue-700">
                    Organe de controle : <strong className="uppercase">{organeControle}</strong>
                    <br />
                    Source : Manuel de Procedures p.19-21
                  </p>
                  {isCommunautaire && (
                    <p className="text-orange-700 font-medium">
                      Marche communautaire UEMOA (seuils Art. 8, Decret 2020-599)
                    </p>
                  )}
                  <p className="text-blue-700">
                    {modesValides.length === 0
                      ? "Montant dans la zone de dispense"
                      : `Modes applicables : ${modesValides.map(m => m.toUpperCase().replace(/_/g, " ")).join(", ")}`
                    }
                  </p>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="direction">Direction beneficiaire *</Label>
              <Input
                id="direction"
                value={step1.directionBeneficiaire}
                onChange={e => setStep1(p => ({ ...p, directionBeneficiaire: e.target.value }))}
                placeholder="Ex: Direction Generale du Budget"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source de financement *</Label>
              <Input
                id="source"
                value={step1.sourceFinancement}
                onChange={e => setStep1(p => ({ ...p, sourceFinancement: e.target.value }))}
                placeholder="Ex: Budget National, IDA, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exercice">Exercice budgetaire *</Label>
            <Input
              id="exercice"
              type="number"
              value={step1.exercice}
              onChange={e => setStep1(p => ({ ...p, exercice: e.target.value }))}
              placeholder="2025"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!step1.objet || !step1.nature || !step1.montantEstime || !step1.directionBeneficiaire}
              className="bg-[#008751] hover:bg-[#006b40]"
            >
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Mode de passation</h2>
          <p className="text-sm text-gray-500">
            Modes valides pour un montant de {montantNum.toLocaleString("fr-FR")} FCFA HT · Nature : {step1.nature}
          </p>

          {modesValides.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Ce montant est en zone de dispense (inferieur a 4 000 000 FCFA).
              Aucune procedure formelle requise — comparer minimum 3 pro forma.
            </div>
          ) : (
            <div className="space-y-2">
              {modesValides.map(mode => (
                <button
                  key={mode}
                  onClick={() => setStep2({ modePassation: mode })}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    step2.modePassation === mode
                      ? "border-[#008751] bg-green-50 text-[#008751]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium text-sm">{MODE_LABELS[mode] ?? mode}</span>
                  {mode === "gre_a_gre" && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Attention : autorisation prealable DNCMP obligatoire (Art. 34-35, Loi 2020-26)
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>← Retour</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!step2.modePassation && modesValides.length > 0}
              className="bg-[#008751] hover:bg-[#006b40]"
            >
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Reference et recapitulatif</h2>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference du marche *</Label>
            <Input
              id="reference"
              value={step3.reference}
              onChange={e => setStep3({ reference: e.target.value })}
              placeholder="Ex: MEFP-AOO-2025-001"
            />
            <p className="text-xs text-gray-400">
              Format suggere : CODE_ENTITE-MODE-ANNEE-NUMERO_SEQUENTIEL
            </p>
          </div>

          {/* Recap */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Recapitulatif</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Objet</dt>
                <dd className="font-medium text-gray-900 max-w-xs text-right truncate">{step1.objet}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Nature</dt>
                <dd className="font-medium text-gray-900 capitalize">{step1.nature}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Mode de passation</dt>
                <dd className="font-medium text-gray-900">{step2.modePassation.toUpperCase().replace(/_/g, " ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Montant estime HT</dt>
                <dd className="font-medium text-gray-900">{montantNum.toLocaleString("fr-FR")} FCFA</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Organe de controle</dt>
                <dd className="font-medium text-gray-900 uppercase">{organeControle}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Exercice</dt>
                <dd className="font-medium text-gray-900">{step1.exercice}</dd>
              </div>
            </dl>
          </div>

          {/* Delais automatiques */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1 text-xs text-blue-800">
            <p className="font-semibold">Delais legaux applicables (Art. 3, Decret 2020-600) :</p>
            <p>Preparation DAO : 30 jours calendaires avant lancement</p>
            <p>Transmission DAO a organe controle : 10 jours ouvrables avant lancement</p>
            <p>Delai de remise des offres : 21 jours calendaires (AO national) · 30 jours (UEMOA)</p>
            <p>Evaluation : 10 jours ouvrables apres reception des offres</p>
            <p>Standstill : 10 jours calendaires minimum (Art. 79 al. 3)</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>← Retour</Button>
            <Button
              onClick={handleSubmit}
              disabled={!step3.reference || loading}
              className="bg-[#008751] hover:bg-[#006b40]"
            >
              {loading ? "Creation..." : "Creer le marche"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
