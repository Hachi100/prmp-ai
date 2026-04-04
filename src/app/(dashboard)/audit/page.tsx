/**
 * Page : Piste d'audit immutable
 * Source : Art. archivage, Loi 2020-26 (10 ans minimum)
 * Table APPEND-ONLY — aucun DELETE ni UPDATE en production
 */

import { db, desc } from "@/lib/db";
import { auditTrail } from "@/lib/db/schema/audit";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const actionConfig = {
  insert: { variant: "success" as const, label: "INSERT" },
  update: { variant: "info" as const, label: "UPDATE" },
  delete: { variant: "danger" as const, label: "DELETE" },
};

export default async function AuditPage() {
  let entries: typeof auditTrail.$inferSelect[] = [];

  try {
    entries = await db
      .select()
      .from(auditTrail)
      .orderBy(desc(auditTrail.changedAt))
      .limit(100);
  } catch {
    // empty state
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Piste d&apos;audit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Journal immutable de toutes les modifications — archivage 10 ans (Art. Loi 2020-26)
        </p>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
        <span className="text-amber-600">🔒</span>
        <p className="text-sm text-amber-800">
          Cette table est <strong>APPEND-ONLY</strong>. Aucune modification ni suppression n&apos;est autorisée.
          Toutes les actions sont tracées par triggers PostgreSQL.
        </p>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium text-gray-600">Aucune entrée d&apos;audit</p>
            <p className="text-sm mt-1">Les modifications sur les tables principales apparaissent ici</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date / Heure</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Table</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Enregistrement</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => {
                const cfg = actionConfig[entry.action] ?? actionConfig.update;
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(entry.changedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{entry.tableName}</code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {entry.recordId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {entry.ipAddress ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
