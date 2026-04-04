"use client";

/**
 * Formulaire de réception (provisoire / définitive)
 * Libération de la garantie de bonne exécution : 30 jours après réception définitive
 * Manuel de Procédures — workflow réception
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface ReceptionFormProps {
  contratId: string;
  hasProvisoire: boolean;
  onSuccess?: () => void;
}

export function ReceptionForm({ contratId, hasProvisoire, onSuccess }: ReceptionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ garantieLiberationDate?: string | null } | null>(null);

  const [form, setForm] = useState({
    type: (hasProvisoire ? "definitive" : "provisoire") as "provisoire" | "definitive",
    dateDemande: new Date().toISOString().split("T")[0]!,
    dateReception: "",
    reserves: "",
  });

  // Calculate garantie liberation (30j after définitive)
  const garantieLiberationDate =
    form.type === "definitive" && form.dateReception
      ? (() => {
          const d = new Date(form.dateReception);
          d.setDate(d.getDate() + 30);
          return d.toISOString().split("T")[0]!;
        })()
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/contrats/${contratId}/receptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Erreur serveur");
      }

      setResult(data);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Type de réception</Label>
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
            <SelectItem value="provisoire" disabled={hasProvisoire}>
              Provisoire {hasProvisoire ? "(déjà effectuée)" : ""}
            </SelectItem>
            <SelectItem value="definitive" disabled={!hasProvisoire}>
              Définitive {!hasProvisoire ? "(nécessite réception provisoire)" : ""}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Date de demande</Label>
          <Input
            type="date"
            value={form.dateDemande}
            onChange={(e) =>
              setForm((f) => ({ ...f, dateDemande: e.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date de réception effective</Label>
          <Input
            type="date"
            value={form.dateReception}
            onChange={(e) =>
              setForm((f) => ({ ...f, dateReception: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Garantie liberation info */}
      {garantieLiberationDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
          <p className="font-medium">Libération de la garantie de bonne exécution</p>
          <p className="text-xs mt-0.5">
            Date de libération : <strong>{formatDate(garantieLiberationDate)}</strong>
            {" "}(30 jours après réception — Art. garantie d&apos;exécution, Loi 2020-26)
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Réserves émises</Label>
        <Textarea
          value={form.reserves}
          onChange={(e) =>
            setForm((f) => ({ ...f, reserves: e.target.value }))
          }
          placeholder="Lister les réserves éventuelles..."
          rows={3}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
          <p className="font-medium">Réception enregistrée.</p>
          {result.garantieLiberationDate && (
            <p className="text-xs mt-0.5">
              Garantie libérée le : {formatDate(result.garantieLiberationDate)}
            </p>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="bg-[#008751] hover:bg-[#006b3f] text-white"
      >
        {loading ? "Enregistrement..." : "Enregistrer la réception"}
      </Button>
    </form>
  );
}
