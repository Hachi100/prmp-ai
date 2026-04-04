/**
 * Tests unitaires : Penalites de retard
 * Source : Art. 113-114, Loi 2020-26
 */

import { describe, it, expect } from "vitest";
import {
  calculerPenalite,
  verifierPlafondAvenant,
  verifierPlafondSousTraitance,
  TAUX_JOURNALIER_DEFAULT,
  PLAFOND_PENALITES_PCT,
} from "../../src/lib/rules/penalites";

describe("calculerPenalite — Art. 113-114, Loi 2020-26", () => {
  it("Calcule une penalite simple (10 jours de retard, taux 1/2000)", () => {
    const resultat = calculerPenalite({
      montantTTC: 100_000_000n,
      joursRetard: 10,
      tauxJournalier: TAUX_JOURNALIER_DEFAULT,
      montantCumulePrecedent: 0n,
    });

    // 100M x 1/2000 x 10 = 500 000 FCFA
    expect(resultat.montantPenalite).toBe(500_000n);
    expect(resultat.declencheResiliation).toBe(false);
  });

  it("Plafond = 10% du montant TTC — Art. 114", () => {
    const resultat = calculerPenalite({
      montantTTC: 100_000_000n,
      joursRetard: 1,
      tauxJournalier: TAUX_JOURNALIER_DEFAULT,
      montantCumulePrecedent: 0n,
    });

    expect(resultat.plafond10pct).toBe(10_000_000n);
    expect(PLAFOND_PENALITES_PCT).toBe(0.10);
  });

  it("Resiliation declenchee quand penalite cumule >= 10% — Art. 114", () => {
    // Cumul precedent = 9 999 000 FCFA, penalite actuelle = 50 000 : depasse 10M
    const resultat = calculerPenalite({
      montantTTC: 100_000_000n,
      joursRetard: 1,
      tauxJournalier: TAUX_JOURNALIER_DEFAULT,
      montantCumulePrecedent: 9_999_999n,
    });

    // Cumul = 9 999 999 + 50 000 = 10 049 999 > 10 000 000 (plafond)
    expect(resultat.declencheResiliation).toBe(true);
  });

  it("Pas de resiliation si cumul < 10%", () => {
    const resultat = calculerPenalite({
      montantTTC: 100_000_000n,
      joursRetard: 5,
      tauxJournalier: TAUX_JOURNALIER_DEFAULT,
      montantCumulePrecedent: 0n,
    });

    expect(resultat.declencheResiliation).toBe(false);
    expect(resultat.pourcentagePlafond).toBeLessThan(100);
  });

  it("Cite la source juridique", () => {
    const resultat = calculerPenalite({
      montantTTC: 50_000_000n,
      joursRetard: 1,
      tauxJournalier: TAUX_JOURNALIER_DEFAULT,
      montantCumulePrecedent: 0n,
    });

    expect(resultat.articleSource).toContain("Art. 113-114");
  });
});

describe("verifierPlafondAvenant — Art. 84, Loi 2020-26", () => {
  it("Avenant de 20% : autorise (< 30%)", () => {
    const resultat = verifierPlafondAvenant({
      montantInitial: 100_000_000n,
      montantCumulAvenants: 0n,
      montantNouvelAvenant: 20_000_000n,
    });

    expect(resultat.depasse).toBe(false);
    expect(resultat.pctCumule).toBeCloseTo(20, 1);
  });

  it("Avenant qui porte le cumul a 35% : REFUSE — Art. 84", () => {
    const resultat = verifierPlafondAvenant({
      montantInitial: 100_000_000n,
      montantCumulAvenants: 20_000_000n, // Deja 20%
      montantNouvelAvenant: 15_000_000n, // 15% de plus = 35% total
    });

    expect(resultat.depasse).toBe(true);
    expect(resultat.pctCumule).toBeCloseTo(35, 1);
    expect(resultat.montantMaxAutorise).toBe(30_000_000n);
  });

  it("Avenant exactement a 30% : autorise (limite exacte)", () => {
    const resultat = verifierPlafondAvenant({
      montantInitial: 100_000_000n,
      montantCumulAvenants: 0n,
      montantNouvelAvenant: 30_000_000n,
    });

    expect(resultat.depasse).toBe(false);
  });
});

describe("verifierPlafondSousTraitance — Art. 101, Loi 2020-26", () => {
  it("Sous-traitance de 30% : autorisee (< 40%)", () => {
    const resultat = verifierPlafondSousTraitance(100_000_000n, 30_000_000n);
    expect(resultat.depasse).toBe(false);
    expect(resultat.pctSousTraitance).toBeCloseTo(30, 1);
  });

  it("Sous-traitance de 45% : REFUSE — Art. 101", () => {
    const resultat = verifierPlafondSousTraitance(100_000_000n, 45_000_000n);
    expect(resultat.depasse).toBe(true);
    expect(resultat.montantMaxAutorise).toBe(40_000_000n);
  });
});
