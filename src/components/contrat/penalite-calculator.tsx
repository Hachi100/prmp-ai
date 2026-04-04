"use client";

/**
 * Calculateur de pénalités de retard
 * Formule : pénalité = montantTTC × taux_journalier × jours_retard
 * Taux par défaut : 1/2000 — Art. 114, Loi 2020-26
 * Plafond : 10% du montant TTC — Art. 114, Loi 2020-26
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatMontant } from "@/lib/utils";

interface PenaliteCalculatorProps {
  contratId: string;
  montantTTC: number;
  onSuccess?: () => void;
}

const TAUX_DEFAULT = 1 / 2000; // Art. 114, Loi 2020-26
const PLAFOND_PCT = 0.10;

export function PenaliteCalculator({
  contratId,
  montantTTC,
  onSuccess,
}: PenaliteCalculatorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    dateDebutRetard: "",
    joursRetard: "",
    tauxJournalier: String(TAUX_DEFAULT),
    penaliteCumuleeAvant: "0",
  });

  const joursRetard = parseInt(form.joursRetard) || 0;
  const taux = parseFloat(form.tauxJournalier) || TAUX_DEFAULT;
  const cumulAvant = parseFloat(form.penaliteCumuleeAvant) || 0;

  const montantPenalite = Math.round(montantTTC * taux * joursRetard);
  const montantCumule = cumulAvant + montantPenalite;
  const plafond = Math.round(montantTTC * PLAFOND_PCT);
  const pctPlafond = plafond > 0 ? (montantCumule / plafond) * 100 : 0;
  const declenche = montantCumule >= plafond;

  const couleur =
    pctPlafond < 50
      ? "text-green-700 bg-green-50"
      : pctPlafond < 80
      ? "text-orange-700 bg-orange-50"
      : "text-red-700 bg-red-50";

  const barColor =
    pctPlafond < 50
      ? "bg-green-500"
      : pctPlafond < 80
      ? "bg-orange-500"
      : "bg-red-500";

  async function handleSave() {
    if (!form.dateDebutRetard || joursRetard <= 0) return;
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/contrats/${contratId}/penalites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateDebutRetard: form.dateDebutRetard,
          joursRetard,
          tauxJournalier: taux,
          penaliteCumuleeAvant: cumulAvant,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur serveur");
      }

      setSaved(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Formule */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 font-mono text-sm">
        <p className="text-gray-500 text-xs mb-1">Formule (Art. 113-114, Loi 2020-26)</p>
        <p className="text-gray-800">
          Pénalité = Montant TTC × taux_journalier × jours_retard
        </p>
        <p className="text-gray-800 mt-0.5">
          Plafond = 10% × {formatMontant(montantTTC)} = {formatMontant(plafond)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Date début retard</Label>
          <Input
            type="date"
            value={form.dateDebutRetard}
            onChange={(e) =>
              setForm((f) => ({ ...f, dateDebutRetard: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Jours de retard</Label>
          <Input
            type="number"
            min="1"
            value={form.joursRetard}
            onChange={(e) =>
              setForm((f) => ({ ...f, joursRetard: e.target.value }))
            }
            placeholder="ex: 15"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Taux journalier (défaut 1/2000)</Label>
          <Input
            type="number"
            step="0.0001"
            value={form.tauxJournalier}
            onChange={(e) =>
              setForm((f) => ({ ...f, tauxJournalier: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Pénalités cumulées avant</Label>
          <Input
            type="number"
            value={form.penaliteCumuleeAvant}
            onChange={(e) =>
              setForm((f) => ({ ...f, penaliteCumuleeAvant: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Résultat calculé */}
      {joursRetard > 0 && (
        <div className={`rounded-lg p-4 space-y-2 ${couleur}`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Pénalité calculée</span>
            <span className="font-bold">{formatMontant(montantPenalite)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Cumul total</span>
            <span className="font-semibold">{formatMontant(montantCumule)}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progression vers plafond 10%</span>
              <span>{pctPlafond.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${barColor}`}
                style={{ width: `${Math.min(100, pctPlafond)}%` }}
              />
            </div>
          </div>
          {declenche && (
            <div className="text-sm font-bold border border-current rounded px-2 py-1 mt-2">
              RÉSILIATION DE PLEIN DROIT déclenchée — Art. 114, Loi 2020-26
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
          Pénalité enregistrée avec succès.
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={loading || !form.dateDebutRetard || joursRetard <= 0}
        className="bg-[#008751] hover:bg-[#006b3f] text-white"
      >
        {loading ? "Enregistrement..." : "Enregistrer la pénalité"}
      </Button>
    </div>
  );
}
