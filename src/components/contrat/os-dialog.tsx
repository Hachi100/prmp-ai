"use client";

/**
 * Dialogue : Émettre un Ordre de Service
 * L'OS de démarrage déclenche le délai d'exécution du contrat
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

interface OSDialogProps {
  contratId: string;
  onSuccess?: () => void;
}

export function OSDialog({ contratId, onSuccess }: OSDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "demarrage" as "demarrage" | "arret" | "reprise" | "cloture",
    dateEmission: new Date().toISOString().split("T")[0]!,
    observations: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contrats/${contratId}/os`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur serveur");
      }

      setOpen(false);
      setForm({ type: "demarrage", dateEmission: new Date().toISOString().split("T")[0]!, observations: "" });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const typeLabels = {
    demarrage: "Démarrage — déclenche le délai d'exécution",
    arret: "Arrêt des travaux",
    reprise: "Reprise des travaux",
    cloture: "Clôture du contrat",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#008751] hover:bg-[#006b3f] text-white">
          + Émettre un OS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Émettre un Ordre de Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Type d&apos;OS</Label>
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
                {Object.entries(typeLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Date d&apos;émission</Label>
            <Input
              type="date"
              value={form.dateEmission}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateEmission: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observations</Label>
            <Textarea
              value={form.observations}
              onChange={(e) =>
                setForm((f) => ({ ...f, observations: e.target.value }))
              }
              placeholder="Observations et instructions..."
              rows={3}
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
              disabled={loading}
              className="bg-[#008751] hover:bg-[#006b3f] text-white"
            >
              {loading ? "Émission..." : "Émettre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
