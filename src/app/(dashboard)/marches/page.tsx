/**
 * Page Marches — Liste des marches publics
 * Source : Loi 2020-26 Art. 2-4, Art. 54, Art. 79, Art. 86-87
 */

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/utils";

type StatutProcedure =
  | "planifie" | "preparation" | "lance" | "evaluation"
  | "attribution_provisoire" | "standstill" | "recours" | "contractualisation"
  | "approuve" | "authentifie" | "enregistre" | "notifie" | "en_vigueur"
  | "execution" | "reception_provisoire" | "reception_definitive"
  | "solde" | "suspendu" | "annule";

interface MarcheRow {
  id: string;
  reference: string;
  objet: string;
  nature: string;
  modePassation: string;
  montantEstime: bigint;
  montantContractuel: bigint | null;
  statut: StatutProcedure;
  organeControle: string;
  exercice: number;
  directionBeneficiaire: string;
  dateLancement: string | null;
  dateAttributionProvisoire: string | null;
  dateEntreeVigueur: string | null;
  createdAt: Date;
  entiteNom: string | null;
  entiteCode: string | null;
}

function getStatutConfig(statut: StatutProcedure): {
  label: string;
  variant: "default" | "secondary" | "success" | "warning" | "danger" | "info";
  className: string;
} {
  const map: Record<StatutProcedure, { label: string; variant: "default" | "secondary" | "success" | "warning" | "danger" | "info"; className: string }> = {
    planifie: { label: "Planifié", variant: "secondary", className: "bg-gray-100 text-gray-700" },
    preparation: { label: "Préparation", variant: "info", className: "bg-blue-100 text-blue-700" },
    lance: { label: "Lancé", variant: "info", className: "bg-blue-100 text-blue-700" },
    evaluation: { label: "Évaluation", variant: "warning", className: "bg-orange-100 text-orange-700" },
    attribution_provisoire: { label: "Attribution prov.", variant: "warning", className: "bg-yellow-100 text-yellow-700" },
    standstill: { label: "Standstill", variant: "warning", className: "bg-yellow-100 text-yellow-700" },
    recours: { label: "Recours", variant: "danger", className: "bg-red-100 text-red-700" },
    contractualisation: { label: "Contractualisation", variant: "default", className: "bg-purple-100 text-purple-700" },
    approuve: { label: "Approuvé", variant: "default", className: "bg-purple-100 text-purple-700" },
    authentifie: { label: "Authentifié", variant: "default", className: "bg-purple-100 text-purple-700" },
    enregistre: { label: "Enregistré", variant: "default", className: "bg-purple-100 text-purple-700" },
    notifie: { label: "Notifié", variant: "success", className: "bg-green-100 text-green-700" },
    en_vigueur: { label: "En vigueur", variant: "success", className: "bg-green-100 text-green-700" },
    execution: { label: "Exécution", variant: "success", className: "bg-teal-100 text-teal-700" },
    reception_provisoire: { label: "Récep. prov.", variant: "success", className: "bg-green-100 text-green-700" },
    reception_definitive: { label: "Récep. déf.", variant: "success", className: "bg-green-100 text-green-700" },
    solde: { label: "Soldé", variant: "secondary", className: "bg-gray-100 text-gray-500" },
    suspendu: { label: "Suspendu", variant: "danger", className: "bg-red-100 text-red-700" },
    annule: { label: "Annulé", variant: "danger", className: "bg-red-100 text-red-500" },
  };
  return map[statut] ?? { label: statut, variant: "secondary", className: "bg-gray-100 text-gray-700" };
}

function getModeLabel(mode: string): string {
  const map: Record<string, string> = {
    aoo: "AOO", aoo_prequalification: "AOO+P", ao_deux_etapes: "AO 2E",
    ao_concours: "Concours", ao_restreint: "AOR", gre_a_gre: "Gré à gré",
    drp_travaux: "DRP", drp_fournitures: "DRP", drp_services: "DRP",
    dc: "DC", sfqc: "SFQC", sfq: "SFQ", scbd: "SCBD", smc: "SMC",
    sfqc_qualification: "SfQC", sci: "SCI", entente_directe_pi: "Entente PI",
  };
  return map[mode] ?? mode.toUpperCase();
}

async function fetchMarches(statut?: string, nature?: string, search?: string): Promise<MarcheRow[]> {
  try {
    const { db, eq, and, desc, sql } = await import("@/lib/db");
    const { marches } = await import("@/lib/db/schema/marches");
    const { entites } = await import("@/lib/db/schema/entites");

    const conditions = [];
    if (statut) conditions.push(sql`${marches.statut} = ${statut}`);
    if (nature) conditions.push(sql`${marches.nature} = ${nature}`);
    if (search) {
      conditions.push(
        sql`(${marches.reference} ILIKE ${"%" + search + "%"} OR ${marches.objet} ILIKE ${"%" + search + "%"})`
      );
    }

    const results = await db
      .select({
        id: marches.id,
        reference: marches.reference,
        objet: marches.objet,
        nature: marches.nature,
        modePassation: marches.modePassation,
        montantEstime: marches.montantEstime,
        montantContractuel: marches.montantContractuel,
        statut: marches.statut,
        organeControle: marches.organeControle,
        exercice: marches.exercice,
        directionBeneficiaire: marches.directionBeneficiaire,
        dateLancement: marches.dateLancement,
        dateAttributionProvisoire: marches.dateAttributionProvisoire,
        dateEntreeVigueur: marches.dateEntreeVigueur,
        createdAt: marches.createdAt,
        entiteNom: entites.nom,
        entiteCode: entites.code,
      })
      .from(marches)
      .leftJoin(entites, eq(marches.entiteId, entites.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(marches.createdAt))
      .limit(100);

    return results as MarcheRow[];
  } catch {
    return [];
  }
}

export default async function MarchesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; nature?: string; search?: string }>;
}) {
  const params = await searchParams;
  const marches = await fetchMarches(params.statut, params.nature, params.search);

  const statutOptions = [
    { value: "", label: "Tous les statuts" },
    { value: "planifie", label: "Planifié" },
    { value: "preparation", label: "Préparation" },
    { value: "lance", label: "Lancé" },
    { value: "evaluation", label: "Évaluation" },
    { value: "attribution_provisoire", label: "Attribution prov." },
    { value: "contractualisation", label: "Contractualisation" },
    { value: "en_vigueur", label: "En vigueur" },
    { value: "execution", label: "Exécution" },
    { value: "solde", label: "Soldé" },
    { value: "annule", label: "Annulé" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marches Publics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion du cycle complet de passation · Loi 2020-26
          </p>
        </div>
        <Link
          href="/marches/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#008751] text-white text-sm font-medium rounded-lg hover:bg-[#006b40] transition-colors"
        >
          + Nouveau marche
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form className="flex gap-3 flex-wrap">
          <input
            type="text"
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Rechercher par reference ou objet..."
            className="flex-1 min-w-48 h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#008751]"
          />
          <select
            name="statut"
            defaultValue={params.statut ?? ""}
            className="h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#008751]"
          >
            {statutOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            name="nature"
            defaultValue={params.nature ?? ""}
            className="h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#008751]"
          >
            <option value="">Toutes natures</option>
            <option value="travaux">Travaux</option>
            <option value="fournitures">Fournitures</option>
            <option value="services">Services</option>
            <option value="pi_cabinet">PI Cabinet</option>
            <option value="pi_individuel">PI Individuel</option>
          </select>
          <button
            type="submit"
            className="h-9 px-4 bg-[#008751] text-white text-sm rounded-md hover:bg-[#006b40] transition-colors"
          >
            Filtrer
          </button>
          {(params.statut || params.nature || params.search) && (
            <Link
              href="/marches"
              className="h-9 px-4 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition-colors flex items-center"
            >
              Effacer
            </Link>
          )}
        </form>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {marches.length} marche{marches.length > 1 ? "s" : ""} trouv{marches.length > 1 ? "es" : "e"}
      </p>

      {/* List */}
      {marches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-gray-600 font-medium">Aucun marche trouve</p>
          <p className="text-gray-400 text-sm mt-1">
            Creez votre premier marche ou modifiez les filtres
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {marches.map((marche) => {
            const statutConfig = getStatutConfig(marche.statut);
            return (
              <Link
                key={marche.id}
                href={`/marches/${marche.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-[#008751] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {marche.reference}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutConfig.className}`}
                      >
                        {statutConfig.label}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {getModeLabel(marche.modePassation)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {marche.organeControle.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 mt-1.5 truncate">{marche.objet}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {marche.entiteCode ?? ""} · {marche.directionBeneficiaire}
                      </span>
                      <span className="text-xs text-gray-400">Ex. {marche.exercice}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">
                      {formatFCFA(marche.montantEstime)}
                    </p>
                    {marche.montantContractuel && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Contractuel : {formatFCFA(marche.montantContractuel)}
                      </p>
                    )}
                    {marche.dateLancement && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Lance le {new Date(marche.dateLancement).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
