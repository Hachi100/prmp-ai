"use client";

import { useState } from "react";

export function AlertesActions({ alerteId }: { alerteId: string }) {
  const [done, setDone] = useState(false);

  async function markAsRead() {
    await fetch(`/api/alertes/${alerteId}`, { method: "PATCH" });
    setDone(true);
  }

  if (done) return <span className="text-xs text-gray-400">Lu</span>;

  return (
    <button
      onClick={markAsRead}
      className="text-xs text-gray-500 border rounded px-2 py-1 hover:bg-gray-100 transition-colors whitespace-nowrap"
    >
      Marquer lu
    </button>
  );
}
