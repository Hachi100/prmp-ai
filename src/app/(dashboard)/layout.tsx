/**
 * Layout protege du dashboard PRMP-Pro
 * Sidebar navigation + panneau IA lateral
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PRMP-Pro — Dashboard",
};

const navItems = [
  { href: "/", label: "Tableau de bord", icon: "🏠" },
  { href: "/ppm", label: "Plan PPM", icon: "📋" },
  { href: "/marches", label: "Marches", icon: "📁" },
  { href: "/dao", label: "Dossiers DAO", icon: "📄" },
  { href: "/evaluation", label: "Evaluation", icon: "⚖️" },
  { href: "/contrats", label: "Contrats", icon: "📝" },
  { href: "/reporting", label: "Reporting", icon: "📊" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-12 rounded overflow-hidden border border-gray-200">
              <div className="flex-1 bg-[#008751]" />
              <div className="flex-1 flex flex-col">
                <div className="flex-1 bg-[#FCD116]" />
                <div className="flex-1 bg-[#E8112D]" />
              </div>
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">PRMP-Pro</p>
              <p className="text-xs text-gray-500">Benin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 space-y-1">
            <p>Loi 2020-26 • Marches publics</p>
            <p>Republique du Benin</p>
          </div>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contenu */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header top */}
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-500">Systeme actif</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
                <span className="text-lg">🔔</span>
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              </button>
              {/* User */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                <div className="h-6 w-6 rounded-full bg-[#008751] flex items-center justify-center text-white text-xs font-bold">
                  P
                </div>
                <span className="text-sm font-medium text-gray-700">PRMP</span>
              </div>
            </div>
          </header>

          {children}
        </main>

        {/* Panneau IA — import dynamique pour eviter l'hydration mismatch */}
        <AIPanelWrapper />
      </div>
    </div>
  );
}

/**
 * Wrapper pour le panneau IA (client component)
 * Le panneau IA est importe dynamiquement pour le rendering cote client
 */
function AIPanelWrapper() {
  return (
    <aside className="w-96 border-l border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-sm font-semibold text-gray-700">Conseiller IA</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Claude</span>
      </div>
      {/* Le panneau IA reel est charge cote client depuis les pages */}
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="text-4xl">⚖️</div>
          <p className="text-sm font-medium text-gray-700">Conseiller IA PRMP-Pro</p>
          <p className="text-xs text-gray-500">
            Posez vos questions sur les marches publics. Je cite toujours les articles de loi.
          </p>
          <p className="text-xs text-gray-400 italic">
            Loi 2020-26 • Decrets 2020-595 a 605 • Manuel ARMP
          </p>
        </div>
      </div>
    </aside>
  );
}
