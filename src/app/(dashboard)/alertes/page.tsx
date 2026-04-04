/**
 * Page : Gestion des Alertes
 * Alertes BLOQUANT / AVERTISSEMENT / SUGGESTION générées par le système
 */

import { db, desc, eq } from "@/lib/db";
import { alertes } from "@/lib/db/schema/audit";
import { marches } from "@/lib/db/schema/marches";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { AlertesActions } from "@/components/alertes-actions";

const severiteConfig = {
  bloquant: { variant: "danger" as const, icon: "🔴", label: "BLOQUANT" },
  avertissement: { variant: "warning" as const, icon: "🟡", label: "AVERTISSEMENT" },
  suggestion: { variant: "info" as const, icon: "🔵", label: "SUGGESTION" },
};

const typeAlerteLabels: Record<string, string> = {
  delai_depassement: "Délai dépassé",
  fragmentation: "Fractionnement détecté",
  oab: "Offre anormalement basse",
  penalite_plafond: "Plafond pénalités approché",
  recours_urgent: "Recours urgent",
  ppm_retard: "PPM en retard",
  gre_a_gre_cumul: "Cumul gré à gré",
};

export default async function AlertesPage() {
  let alertesData: Array<{
    id: string;
    typeAlerte: string;
    severite: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    marcheRef: string | null;
  }> = [];

  try {
    const rows = await db
      .select({
        id: alertes.id,
        typeAlerte: alertes.typeAlerte,
        severite: alertes.severite,
        message: alertes.message,
        isRead: alertes.isRead,
        createdAt: alertes.createdAt,
        marcheRef: marches.reference,
      })
      .from(alertes)
      .leftJoin(marches, eq(alertes.marcheId, marches.id))
      .orderBy(desc(alertes.createdAt))
      .limit(100);

    alertesData = rows;
  } catch {
    // empty state
  }

  const nonLues = alertesData.filter(a => !a.isRead).length;
  const bloquantes = alertesData.filter(a => a.severite === "bloquant").length;
  const avertissements = alertesData.filter(a => a.severite === "avertissement").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertes système</h1>
        <p className="text-sm text-gray-500 mt-1">
          Alertes de conformité et risques juridiques détectés
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">Non lues</p>
          <p className="text-2xl font-bold text-gray-900">{nonLues}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">Bloquantes</p>
          <p className="text-2xl font-bold text-red-600">{bloquantes}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">Avertissements</p>
          <p className="text-2xl font-bold text-orange-600">{avertissements}</p>
        </div>
      </div>

      {/* Alerts list */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {alertesData.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-medium text-gray-600">Aucune alerte active</p>
            <p className="text-sm mt-1">Le système surveille automatiquement les délais et risques</p>
          </div>
        ) : (
          <div className="divide-y">
            {alertesData.map((alerte) => {
              const cfg = severiteConfig[alerte.severite as keyof typeof severiteConfig] ?? severiteConfig.suggestion;
              return (
                <div key={alerte.id} className={`flex items-start gap-4 p-4 ${!alerte.isRead ? "bg-amber-50" : ""}`}>
                  <span className="text-xl mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <span className="text-xs text-gray-500">
                        {typeAlerteLabels[alerte.typeAlerte] ?? alerte.typeAlerte}
                      </span>
                      {alerte.marcheRef && (
                        <span className="text-xs font-medium text-[#008751]">{alerte.marcheRef}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800">{alerte.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(alerte.createdAt)}</p>
                  </div>
                  {!alerte.isRead && (
                    <AlertesActions alerteId={alerte.id} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
