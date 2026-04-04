"use client"

import dynamic from "next/dynamic"

const AIPanel = dynamic(
  () => import("@/components/ai-panel").then(m => m.AIPanel),
  {
    ssr: false,
    loading: () => (
      <div className="w-80 flex-shrink-0 border-l bg-white flex flex-col h-screen">
        <div className="bg-[#008751] text-white p-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
          <span className="text-sm font-semibold">Conseiller IA</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
            <div className="text-3xl">⚖️</div>
            <p className="text-sm text-gray-500">Chargement...</p>
          </div>
        </div>
      </div>
    ),
  }
)

export function AIPanelClient() {
  return <AIPanel />
}
