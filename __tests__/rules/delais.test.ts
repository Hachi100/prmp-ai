/**
 * Tests unitaires : Moteur de regles — Delais legaux
 * Source : Decret 2020-600 Art. 3-8 ; Loi 2020-26 Art. 54, 79
 */

import { describe, it, expect } from "vitest";
import {
  addJoursOuvrables,
  addJoursCalendaires,
  verifierDelaiDepasse,
  getDelaiRemiseOffres,
  calculerDelaisMarche,
} from "../../src/lib/rules/delais";
import { ModePassation, OrganeControle, TypeDelai } from "../../src/types/enums";

describe("addJoursCalendaires", () => {
  it("Ajoute 10 jours calendaires a une date", () => {
    const debut = new Date("2025-01-01");
    const fin = addJoursCalendaires(debut, 10);
    expect(fin.toISOString().split("T")[0]).toBe("2025-01-11");
  });

  it("Ajoute 30 jours — franchit un mois", () => {
    const debut = new Date("2025-01-15");
    const fin = addJoursCalendaires(debut, 30);
    expect(fin.toISOString().split("T")[0]).toBe("2025-02-14");
  });

  it("Ajoute 0 jour — meme date", () => {
    const debut = new Date("2025-03-15");
    const fin = addJoursCalendaires(debut, 0);
    expect(fin.toISOString().split("T")[0]).toBe("2025-03-15");
  });
});

describe("addJoursOuvrables", () => {
  it("Saute le week-end (vendredi + 2j ouvrables = mardi)", () => {
    // Vendredi 3 janvier 2025
    const vendredi = new Date("2025-01-03");
    const fin = addJoursOuvrables(vendredi, 2);
    // Samedi et dimanche sont sautes : lundi = 1j, mardi = 2j
    expect(fin.getDay()).not.toBe(0); // Pas dimanche
    expect(fin.getDay()).not.toBe(6); // Pas samedi
  });

  it("1 jour ouvrable depuis lundi = mardi", () => {
    // Lundi 6 janvier 2025
    const lundi = new Date("2025-01-06");
    const fin = addJoursOuvrables(lundi, 1);
    expect(fin.toISOString().split("T")[0]).toBe("2025-01-07"); // Mardi
  });

  it("5 jours ouvrables depuis lundi = lundi suivant", () => {
    const lundi = new Date("2025-01-06");
    const fin = addJoursOuvrables(lundi, 5);
    // Lundi (0) + 5 ouvrables = sam + dim + lundi suivant
    expect(fin.getDay()).toBe(6); // Samedi non, c'est 5 jours ouvrables depuis lundi = samedi ? Non
    // 6jan(lun) +1 = 7(mar) +2 = 8(mer) +3 = 9(jeu) +4 = 10(ven) +5 = (sam skip, dim skip) = 13(lun)
    expect(fin.toISOString().split("T")[0]).toBe("2025-01-13");
  });
});

describe("verifierDelaiDepasse", () => {
  it("Date limite passee : vrai", () => {
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    expect(verifierDelaiDepasse(hier)).toBe(true);
  });

  it("Date limite future : faux", () => {
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    expect(verifierDelaiDepasse(demain)).toBe(false);
  });

  it("Date limite = maintenant : vrai (depasse)", () => {
    const passee = new Date(Date.now() - 1000);
    expect(verifierDelaiDepasse(passee)).toBe(true);
  });
});

describe("getDelaiRemiseOffres — Art. 54, Loi 2020-26", () => {
  it("AO national : 21 jours calendaires", () => {
    const delai = getDelaiRemiseOffres(ModePassation.AOO, false);
    expect(delai.jours).toBe(21);
    expect(delai.typeDelai).toBe(TypeDelai.CALENDAIRE);
  });

  it("AO communautaire : 30 jours calendaires", () => {
    const delai = getDelaiRemiseOffres(ModePassation.AOO, true);
    expect(delai.jours).toBe(30);
    expect(delai.typeDelai).toBe(TypeDelai.CALENDAIRE);
  });

  it("DRP : 15 jours calendaires", () => {
    const delai = getDelaiRemiseOffres(ModePassation.DRP_TRAVAUX, false);
    expect(delai.jours).toBe(15);
    expect(delai.typeDelai).toBe(TypeDelai.CALENDAIRE);
  });

  it("PI (SFQC) : 14 jours ouvrables", () => {
    const delai = getDelaiRemiseOffres(ModePassation.SFQC, false);
    expect(delai.jours).toBe(14);
    expect(delai.typeDelai).toBe(TypeDelai.OUVRABLE);
  });
});

describe("calculerDelaisMarche — Decret 2020-600", () => {
  it("Calcule les delais de base pour un AOO national avec CCMP", () => {
    const dateRef = new Date("2025-03-01");
    const delais = calculerDelaisMarche(
      dateRef,
      ModePassation.AOO,
      OrganeControle.CCMP,
      false
    );

    expect(delais).toHaveProperty("remise_offres");
    expect(delais).toHaveProperty("standstill");
    expect(delais).toHaveProperty("notification_definitive");

    // Delai remise offres : 21 jours calendaires apres le lancement
    const dateSoumission = delais["remise_offres"]?.dateLimite;
    expect(dateSoumission).toBeDefined();
  });

  it("Standstill : 10 jours calendaires — Art. 79 al. 3", () => {
    const dateRef = new Date("2025-03-01");
    const delais = calculerDelaisMarche(
      dateRef,
      ModePassation.AOO,
      OrganeControle.CCMP,
      false
    );

    const standstill = delais["standstill"];
    expect(standstill?.jours).toBe(10);
    expect(standstill?.typeDelai).toBe(TypeDelai.CALENDAIRE);
  });

  it("Notification definitive : 3 jours calendaires — Art. 86 al. 2", () => {
    const dateRef = new Date("2025-03-01");
    const delais = calculerDelaisMarche(
      dateRef,
      ModePassation.AOO,
      OrganeControle.CCMP,
      false
    );

    const notif = delais["notification_definitive"];
    expect(notif?.jours).toBe(3);
    expect(notif?.typeDelai).toBe(TypeDelai.CALENDAIRE);
  });
});
