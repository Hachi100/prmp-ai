"use client";

/**
 * Dialogue : Nouvel avenant au contrat
 * Plafond cumulé : 30% du montant initial — Art. 84, Loi 2020-26
 * BLOQUANT si dépassement du plafond
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMontant } from "@/lib/utils";

interface AvenantDialogProps {
  contratId: string;
  montantInitial: number;
  montantCumulAvenants: number;
  onSuccess?: () => void;
}

const PLAFOND_PCT = 0.30; // Art. 84, Loi 2020-26

export function AvenantDialog({
  contratId,
  montantInitial,
  montantCumulAvenants,
  onSuccess,
}: AvenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    objet: "",
    montantAvenant: "",
    motifJuridique: "urgence" as "urgence" | "travaux_imprévus" | "erreur_technique" | "autres",
    dateSignature: "",
  });

  const montantAvenantNum = parseFloat(form.montantAvenant) || 0;
  const nouveauCumul = montantCumulAvenants + montantAvenantNum;
  const pctCumule = montantInitial > 0 ? (nouveauCumul / montantInitial) * 100 : 0;
  const montantMaxAutorise = montantInitial * PLAFOND_PCT;
  const depassePlafond = nouveauCumul > montantMaxAutorise;

  const pctColor =
    pctCumule <= 20
      ? "bg-green-500"
      : pctCumule <= 28
      ? "bg-orange-500"
      : "bg-red-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (depassePlafond) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contrats/${contratId}/avenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          montantAvenant: montantAvenantNum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Erreur serveur");
      }

      setOpen(false);
      setForm({ objet: "", montantAvenant: "", motifJuridique: "urgence", dateSignature: "" });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          + Nouvel avenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel avenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Progress bar plafond */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Avenants cumulés / Plafond 30% (Art. 84)</span>
              <span className={depassePlafond ? "text-red-600 font-bold" : ""}>
                {pctCumule.toFixed(1)}% / 30%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${pctColor}`}
                style={{ width: `${Math.min(100, (pctCumule / 30) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              Montant max autorisé : {formatMontant(montantMaxAutorise)} HT
            </div>
          </div>

          {depassePlafond && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg px-4 py-3">
              <p className="text-sm font-bold text-red-700">
                BLOQUANT — Plafond 30% dépassé
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Art. 84, Loi 2020-26 — Le cumul des avenants ne peut excéder 30% du montant initial.
                Nouveau cumul : {pctCumule.toFixed(1)}%
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Objet de l&apos;avenant</Label>
            <Textarea
              value={form.objet}
              onChange={(e) => setForm((f) => ({ ...f, objet: e.target.value }))}
              placeholder="Décrivez les modifications apportées par cet avenant..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Montant de l&apos;avenant (FCFA HT)</Label>
            <Input
              type="number"
              value={form.montantAvenant}
              onChange={(e) =>
                setForm((f) => ({ ...f, montantAvenant: e.target.value }))
              }
              placeholder="Positif = augmentation, négatif = diminution"
              required
            />
            {montantAvenantNum !== 0 && (
              <p className="text-xs text-gray-500">
                Nouveau montant contrat : {formatMontant(montantInitial + nouveauCumul)} HT
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Motif juridique</Label>
            <Select
              value={form.motifJuridique}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, motifJuridique: v as typeof form.motifJuridique }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgence">Urgence</SelectItem>
                <SelectItem value="travaux_imprévus">Travaux imprévus</SelectItem>
                <SelectItem value="erreur_technique">Erreur technique</SelectItem>
                <SelectItem value="autres">Autres</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Date de signature</Label>
            <Input
              type="date"
              value={form.dateSignature}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateSignature: e.target.value }))
              }
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || depassePlafond}
              className="bg-[#008751] hover:bg-[#006b3f] text-white disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
