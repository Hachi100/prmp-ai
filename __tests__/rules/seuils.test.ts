/**
 * Tests unitaires : Moteur de regles — Seuils
 * Source : Decret 2020-599 Art. 1-8
 */

import { describe, it, expect } from "vitest";
import {
  getSeuilPassation,
  isCommunautaire,
  determinerOrganeControle,
  determinerModesValides,
  analyserSeuils,
  verifierSeuils,
} from "../../src/lib/rules/seuils";
import { NatureMarche, OrganeControle, TypeEntite, ModePassation, NiveauAlerte } from "../../src/types/enums";

describe("getSeuilPassation — Art. 1-2, Decret 2020-599", () => {
  it("Travaux AC standard : 100 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.TRAVAUX, TypeEntite.MINISTERE)).toBe(100_000_000n);
  });

  it("Fournitures AC standard : 70 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.FOURNITURES, TypeEntite.MINISTERE)).toBe(70_000_000n);
  });

  it("Services AC standard : 70 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.SERVICES, TypeEntite.MINISTERE)).toBe(70_000_000n);
  });

  it("PI cabinet AC standard : 50 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.PI_CABINET, TypeEntite.MINISTERE)).toBe(50_000_000n);
  });

  it("PI individuel AC standard : 20 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.PI_INDIVIDUEL, TypeEntite.MINISTERE)).toBe(20_000_000n);
  });

  it("Travaux commune sans statut : 35 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.TRAVAUX, TypeEntite.COMMUNE_SANS_STATUT)).toBe(35_000_000n);
  });

  it("Fournitures commune sans statut : 25 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.FOURNITURES, TypeEntite.COMMUNE_SANS_STATUT)).toBe(25_000_000n);
  });

  it("PI cabinet commune sans statut : 20 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.PI_CABINET, TypeEntite.COMMUNE_SANS_STATUT)).toBe(20_000_000n);
  });

  it("PI individuel commune sans statut : 15 000 000 FCFA", () => {
    expect(getSeuilPassation(NatureMarche.PI_INDIVIDUEL, TypeEntite.COMMUNE_SANS_STATUT)).toBe(15_000_000n);
  });
});

describe("isCommunautaire — Art. 8, Decret 2020-599", () => {
  it("Travaux EP 999M FCFA : non communautaire", () => {
    expect(isCommunautaire(999_999_999n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE)).toBe(false);
  });

  it("Travaux EP >= 1 milliard FCFA : communautaire", () => {
    expect(isCommunautaire(1_000_000_000n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE)).toBe(true);
  });

  it("Fournitures EP >= 500M FCFA : communautaire", () => {
    expect(isCommunautaire(500_000_000n, NatureMarche.FOURNITURES, TypeEntite.MINISTERE)).toBe(true);
  });

  it("PI EP >= 150M FCFA : communautaire", () => {
    expect(isCommunautaire(150_000_000n, NatureMarche.PI_CABINET, TypeEntite.MINISTERE)).toBe(true);
  });

  it("Travaux EPIC >= 1,5 milliard FCFA : communautaire", () => {
    expect(isCommunautaire(1_500_000_000n, NatureMarche.TRAVAUX, TypeEntite.EP_EPIC)).toBe(true);
  });

  it("Travaux EPIC 1,4 milliard : non communautaire", () => {
    expect(isCommunautaire(1_400_000_000n, NatureMarche.TRAVAUX, TypeEntite.EP_EPIC)).toBe(false);
  });
});

describe("determinerOrganeControle — Manuel Procedures p.19-21", () => {
  it("Travaux 600M ministere : DNCMP", () => {
    expect(
      determinerOrganeControle(600_000_000n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE, true)
    ).toBe(OrganeControle.DNCMP);
  });

  it("Travaux 499M ministere : CCMP", () => {
    expect(
      determinerOrganeControle(499_999_999n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE, true)
    ).toBe(OrganeControle.CCMP);
  });

  it("Fournitures 300M ministere : DNCMP (exactement au seuil)", () => {
    expect(
      determinerOrganeControle(300_000_000n, NatureMarche.FOURNITURES, TypeEntite.MINISTERE, true)
    ).toBe(OrganeControle.DNCMP);
  });

  it("Commune a statut particulier : DDCMP pour travaux 250M-499M", () => {
    expect(
      determinerOrganeControle(300_000_000n, NatureMarche.TRAVAUX, TypeEntite.COMMUNE_STATUT, true)
    ).toBe(OrganeControle.DDCMP);
  });

  it("Marche sous seuil de passation : CCMP", () => {
    expect(
      determinerOrganeControle(50_000_000n, NatureMarche.FOURNITURES, TypeEntite.MINISTERE, true)
    ).toBe(OrganeControle.CCMP);
  });

  it("PI individuel 120M commune sans statut sans delegues : DNCMP", () => {
    expect(
      determinerOrganeControle(120_000_000n, NatureMarche.PI_INDIVIDUEL, TypeEntite.COMMUNE_SANS_STATUT, false)
    ).toBe(OrganeControle.DNCMP);
  });
});

describe("determinerModesValides", () => {
  it("Montant <= 4M : aucun mode formel (dispense)", () => {
    const modes = determinerModesValides(4_000_000n, NatureMarche.FOURNITURES, TypeEntite.MINISTERE);
    expect(modes).toEqual([]);
  });

  it("Montant 5M : DC (Demande de Cotation)", () => {
    const modes = determinerModesValides(5_000_000n, NatureMarche.FOURNITURES, TypeEntite.MINISTERE);
    expect(modes).toContain(ModePassation.DC);
  });

  it("Montant 50M fournitures ministere : DRP", () => {
    const modes = determinerModesValides(50_000_000n, NatureMarche.FOURNITURES, TypeEntite.MINISTERE);
    expect(modes).toContain(ModePassation.DRP_FOURNITURES);
  });

  it("Montant >= 100M travaux ministere : AOO obligatoire", () => {
    const modes = determinerModesValides(100_000_000n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE);
    expect(modes).toContain(ModePassation.AOO);
  });

  it("PI >= seuil : inclut SFQC", () => {
    const modes = determinerModesValides(60_000_000n, NatureMarche.PI_CABINET, TypeEntite.MINISTERE);
    expect(modes).toContain(ModePassation.SFQC);
  });
});

describe("verifierSeuils — alertes", () => {
  it("Montant au-dessus du seuil : alerte BLOQUANT", () => {
    const alertes = verifierSeuils(100_000_000n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE);
    expect(alertes.some((a) => a.niveau === NiveauAlerte.BLOQUANT)).toBe(true);
  });

  it("Montant a 95% du seuil : alerte AVERTISSEMENT", () => {
    const alertes = verifierSeuils(95_000_000n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE);
    expect(alertes.some((a) => a.niveau === NiveauAlerte.AVERTISSEMENT)).toBe(true);
  });

  it("Montant bien en dessous du seuil : aucune alerte", () => {
    const alertes = verifierSeuils(10_000_000n, NatureMarche.TRAVAUX, TypeEntite.MINISTERE);
    expect(alertes).toHaveLength(0);
  });
});

describe("analyserSeuils — analyse complete", () => {
  it("Analyse complete pour un marche de travaux standard", () => {
    const resultat = analyserSeuils({
      montant: 150_000_000n,
      nature: NatureMarche.TRAVAUX,
      typeEntite: TypeEntite.MINISTERE,
      hasCCMPDelegues: true,
    });

    expect(resultat.seuilPassation).toBe(100_000_000n);
    expect(resultat.organeControle).toBe(OrganeControle.CCMP);
    expect(resultat.isCommunautaire).toBe(false);
    expect(resultat.modesValides).toContain(ModePassation.AOO);
  });
});
