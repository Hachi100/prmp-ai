/**
 * Tests unitaires : Machine a etats des procedures
 * Source : Manuel de Procedures ARMP, Partie 3
 */

import { describe, it, expect } from "vitest";
import {
  peutTransitionner,
  getTransitionsValides,
  getEtapesRequises,
  STATUT_LABELS,
} from "../../src/lib/rules/workflow";
import { ModePassation, StatutProcedure } from "../../src/types/enums";

describe("peutTransitionner — Machine a etats AOO", () => {
  it("PLANIFIE → PREPARATION : autorise", () => {
    expect(
      peutTransitionner(StatutProcedure.PLANIFIE, StatutProcedure.PREPARATION, ModePassation.AOO)
    ).toBe(true);
  });

  it("PLANIFIE → EVALUATION : interdit (saut d'etapes)", () => {
    expect(
      peutTransitionner(StatutProcedure.PLANIFIE, StatutProcedure.EVALUATION, ModePassation.AOO)
    ).toBe(false);
  });

  it("STANDSTILL → CONTRACTUALISATION : autorise (sans recours)", () => {
    expect(
      peutTransitionner(StatutProcedure.STANDSTILL, StatutProcedure.CONTRACTUALISATION, ModePassation.AOO)
    ).toBe(true);
  });

  it("SOLDE → tout : interdit (etat terminal)", () => {
    expect(
      peutTransitionner(StatutProcedure.SOLDE, StatutProcedure.EXECUTION, ModePassation.AOO)
    ).toBe(false);
    expect(
      peutTransitionner(StatutProcedure.SOLDE, StatutProcedure.PLANIFIE, ModePassation.AOO)
    ).toBe(false);
  });

  it("ANNULE → tout : interdit (etat terminal)", () => {
    expect(
      peutTransitionner(StatutProcedure.ANNULE, StatutProcedure.PLANIFIE, ModePassation.AOO)
    ).toBe(false);
  });

  it("EXECUTION → RECEPTION_PROVISOIRE : autorise", () => {
    expect(
      peutTransitionner(StatutProcedure.EXECUTION, StatutProcedure.RECEPTION_PROVISOIRE, ModePassation.AOO)
    ).toBe(true);
  });
});

describe("peutTransitionner — SFQC (PI, 2 enveloppes)", () => {
  it("SFQC EVALUATION → STANDSTILL : autorise (standstill technique)", () => {
    expect(
      peutTransitionner(StatutProcedure.EVALUATION, StatutProcedure.STANDSTILL, ModePassation.SFQC)
    ).toBe(true);
  });

  it("SFQC EVALUATION → ATTRIBUTION_PROVISOIRE : non direct (via STANDSTILL)", () => {
    // Pour SFQC, il faut passer par le standstill technique avant attribution
    expect(
      peutTransitionner(StatutProcedure.EVALUATION, StatutProcedure.ATTRIBUTION_PROVISOIRE, ModePassation.SFQC)
    ).toBe(false);
  });
});

describe("getTransitionsValides", () => {
  it("PREPARATION a des transitions valides vers LANCE", () => {
    const transitions = getTransitionsValides(StatutProcedure.PREPARATION, ModePassation.AOO);
    expect(transitions).toContain(StatutProcedure.LANCE);
    expect(transitions).toContain(StatutProcedure.ANNULE);
  });

  it("ATTRIBUTION_PROVISOIRE : transition vers STANDSTILL", () => {
    const transitions = getTransitionsValides(StatutProcedure.ATTRIBUTION_PROVISOIRE, ModePassation.AOO);
    expect(transitions).toContain(StatutProcedure.STANDSTILL);
  });
});

describe("getEtapesRequises", () => {
  it("PREPARATION requiert DAO et checklist ARMP", () => {
    const etapes = getEtapesRequises(StatutProcedure.PREPARATION, ModePassation.AOO);
    expect(etapes.length).toBeGreaterThan(0);
    expect(etapes.some((e) => e.id === "dao_cree")).toBe(true);
    expect(etapes.some((e) => e.id === "checklist_armp")).toBe(true);
  });

  it("CONTRACTUALISATION requiert beneficiaires effectifs — Circulaire 2024-002", () => {
    const etapes = getEtapesRequises(StatutProcedure.CONTRACTUALISATION, ModePassation.AOO);
    expect(etapes.some((e) => e.id === "beneficiaires_effectifs")).toBe(true);
  });

  it("SOLDE : aucune etape requise", () => {
    const etapes = getEtapesRequises(StatutProcedure.SOLDE, ModePassation.AOO);
    expect(etapes).toHaveLength(0);
  });
});

describe("STATUT_LABELS", () => {
  it("Tous les statuts ont un label en francais", () => {
    const statuts = Object.values(StatutProcedure);
    for (const statut of statuts) {
      expect(STATUT_LABELS[statut]).toBeDefined();
      expect(STATUT_LABELS[statut]!.length).toBeGreaterThan(0);
    }
  });
});
