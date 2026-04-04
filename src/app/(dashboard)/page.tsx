/**
 * Dashboard principal PRMP-Pro
 * KPI, alertes actives, pipeline Kanban des marches
 * Donnees reelles depuis la base de donnees
 */

import { db, count, sum, desc, eq, inArray } from "@/lib/db";
import { marches } from "@/lib/db/schema/marches";
import { alertes } from "@/lib/db/schema/audit";
import Link from "next/link";
import { formatFCFA } from "@/lib/utils";

// Groupes de statuts pour le pipeline Kanban
const STATUTS_EN_COURS = [
  "preparation",
  "lance",
  "evaluation",
  "attribution_provisoire",
  "standstill",
  "contractualisation",
] as const;

const STATUTS_ACTIFS = [
  "en_vigueur",
  "execution",
  "reception_provisoire",
  "reception_definitive",
] as const;

export default async function DashboardPage() {
  // Requetes DB paralleles avec fallback sur erreur
  const [
    marchesEnCoursResult,
    alertesResult,
    montantResult,
    recentMarchesResult,
    kanbanResult,
  ] = await Promise.all([
    db
      .select({ total: count() })
      .from(marches)
      .where(inArray(marches.statut, [...STATUTS_EN_COURS]))
      .catch(() => [{ total: 0 }]),
    db
      .select({ total: count() })
      .from(alertes)
      .where(eq(alertes.isRead, false))
      .catch(() => [{ total: 0 }]),
    db
      .select({ total: sum(marches.montantEstime) })
      .from(marches)
      .where(inArray(marches.statut, [...STATUTS_ACTIFS]))
      .catch(() => [{ total: null }]),
    db
      .select()
      .from(marches)
      .orderBy(desc(marches.createdAt))
      .limit(5)
      .catch(() => []),
    db
      .select({ statut: marches.statut, total: count() })
      .from(marches)
      .groupBy(marches.statut)
      .catch(() => []),
  ]);

  const nbMarchesEnCours = Number(marchesEnCoursResult[0]?.total ?? 0);
  const nbAlertes = Number(alertesResult[0]?.total ?? 0);
  const montantContracte = montantResult[0]?.total
    ? BigInt(montantResult[0].total)
    : 0n;

  // Kanban : aggrégation par groupe de statuts
  const kanbanMap: Record<string, number> = {};
  for (const row of kanbanResult) {
    kanbanMap[row.statut] = Number(row.total);
  }

  const kanbanCols = [
    {
      label: "Preparation",
      statuts: ["planifie", "preparation"],
      color: "bg-gray-100",
    },
    {
      label: "Lance",
      statuts: ["lance"],
      color: "bg-blue-50",
    },
    {
      label: "Evaluation",
      statuts: ["evaluation"],
      color: "bg-yellow-50",
    },
    {
      label: "Attribution",
      statuts: ["attribution_provisoire", "standstill", "recours"],
      color: "bg-orange-50",
    },
    {
      label: "Contractualisation",
      statuts: ["contractualisation", "approuve", "authentifie", "enregistre", "notifie"],
      color: "bg-purple-50",
    },
    {
      label: "Execution",
      statuts: ["en_vigueur", "execution", "reception_provisoire", "reception_definitive", "solde"],
      color: "bg-green-50",
    },
  ];

  // Montant en milliards/millions pour affichage compact
  const formatMontantCompact = (m: bigint): string => {
    const n = Number(m);
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " Mds";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + " M";
    return n.toLocaleString("fr-FR");
  };

  const statutLabel: Record<string, string> = {
    planifie: "Planifié",
    preparation: "Préparation",
    lance: "Lancé",
    evaluation: "Évaluation",
    attribution_provisoire: "Attribution prov.",
    standstill: "Standstill",
    recours: "Recours",
    contractualisation: "Contractualisation",
    approuve: "Approuvé",
    authentifie: "Authentifié",
    enregistre: "Enregistré",
    notifie: "Notifié",
    en_vigueur: "En vigueur",
    execution: "Exécution",
    reception_provisoire: "Réception prov.",
    reception_definitive: "Réception déf.",
    solde: "Soldé",
    suspendu: "Suspendu",
    annule: "Annulé",
  };

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d&apos;ensemble de la passation des marches publics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          titre="Marches en cours"
          valeur={String(nbMarchesEnCours)}
          sousTitre="en procedure active"
          couleur="blue"
          icone="📁"
        />
        <KPICard
          titre="Alertes actives"
          valeur={String(nbAlertes)}
          sousTitre={nbAlertes === 0 ? "aucune alerte" : "non lues"}
          couleur="red"
          icone="🔴"
        />
        <KPICard
          titre="Budget contracte"
          valeur={montantContracte > 0n ? formatMontantCompact(montantContracte) : "—"}
          sousTitre="FCFA HT (marches actifs)"
          couleur="green"
          icone="💰"
        />
        <KPICard
          titre="Total marches"
          valeur={String(
            kanbanResult.reduce((acc, r) => acc + Number(r.total), 0)
          )}
          sousTitre="tous statuts confondus"
          couleur="orange"
          icone="📊"
        />
      </div>

      {/* Pipeline Kanban */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Pipeline des procedures
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {kanbanCols.map((col) => {
            const total = col.statuts.reduce(
              (acc, s) => acc + (kanbanMap[s] ?? 0),
              0
            );
            return (
              <div key={col.label} className="flex-shrink-0 w-44">
                <div className={`${col.color} rounded-lg p-3`}>
                  <p className="text-xs font-medium text-gray-600">{col.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{total}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derniers marches */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Activite recente
          </h2>
          <Link
            href="/marches"
            className="text-xs text-[#008751] hover:underline"
          >
            Voir tous les marches →
          </Link>
        </div>
        {recentMarchesResult.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Aucun marche enregistre
          </p>
        ) : (
          <div className="space-y-2">
            {recentMarchesResult.map((m) => (
              <Link
                key={m.id}
                href={`/marches/${m.id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition block"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {m.reference}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-xs">
                    {m.objet}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {statutLabel[m.statut] ?? m.statut}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFCFA(m.montantEstime)} HT
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Liens rapides */}
      <div className="grid grid-cols-3 gap-4">
        <Link
          href="/dao/nouveau"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#008751] hover:shadow-sm transition group"
        >
          <div className="text-2xl mb-2">📋</div>
          <p className="text-sm font-semibold text-gray-800 group-hover:text-[#008751]">
            Nouveau DAO
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Generer un dossier d&apos;appel d&apos;offres
          </p>
        </Link>
        <Link
          href="/marches/nouveau"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#008751] hover:shadow-sm transition group"
        >
          <div className="text-2xl mb-2">📝</div>
          <p className="text-sm font-semibold text-gray-800 group-hover:text-[#008751]">
            Nouveau marche
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Creer une procedure de passation
          </p>
        </Link>
        <Link
          href="/reporting"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#008751] hover:shadow-sm transition group"
        >
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm font-semibold text-gray-800 group-hover:text-[#008751]">
            Rapport trimestriel
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Art. 2, Decret 2020-596
          </p>
        </Link>
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
        <div className={`${colors[couleur]} rounded-lg p-2 text-lg`}>
          {icone}
        </div>
      </div>
    </div>
  );
}
