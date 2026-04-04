/**
 * Page : Détail d'un contrat
 * Source : Art. 84-87, 113-116, Loi 2020-26
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { db, eq } from "@/lib/db";
import { contrats, ordresServices, avenants } from "@/lib/db/schema/contrats";
import { decomptes, penalites, receptions } from "@/lib/db/schema/execution";
import { marches } from "@/lib/db/schema/marches";
import { ContratTabs } from "@/components/contrat/contrat-tabs";
import { formatMontant, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function ContratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let contrat;
  let marche;
  let osList: typeof ordresServices.$inferSelect[] = [];
  let decomptesList: typeof decomptes.$inferSelect[] = [];
  let penalitesList: typeof penalites.$inferSelect[] = [];
  let avenantsList: typeof avenants.$inferSelect[] = [];
  let receptionsList: typeof receptions.$inferSelect[] = [];

  try {
    const rows = await db
      .select()
      .from(contrats)
      .leftJoin(marches, eq(contrats.marcheId, marches.id))
      .where(eq(contrats.id, id))
      .limit(1);

    if (!rows.length || !rows[0]) notFound();
    contrat = rows[0].contrats;
    marche = rows[0].marches;

    [osList, decomptesList, penalitesList, avenantsList, receptionsList] = await Promise.all([
      db.select().from(ordresServices).where(eq(ordresServices.contratId, id)),
      db.select().from(decomptes).where(eq(decomptes.contratId, id)),
      db.select().from(penalites).where(eq(penalites.contratId, id)),
      db.select().from(avenants).where(eq(avenants.contratId, id)),
      db.select().from(receptions).where(eq(receptions.contratId, id)),
    ]);
  } catch {
    notFound();
  }

  if (!contrat) notFound();

  // Cumul avenants pour la barre de progression
  const lastAvenant = avenantsList[avenantsList.length - 1];
  const pctCumuleAvenants = lastAvenant ? Number(lastAvenant.pctCumule) : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link href="/contrats" className="hover:text-[#008751]">Contrats</Link>
        <span>›</span>
        <span className="text-gray-900">{contrat.numeroMarche ?? marche?.reference ?? id.slice(0, 8)}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {contrat.numeroMarche ?? "Contrat sans numéro"}
              </h1>
              <Badge variant="success">En vigueur</Badge>
            </div>
            <p className="text-gray-600">{marche?.objet ?? "—"}</p>
            <p className="text-sm text-gray-500 mt-1">Marché : {marche?.reference ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Montant TTC</p>
            <p className="text-2xl font-bold text-[#008751]">{formatMontant(Number(contrat.montantTTC))}</p>
            <p className="text-xs text-gray-500">HT : {formatMontant(Number(contrat.montantHT))}</p>
          </div>
        </div>

        {/* Key dates */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
          {[
            { label: "Entrée en vigueur", value: contrat.dateEntreeVigueur ? formatDate(contrat.dateEntreeVigueur) : "—" },
            { label: "Fin prévisionnelle", value: contrat.dateFinPrevisionnelle ? formatDate(contrat.dateFinPrevisionnelle) : "—" },
            { label: "Garantie exécution", value: contrat.garantieExecutionPct ? `${contrat.garantieExecutionPct}%` : "5%" },
            { label: "Avenants cumulés", value: `${pctCumuleAvenants.toFixed(1)}% / 30%` },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="font-medium text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5 tabs */}
      <ContratTabs
        contratId={id}
        montantTTC={Number(contrat.montantTTC)}
        montantHT={Number(contrat.montantHT)}
        ordresServices={osList.map(o => ({
          id: o.id,
          numero: o.numero,
          type: o.type,
          dateEmission: o.dateEmission,
          dateNotification: o.dateNotification ?? null,
          observations: o.observations ?? null,
        }))}
        decomptes={decomptesList.map(d => ({
          id: d.id,
          numero: d.numero,
          type: d.type,
          montantHT: Number(d.montantHT),
          montantTTC: Number(d.montantTTC),
          dateDepot: d.dateDepot,
          datePaiement: d.datePaiement ?? null,
          statut: d.statut,
          delaiPaiementRestant: d.delaiPaiementRestant ?? null,
        }))}
        penalites={penalitesList.map(p => ({
          id: p.id,
          joursRetard: p.joursRetard,
          montantPenalite: Number(p.montantPenalite),
          montantCumule: Number(p.montantCumule),
          plafond10pct: Number(p.plafond10pct),
          dateDebutRetard: p.dateDebutRetard,
          isResiliationDeclenchee: p.isResiliationDeclenchee,
        }))}
        avenants={avenantsList.map(a => ({
          id: a.id,
          numero: a.numero,
          objet: a.objet,
          montantInitial: Number(a.montantInitial),
          montantAvenant: Number(a.montantAvenant),
          nouveauMontant: Number(a.nouveauMontant),
          pctCumule: String(a.pctCumule),
          dateSignature: a.dateSignature ?? null,
          motifJuridique: a.motifJuridique,
        }))}
        receptions={receptionsList.map(r => ({
          id: r.id,
          type: r.type,
          dateDemande: r.dateDemande,
          dateReception: r.dateReception ?? null,
          reserves: r.reserves ?? null,
          leveeReservesDate: r.leveeReservesDate ?? null,
        }))}
      />
    </div>
  );
}
