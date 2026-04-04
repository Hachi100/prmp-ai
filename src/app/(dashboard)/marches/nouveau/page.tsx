/**
 * Page creation d un nouveau marche — Wizard 3 etapes
 * Source : Loi 2020-26, Decret 2020-599
 */

import { NouveauMarcheWizard } from "@/components/marche/nouveau-marche-wizard"

export default function NouveauMarchePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau Marche</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wizard de creation — calcul automatique des seuils et organe de controle
        </p>
      </div>
      <NouveauMarcheWizard />
    </div>
  )
}
