"use client"

interface Props {
  annee: number
  trimestre: number
}

export function ReportingActions({ annee, trimestre }: Props) {
  function handleGenerate() {
    alert(
      `Rapport trimestriel T${trimestre}/${annee}\n\n` +
      "La generation de rapport Word/Excel est disponible dans la version complete de PRMP-Pro.\n\n" +
      "Source legale : Art. 2, Decret 2020-596 — delai : 1 mois apres fin du trimestre."
    )
  }

  return (
    <button
      onClick={handleGenerate}
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FCD116] text-gray-900 text-sm font-medium rounded-lg hover:bg-yellow-400 transition-colors"
    >
      Generer rapport T{trimestre}/{annee}
    </button>
  )
}
