/**
 * Page PPM — Plan de Passation des Marches
 * Source : Art. 24 al. 1, Loi 2020-26
 * Rapport trimestriel : Art. 2, Decret 2020-596
 */

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/utils";

// Types locaux
type NatureMarche = "travaux" | "fournitures" | "services" | "pi_cabinet" | "pi_individuel";
type ModePassation = string;
type StatutLigne = "planifie" | "lance" | "solde" | "annule";

interface PPMLigneRow {
  id: string;
  reference: string;
  objet: string;
  nature: NatureMarche;
  modePassation: ModePassation;
  montantPrevisionnel: bigint;
  trimestreLancement: number;
  statut: StatutLigne;
  directionBeneficiaire: string;
  entiteNom: string | null;
  entiteCode: string | null;
}

// Helpers badge
function getNatureBadge(nature: NatureMarche): { label: string; className: string } {
  const map: Record<NatureMarche, { label: string; className: string }> = {
    travaux: { label: "Travaux", className: "bg-orange-100 text-orange-800 border-orange-200" },
    fournitures: { label: "Fournitures", className: "bg-blue-100 text-blue-800 border-blue-200" },
    services: { label: "Services", className: "bg-teal-100 text-teal-800 border-teal-200" },
    pi_cabinet: { label: "PI Cabinet", className: "bg-purple-100 text-purple-800 border-purple-200" },
    pi_individuel: { label: "PI Individuel", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  };
  return map[nature] ?? { label: nature, className: "bg-gray-100 text-gray-800" };
}

function getModeBadge(mode: ModePassation): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    aoo: { label: "AOO", className: "bg-blue-100 text-blue-800" },
    aoo_prequalification: { label: "AOO+Préqual.", className: "bg-blue-100 text-blue-800" },
    ao_deux_etapes: { label: "AO 2 étapes", className: "bg-blue-100 text-blue-800" },
    ao_concours: { label: "AO Concours", className: "bg-blue-100 text-blue-800" },
    ao_restreint: { label: "AO Restreint", className: "bg-blue-100 text-blue-800" },
    gre_a_gre: { label: "Gré à gré", className: "bg-red-100 text-red-800" },
    drp_travaux: { label: "DRP", className: "bg-orange-100 text-orange-800" },
    drp_fournitures: { label: "DRP", className: "bg-orange-100 text-orange-800" },
    drp_services: { label: "DRP", className: "bg-orange-100 text-orange-800" },
    dc: { label: "DC", className: "bg-yellow-100 text-yellow-800" },
    sfqc: { label: "SFQC", className: "bg-purple-100 text-purple-800" },
    sfq: { label: "SFQ", className: "bg-purple-100 text-purple-800" },
    scbd: { label: "SCBD", className: "bg-purple-100 text-purple-800" },
    smc: { label: "SMC", className: "bg-purple-100 text-purple-800" },
    sfqc_qualification: { label: "SfQC", className: "bg-purple-100 text-purple-800" },
    sci: { label: "SCI", className: "bg-indigo-100 text-indigo-800" },
    entente_directe_pi: { label: "Entente PI", className: "bg-red-100 text-red-800" },
  };
  return map[mode] ?? { label: mode.toUpperCase(), className: "bg-gray-100 text-gray-800" };
}

function getStatutBadge(statut: StatutLigne): { label: string; variant: "default" | "secondary" | "success" | "danger" | "warning" } {
  const map: Record<StatutLigne, { label: string; variant: "default" | "secondary" | "success" | "danger" | "warning" }> = {
    planifie: { label: "Planifié", variant: "secondary" },
    lance: { label: "Lancé", variant: "default" },
    solde: { label: "Soldé", variant: "success" },
    annule: { label: "Annulé", variant: "danger" },
  };
  return map[statut] ?? { label: statut, variant: "secondary" };
}

// Fetch data server-side — graceful fallback si DB indisponible
async function fetchPPMData(annee: number, nature?: string): Promise<PPMLigneRow[]> {
  try {
    const { db, eq, sql } = await import("@/lib/db");
    const { ppms, ppmLignes } = await import("@/lib/db/schema/ppm");
    const { entites } = await import("@/lib/db/schema/entites");

    const results = await db
      .select({
        id: ppmLignes.id,
        reference: ppmLignes.reference,
        objet: ppmLignes.objet,
        nature: ppmLignes.nature,
        modePassation: ppmLignes.modePassation,
        montantPrevisionnel: ppmLignes.montantPrevisionnel,
        trimestreLancement: ppmLignes.trimestreLancement,
        statut: ppmLignes.statut,
        directionBeneficiaire: ppmLignes.directionBeneficiaire,
        entiteNom: entites.nom,
        entiteCode: entites.code,
      })
      .from(ppmLignes)
      .innerJoin(ppms, eq(ppmLignes.ppmId, ppms.id))
      .leftJoin(entites, eq(ppms.entiteId, entites.id))
      .where(
        nature
          ? sql`${ppms.annee} = ${annee} AND ${ppmLignes.nature} = ${nature}`
          : sql`${ppms.annee} = ${annee}`
      )
      .limit(200);

    return results as PPMLigneRow[];
  } catch {
    return [];
  }
}

// Stats helpers
function computeStats(lignes: PPMLigneRow[]) {
  const total = lignes.length;
  const budget = lignes.reduce((sum, l) => sum + Number(l.montantPrevisionnel), 0);
  const parNature = lignes.reduce<Record<string, number>>((acc, l) => {
    acc[l.nature] = (acc[l.nature] ?? 0) + 1;
    return acc;
  }, {});
  return { total, budget, parNature };
}

export default async function PPMPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; nature?: string }>;
}) {
  const params = await searchParams;
  const annee = params.annee ? parseInt(params.annee, 10) : new Date().getFullYear();
  const nature = params.nature ?? "";

  const lignes = await fetchPPMData(annee, nature || undefined);
  const stats = computeStats(lignes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan de Passation des Marches</h1>
          <p className="text-sm text-gray-500 mt-1">
            Art. 24 al. 1, Loi 2020-26 · Publication sous 10 jours apres approbation du budget
          </p>
        </div>
        <Link
          href="/ppm/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006b40] transition-colors"
        >
          + Nouvelle ligne PPM
        </Link>
      </div>

      {/* Year selector + nature filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Exercice :</span>
          {[2024, 2025, 2026].map(y => (
            <Link
              key={y}
              href={`/ppm?annee=${y}${nature ? `&nature=${nature}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                y === annee
                  ? "bg-[#008751] text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Nature :</span>
          {["", "travaux", "fournitures", "services", "pi_cabinet", "pi_individuel"].map(n => (
            <Link
              key={n}
              href={`/ppm?annee=${annee}${n ? `&nature=${n}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (n === "" ? !nature : nature === n)
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {n === "" ? "Tous" : n === "pi_cabinet" ? "PI Cabinet" : n === "pi_individuel" ? "PI Individuel" : n.charAt(0).toUpperCase() + n.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Total lignes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Budget previsionnel</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {stats.budget > 0 ? formatFCFA(stats.budget) : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2">
          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Repartition par nature</p>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.parNature).map(([n, count]) => {
              const badge = getNatureBadge(n as NatureMarche);
              return (
                <span key={n} className={`text-xs px-2 py-0.5 rounded-full border ${badge.className}`}>
                  {badge.label} ({count})
                </span>
              );
            })}
            {Object.keys(stats.parNature).length === 0 && (
              <span className="text-xs text-gray-400">Aucune donnee</span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {lignes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-600 font-medium">Aucune ligne PPM pour {annee}</p>
            <p className="text-gray-400 text-sm mt-1">
              Cliquez sur "Nouvelle ligne PPM" pour commencer la planification
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ref.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Objet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nature</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Montant HT</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trim.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lignes.map((ligne) => {
                  const natureBadge = getNatureBadge(ligne.nature);
                  const modeBadge = getModeBadge(ligne.modePassation);
                  const statutBadge = getStatutBadge(ligne.statut);
                  return (
                    <tr key={ligne.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{ligne.reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 max-w-xs truncate">{ligne.objet}</div>
                        <div className="text-xs text-gray-400">{ligne.directionBeneficiaire}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${natureBadge.className}`}>
                          {natureBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${modeBadge.className}`}>
                          {modeBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatFCFA(ligne.montantPrevisionnel)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          T{ligne.trimestreLancement}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statutBadge.variant}>{statutBadge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
