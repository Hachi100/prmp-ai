"use client";

/**
 * Actions du module Reporting — Generation rapport trimestriel
 * Source : Art. 2, Decret 2020-596 — Rapport trimestriel PRMP sous 1 mois
 */

import { useState } from "react";

interface Props {
  annee: number;
  trimestre: number;
}

export function ReportingActions({ annee, trimestre }: Props) {
  const [showModal, setShowModal] = useState(false);

  const moisDebut = (trimestre - 1) * 3 + 1;
  const moisFin = trimestre * 3;
  const nomsMois = ["", "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
  const periodeLabel = `${nomsMois[moisDebut] ?? ""} - ${nomsMois[moisFin] ?? ""} ${annee}`;

  function handlePrint() {
    const printContent = document.getElementById("rapport-printable");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Rapport trimestriel T${trimestre}/${annee}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #008751; font-size: 18px; }
          h2 { color: #333; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 16px; }
          .header { border-bottom: 3px solid #008751; padding-bottom: 12px; margin-bottom: 16px; }
          .footer { margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          th { background: #f5f5f5; padding: 6px; text-align: left; border: 1px solid #ddd; }
          td { padding: 5px 6px; border: 1px solid #ddd; }
          .badge { font-size: 10px; padding: 2px 6px; border-radius: 10px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <div class="footer">
          <p>PRMP-Pro — Rapport trimestriel T${trimestre}/${annee}</p>
          <p>Reference legale : Art. 2, Decret 2020-596 · A transmettre 1 mois apres la fin du trimestre T${trimestre}</p>
          <p>Document genere le ${new Date().toLocaleDateString("fr-FR")}</p>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#FCD116] text-gray-900 text-sm font-medium rounded-lg hover:bg-yellow-400 transition-colors"
      >
        Generer rapport T{trimestre}/{annee}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-base font-bold text-gray-900">
                Rapport trimestriel T{trimestre}/{annee}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006B40] transition-colors"
                >
                  Imprimer / PDF
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Rapport printable */}
            <div id="rapport-printable" className="p-6 space-y-4">
              <div className="border-b-2 border-[#008751] pb-4">
                <h1 className="text-xl font-bold text-[#008751]">
                  Rapport Trimestriel de Passation des Marches Publics
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Trimestre T{trimestre}/{annee} — Periode : {periodeLabel}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  PRMP-Pro · Art. 2, Decret 2020-596 — Delai de transmission : 1 mois apres fin du trimestre
                </p>
              </div>

              <section>
                <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">
                  1. Synthese des Indicateurs
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total marches exercice {annee}</p>
                    <p className="font-bold text-gray-900 text-lg">— en cours de chargement</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Marches lances T{trimestre}</p>
                    <p className="font-bold text-gray-900 text-lg">—</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">
                  2. Etat d&apos;Avancement des Procedures
                </h2>
                <p className="text-xs text-gray-500">
                  Voir le tableau de bord principal pour le detail de chaque marche.
                  Ce rapport consolide les informations de l&apos;exercice {annee}, trimestre T{trimestre}.
                </p>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">
                  3. Conformite et Alertes
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-blue-700 text-xs">
                    <p className="font-medium">Rappel legal — Art. 2, Decret 2020-596</p>
                    <p>Ce rapport doit etre transmis au plus tard 1 mois apres la fin du trimestre T{trimestre}.</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 text-gray-600 text-xs">
                    <p>Delai de paiement : 60 jours calendaires maximum (Art. 116, Loi 2020-26)</p>
                    <p>Archivage des pieces : 10 ans minimum</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">
                  4. Certification
                </h2>
                <div className="grid grid-cols-2 gap-6 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-6">Etabli par la PRMP</p>
                    <div className="border-b border-gray-400 w-48" />
                    <p className="text-xs text-gray-500 mt-1">Signature et date</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-6">Vise par l&apos;autorite</p>
                    <div className="border-b border-gray-400 w-48" />
                    <p className="text-xs text-gray-500 mt-1">Signature et date</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
