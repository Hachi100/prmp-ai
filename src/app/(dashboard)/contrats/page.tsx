/**
 * Page : Liste des Contrats en execution
 * Source : Art. 84-87, Loi 2020-26 ; Art. 113-116, Loi 2020-26
 */

import Link from "next/link";
import { db, desc } from "@/lib/db";
import { contrats } from "@/lib/db/schema/contrats";
import { marches } from "@/lib/db/schema/marches";
import { decomptes, penalites } from "@/lib/db/schema/execution";
import { eq, count, sum } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { formatMontant, formatDate } from "@/lib/utils";

function getDelaiPaiementAlert(jours: number): { color: string; label: string } {
  if (jours < 0) return { color: "danger", label: `${Math.abs(jours)}j dépassé` };
  if (jours <= 15) return { color: "danger", label: `${jours}j restants` };
  if (jours <= 30) return { color: "warning", label: `${jours}j restants` };
  return { color: "success", label: `${jours}j restants` };
}

export default async function ContratsPage() {
  let contratsData: Array<{
    id: string;
    numeroMarche: string | null;
    montantTTC: bigint;
    montantHT: bigint;
    dateEntreeVigueur: string | null;
    dateFinPrevisionnelle: string | null;
    marcheRef: string;
    marcheObjet: string;
    nbDecomptes: number;
    montantPaye: bigint | null;
    hasPenaliteResiliation: boolean;
  }> = [];

  try {
    const rows = await db
      .select({
        id: contrats.id,
        numeroMarche: contrats.numeroMarche,
        montantTTC: contrats.montantTTC,
        montantHT: contrats.montantHT,
        dateEntreeVigueur: contrats.dateEntreeVigueur,
        dateFinPrevisionnelle: contrats.dateFinPrevisionnelle,
        marcheRef: marches.reference,
        marcheObjet: marches.objet,
      })
      .from(contrats)
      .leftJoin(marches, eq(contrats.marcheId, marches.id))
      .orderBy(desc(contrats.createdAt))
      .limit(50);

    contratsData = rows.map(r => ({
      ...r,
      marcheRef: r.marcheRef ?? "—",
      marcheObjet: r.marcheObjet ?? "—",
      nbDecomptes: 0,
      montantPaye: null,
      hasPenaliteResiliation: false,
    }));
  } catch {
    // DB not accessible — show empty state
  }

  // Stats
  const totalContrats = contratsData.length;
  const montantTotal = contratsData.reduce((s, c) => s + Number(c.montantTTC), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats en exécution</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des contrats actifs — délais, décomptes, pénalités
          </p>
        </div>
        <Link
          href="/contrats/nouveau"
          className="bg-[#008751] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#006b40] transition-colors"
        >
          + Nouveau contrat
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Contrats actifs", value: totalContrats, color: "text-green-700" },
          { label: "Montant total engagé", value: formatMontant(montantTotal), color: "text-blue-700" },
          { label: "Décomptes en attente", value: "—", color: "text-orange-700" },
          { label: "Pénalités déclenchées", value: "0", color: "text-red-700" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {contratsData.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-medium text-gray-600">Aucun contrat en cours</p>
            <p className="text-sm mt-1">Les contrats apparaissent ici après attribution et signature</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Marché</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">N° Contrat</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Montant TTC</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Entrée en vigueur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fin prév.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Délai paiement</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contratsData.map((c) => {
                // Calculate remaining payment deadline (60j — Art. 116 Loi 2020-26)
                const joursRestants = 60; // Placeholder — real calc needs last decompte date
                const alert = getDelaiPaiementAlert(joursRestants);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.marcheRef}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{c.marcheObjet}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.numeroMarche ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMontant(Number(c.montantTTC))}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.dateEntreeVigueur ? formatDate(c.dateEntreeVigueur) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.dateFinPrevisionnelle ? formatDate(c.dateFinPrevisionnelle) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={alert.color as "success" | "warning" | "danger"}>
                        {alert.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/contrats/${c.id}`}
                        className="text-[#008751] hover:underline font-medium"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legal note */}
      <p className="text-xs text-gray-400">
        * Délai de paiement : 60 jours calendaires maximum — Art. 116, Loi 2020-26.
        Pénalités de retard : taux 1/2000, plafond 10% TTC — Art. 113-114, Loi 2020-26.
      </p>
    </div>
  );
}
