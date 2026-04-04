"use client";

/**
 * Dialogue : Nouveau décompte (facture de travaux/services)
 * Délai de paiement : 60 jours calendaires maximum — Art. 116, Loi 2020-26
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DecompteDialogProps {
  contratId: string;
  onSuccess?: () => void;
}

export function DecompteDialog({ contratId, onSuccess }: DecompteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0]!;

  const [form, setForm] = useState({
    type: "partiel" as "partiel" | "final" | "dgd",
    montantHT: "",
    montantTTC: "",
    dateDepot: today,
  });

  // Calculate délai restant dynamically
  const delaiRestant = form.dateDepot
    ? Math.max(
        0,
        60 -
          Math.floor(
            (Date.now() - new Date(form.dateDepot).getTime()) /
              (1000 * 60 * 60 * 24)
          )
      )
    : 60;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contrats/${contratId}/decomptes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          montantHT: parseFloat(form.montantHT),
          montantTTC: parseFloat(form.montantTTC),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur serveur");
      }

      setOpen(false);
      setForm({ type: "partiel", montantHT: "", montantTTC: "", dateDepot: today });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  // Auto-calculate TTC from HT (TVA 18%)
  function handleHTChange(val: string) {
    const ht = parseFloat(val) || 0;
    const ttc = Math.round(ht * 1.18);
    setForm((f) => ({ ...f, montantHT: val, montantTTC: ttc > 0 ? String(ttc) : "" }));
  }

  const delaiColor =
    delaiRestant > 30
      ? "text-green-700 bg-green-50"
      : delaiRestant > 15
      ? "text-orange-700 bg-orange-50"
      : "text-red-700 bg-red-50";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#008751] hover:bg-[#006b3f] text-white">
          + Nouveau décompte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau décompte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Type de décompte</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, type: v as typeof form.type }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partiel">Partiel</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="dgd">DGD — Décompte Général et Définitif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Montant HT (FCFA)</Label>
              <Input
                type="number"
                value={form.montantHT}
                onChange={(e) => handleHTChange(e.target.value)}
                placeholder="ex: 10000000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Montant TTC (FCFA)</Label>
              <Input
                type="number"
                value={form.montantTTC}
                onChange={(e) =>
                  setForm((f) => ({ ...f, montantTTC: e.target.value }))
                }
                placeholder="auto TVA 18%"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date de dépôt</Label>
            <Input
              type="date"
              value={form.dateDepot}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateDepot: e.target.value }))
              }
              required
            />
          </div>

          {/* Délai paiement info — Art. 116 */}
          <div className={`rounded-lg px-3 py-2 text-sm font-medium ${delaiColor}`}>
            Délai de paiement restant : <strong>{delaiRestant} jours</strong>
            <span className="text-xs font-normal ml-1 opacity-70">
              (60j max — Art. 116, Loi 2020-26)
            </span>
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
              disabled={loading}
              className="bg-[#008751] hover:bg-[#006b3f] text-white"
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
