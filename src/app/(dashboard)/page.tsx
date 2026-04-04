/**
 * Dashboard principal PRMP-Pro
 * KPI, alertes actives, pipeline Kanban des marches
 */

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d&apos;ensemble de la passation des marches publics — Exercice 2025
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          titre="Marches en cours"
          valeur="12"
          sousTitre="exercice 2025"
          couleur="blue"
          icone="📁"
        />
        <KPICard
          titre="Alertes actives"
          valeur="3"
          sousTitre="dont 1 bloquant"
          couleur="red"
          icone="🔴"
        />
        <KPICard
          titre="Budget contracte"
          valeur="2,4 Mds"
          sousTitre="FCFA HT"
          couleur="green"
          icone="💰"
        />
        <KPICard
          titre="Taux d&apos;execution"
          valeur="68%"
          sousTitre="vs. PPM 2025"
          couleur="orange"
          icone="📊"
        />
      </div>

      {/* Alertes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          🔔 Alertes prioritaires
        </h2>
        <div className="space-y-3">
          <AlerteItem
            niveau="bloquant"
            message="Standstill expire — Marche MEFP-AOO-2025-001 : 10 jours écoules sans contractualisation"
            source="Art. 79 al. 3, Loi 2020-26"
          />
          <AlerteItem
            niveau="avertissement"
            message="Delai evaluation depassé de 2 jours — COE doit terminer sous 10 jours ouvrables"
            source="Art. 3 al. 5, Decret 2020-600"
          />
          <AlerteItem
            niveau="suggestion"
            message="PPM 2025 : 3 marches du T1 non encore lances — risque de decalage"
            source="Art. 24 al. 1, Loi 2020-26"
          />
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          📋 Pipeline des procedures
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[
            { statut: "Préparation", count: 3, color: "bg-gray-100" },
            { statut: "Lancé", count: 2, color: "bg-blue-50" },
            { statut: "Évaluation", count: 1, color: "bg-yellow-50" },
            { statut: "Attribution", count: 2, color: "bg-orange-50" },
            { statut: "Contractualisation", count: 1, color: "bg-purple-50" },
            { statut: "Exécution", count: 3, color: "bg-green-50" },
          ].map((col) => (
            <div key={col.statut} className="flex-shrink-0 w-44">
              <div className={`${col.color} rounded-lg p-3`}>
                <p className="text-xs font-medium text-gray-600">{col.statut}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{col.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Derniers marches */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          🕐 Activite recente
        </h2>
        <div className="space-y-2">
          {[
            {
              ref: "MEFP-AOO-2025-001",
              objet: "Construction batiment DGTCP",
              statut: "Evaluation",
              montant: "800 000 000",
            },
            {
              ref: "MEFP-AOO-2025-002",
              objet: "Materiel informatique DSI",
              statut: "Préparation",
              montant: "120 000 000",
            },
          ].map((m) => (
            <div
              key={m.ref}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{m.ref}</p>
                <p className="text-xs text-gray-500">{m.objet}</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {m.statut}
                </span>
                <p className="text-xs text-gray-500 mt-1">{m.montant} FCFA</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  titre,
  valeur,
  sousTitre,
  couleur,
  icone,
}: {
  titre: string;
  valeur: string;
  sousTitre: string;
  couleur: "blue" | "red" | "green" | "orange";
  icone: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {titre}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{valeur}</p>
          <p className="text-xs text-gray-400 mt-1">{sousTitre}</p>
        </div>
        <div className={`${colors[couleur]} rounded-lg p-2 text-lg`}>{icone}</div>
      </div>
    </div>
  );
}

function AlerteItem({
  niveau,
  message,
  source,
}: {
  niveau: "bloquant" | "avertissement" | "suggestion";
  message: string;
  source: string;
}) {
  const styles = {
    bloquant: "bg-red-50 border-red-200 text-red-800",
    avertissement: "bg-yellow-50 border-yellow-200 text-yellow-800",
    suggestion: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const icons = {
    bloquant: "🔴",
    avertissement: "🟡",
    suggestion: "🔵",
  };

  return (
    <div
      className={`${styles[niveau]} border rounded-lg px-4 py-3 flex items-start gap-3`}
    >
      <span>{icons[niveau]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs opacity-70 mt-0.5 font-mono">{source}</p>
      </div>
    </div>
  );
}
