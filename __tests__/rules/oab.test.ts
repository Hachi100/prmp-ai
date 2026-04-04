/**
 * Tests unitaires : Offres Anormalement Basses
 * Source : Art. 81, Loi 2020-26 ; Fiches memo ARMP
 * Formule : M = 0.80 x (0.6 x Fm + 0.4 x Fc)
 */

import { describe, it, expect } from "vitest";
import {
  calculerSeuilOAB,
  detecterOAB,
  verifierCorrectionArithmetique,
} from "../../src/lib/rules/oab";

describe("calculerSeuilOAB — Art. 81, Loi 2020-26", () => {
  it("Calcule M correctement avec 3 offres", () => {
    const offres = [
      { id: "1", soumissionnaireNom: "A", montantCorrige: 100_000_000n },
      { id: "2", soumissionnaireNom: "B", montantCorrige: 90_000_000n },
      { id: "3", soumissionnaireNom: "C", montantCorrige: 110_000_000n },
    ];
    const estimationAC = 120_000_000n;

    const resultat = calculerSeuilOAB(offres, estimationAC);

    // Fm = (100M + 90M + 110M) / 3 = 100M
    expect(resultat.fm).toBe(100_000_000n);
    // Fc = 120M
    expect(resultat.fc).toBe(120_000_000n);
    // M = 0.80 x (0.6 x 100M + 0.4 x 120M) = 0.80 x (60M + 48M) = 0.80 x 108M = 86.4M
    expect(resultat.seuilM).toBe(86_400_000n);
  });

  it("Detecte les offres OAB sous le seuil M", () => {
    const offres = [
      { id: "1", soumissionnaireNom: "A", montantCorrige: 100_000_000n },
      { id: "2", soumissionnaireNom: "B", montantCorrige: 50_000_000n }, // OAB
      { id: "3", soumissionnaireNom: "C", montantCorrige: 110_000_000n },
    ];
    const estimationAC = 120_000_000n;

    const resultat = calculerSeuilOAB(offres, estimationAC);

    // Fm = (100M + 50M + 110M) / 3 = 86.67M
    // M = 0.80 x (0.6 x 86.67M + 0.4 x 120M) = 0.80 x (52M + 48M) = 0.80 x 100M = 80M
    expect(resultat.offresOAB.length).toBeGreaterThan(0);
    expect(resultat.offresOAB[0]?.offre.soumissionnaireNom).toBe("B");
  });

  it("Retourne 0 OAB si toutes les offres sont au-dessus de M", () => {
    const offres = [
      { id: "1", soumissionnaireNom: "A", montantCorrige: 100_000_000n },
      { id: "2", soumissionnaireNom: "B", montantCorrige: 105_000_000n },
      { id: "3", soumissionnaireNom: "C", montantCorrige: 110_000_000n },
    ];
    const estimationAC = 120_000_000n;

    const resultat = calculerSeuilOAB(offres, estimationAC);
    expect(resultat.offresOAB).toHaveLength(0);
  });

  it("Leve une erreur si aucune offre", () => {
    expect(() => calculerSeuilOAB([], 100_000_000n)).toThrow();
  });

  it("La formule est citee dans le resultat", () => {
    const offres = [{ id: "1", soumissionnaireNom: "A", montantCorrige: 100_000_000n }];
    const resultat = calculerSeuilOAB(offres, 100_000_000n);
    expect(resultat.formule).toContain("0.80");
    expect(resultat.articleSource).toContain("Art. 81");
  });
});

describe("verifierCorrectionArithmetique — Clause 31.3 IC DAO-types", () => {
  it("Correction de 5% : ne doit pas etre ecartee", () => {
    const resultat = verifierCorrectionArithmetique(100_000_000n, 105_000_000n);
    expect(resultat.deltaPct).toBeCloseTo(5, 1);
    expect(resultat.doitEtreEcartee).toBe(false);
  });

  it("Correction de 10.1% : doit etre ecartee (> 10%)", () => {
    const resultat = verifierCorrectionArithmetique(100_000_000n, 110_100_000n);
    expect(resultat.deltaPct).toBeGreaterThan(10);
    expect(resultat.doitEtreEcartee).toBe(true);
  });

  it("Correction exactement 10% : ne doit pas etre ecartee (10% = OK)", () => {
    const resultat = verifierCorrectionArithmetique(100_000_000n, 110_000_000n);
    expect(resultat.deltaPct).toBeCloseTo(10, 1);
    expect(resultat.doitEtreEcartee).toBe(false);
  });

  it("Cite la source — Clause 31.3 IC DAO-types", () => {
    const resultat = verifierCorrectionArithmetique(100_000_000n, 105_000_000n);
    expect(resultat.articleSource).toContain("Clause 31.3");
  });
});
