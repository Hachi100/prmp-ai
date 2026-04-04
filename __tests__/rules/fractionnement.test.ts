/**
 * Tests unitaires : Detection du fractionnement
 * Source : Art. 24 al. 7 et Art. 26, Loi 2020-26
 */

import { describe, it, expect } from "vitest";
import { detecterFractionnement } from "../../src/lib/rules/fractionnement";
import { NatureMarche, NiveauAlerte, TypeEntite } from "../../src/types/enums";

describe("detecterFractionnement — Art. 24 al. 7 et Art. 26, Loi 2020-26", () => {
  const entiteId = "00000000-0000-0000-0000-000000000001";

  it("3 marches de fournitures 30M chacun = fractionnement BLOQUANT", () => {
    // Seuil fournitures ministere = 70M
    // Cumul 3x30M = 90M > 70M : fractionnement !
    const alertes = detecterFractionnement({
      entiteId,
      typeEntite: TypeEntite.MINISTERE,
      nature: NatureMarche.FOURNITURES,
      montantNouveauMarche: 30_000_000n,
      directionBeneficiaire: "DSI",
      exercice: 2025,
      marchesExistants: [
        { id: "uuid-1", montant: 30_000_000n, directionBeneficiaire: "DSI", nature: NatureMarche.FOURNITURES },
        { id: "uuid-2", montant: 30_000_000n, directionBeneficiaire: "DSI", nature: NatureMarche.FOURNITURES },
      ],
    });

    expect(alertes.some((a) => a.niveau === NiveauAlerte.BLOQUANT)).toBe(true);
    expect(alertes[0]?.articleSource).toContain("Art. 24");
  });

  it("Marches de natures differentes : pas de fractionnement", () => {
    // Travaux + fournitures ne se cumulent pas
    const alertes = detecterFractionnement({
      entiteId,
      typeEntite: TypeEntite.MINISTERE,
      nature: NatureMarche.FOURNITURES,
      montantNouveauMarche: 50_000_000n,
      directionBeneficiaire: "DSI",
      exercice: 2025,
      marchesExistants: [
        { id: "uuid-1", montant: 80_000_000n, directionBeneficiaire: "DSI", nature: NatureMarche.TRAVAUX },
      ],
    });

    expect(alertes.some((a) => a.niveau === NiveauAlerte.BLOQUANT)).toBe(false);
  });

  it("Cumul a 85% du seuil : alerte AVERTISSEMENT", () => {
    // Seuil fournitures = 70M, 85% = 59.5M
    // Existant: 30M + Nouveau: 30M = 60M (>= 80% du seuil 70M = 56M) => AVERTISSEMENT
    const alertes = detecterFractionnement({
      entiteId,
      typeEntite: TypeEntite.MINISTERE,
      nature: NatureMarche.FOURNITURES,
      montantNouveauMarche: 30_000_000n,
      directionBeneficiaire: "DGTCP",
      exercice: 2025,
      marchesExistants: [
        { id: "uuid-1", montant: 30_000_000n, directionBeneficiaire: "DGTCP", nature: NatureMarche.FOURNITURES },
      ],
    });

    // 60M vs seuil 70M => 85.7% => AVERTISSEMENT
    expect(alertes.some((a) => a.niveau === NiveauAlerte.AVERTISSEMENT)).toBe(true);
  });

  it("Marche unique bien en dessous du seuil : aucune alerte", () => {
    const alertes = detecterFractionnement({
      entiteId,
      typeEntite: TypeEntite.MINISTERE,
      nature: NatureMarche.FOURNITURES,
      montantNouveauMarche: 10_000_000n,
      directionBeneficiaire: "DGTCP",
      exercice: 2025,
      marchesExistants: [],
    });

    expect(alertes).toHaveLength(0);
  });

  it("Nouveau marche = seuil de passation individuel : pas de fractionnement si seul", () => {
    // Un seul marche de 70M = exactement au seuil : ALERTE BLOQUANT car depasse
    const alertes = detecterFractionnement({
      entiteId,
      typeEntite: TypeEntite.MINISTERE,
      nature: NatureMarche.FOURNITURES,
      montantNouveauMarche: 70_000_000n,
      directionBeneficiaire: "DSI",
      exercice: 2025,
      marchesExistants: [],
    });

    // 70M >= seuil 70M => BLOQUANT (depasse le seuil)
    expect(alertes.some((a) => a.niveau === NiveauAlerte.BLOQUANT)).toBe(true);
  });
});
