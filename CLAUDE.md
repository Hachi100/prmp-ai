# PRMP-PRO — Plateforme IA de Passation des Marches Publics au Benin

## Vision du produit

PRMP-Pro est un copilote IA pour la PRMP (Personne Responsable des Marches Publics) au Benin. La plateforme automatise l'integralite du cycle de passation et d'execution des marches publics. Un seul utilisateur-pivot : la PRMP. Les autres acteurs (COE, organes de controle, autorite approbatrice) n'ont pas de compte — la PRMP trace leurs interactions depuis son interface.

L'IA Claude est integree de bout en bout comme panneau lateral contextuel sur chaque ecran : elle connait le marche en cours, l'etape actuelle, et cite toujours les articles de loi.

## Cadre juridique de reference

Loi n 2020-26 du 29/09/2020 portant code des marches publics en Republique du Benin (127 articles). Decrets d'application n 2020-595 a 2020-605 du 23/12/2020. Manuel de Procedures de Passation des Marches Publics ARMP (155 pages, juin 2023). Manuel de Controle des Marches Publics (juin 2022, MAJ juin 2023). Manuel de Traitement des Recours et Auto-saisines (juin 2023). Circulaires ARMP 2022-001, 2022-002, 2023-002, 2024-001 a 2024-005, 2025-001, 2025-002. DAO-types ARMP travaux, fournitures, services, prequalification (version juin 2023, Decret 2020-602). Check-lists ARMP. Loi 2024-30 PPP.

Hierarchie des normes en cas de contradiction : Loi 2020-26 > Decrets > Arretes > Decisions > Avis et circulaires ARMP > Manuel de procedures.

## Stack technique

- Frontend : Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- Backend : API Routes Next.js + Drizzle ORM + TypeScript strict
- Base de donnees : PostgreSQL 16 + extension pgvector
- IA : Claude API (Sonnet) avec streaming et tool use
- Embeddings : Voyage AI (voyage-3, dimension 1024) pour le RAG juridique
- Generation de documents : python-docx + openpyxl + LibreOffice (conversion PDF)
- Auth : Better-Auth avec sessions JWT et RBAC
- Stockage fichiers : MinIO (S3-compatible, self-hosted)
- Notifications : Resend (email) + WhatsApp Business API

## Structure du projet

```
prmp-pro/
  src/
    app/                    # Next.js App Router
      (auth)/login/         # Page de connexion
      (dashboard)/          # Layout protege avec sidebar
        page.tsx            # Dashboard principal
        ppm/                # Module PPM
        marches/            # Liste et fiches marches
        dao/                # Wizard creation DAO
        evaluation/         # Grilles d'evaluation
        contrats/           # Suivi execution
        reporting/          # Rapports trimestriels
      api/                  # API Routes
        marches/
        ppm/
        dao/
        evaluation/
        contrats/
        ai/advisor/         # Endpoint streaming Claude
    lib/
      db/
        schema/             # Fichiers Drizzle ORM (1 fichier par entite)
        index.ts            # Client PostgreSQL + Drizzle
      rules/                # Moteur de regles metier
        seuils.ts           # Seuils de passation et controle
        delais.ts           # Delais legaux
        fractionnement.ts   # Detection anti-fractionnement
        oab.ts              # Offres anormalement basses
        penalites.ts        # Calcul des penalites
        workflow.ts         # Machine a etats des procedures
        index.ts            # Re-export
      ai/
        rag/
          indexer.ts         # Pipeline d'indexation base juridique
          retriever.ts       # Recherche semantique pgvector
        prompts/
          system.ts          # Prompt systeme agent conseiller
        tools/               # Tool functions pour Claude
          calculate-thresholds.ts
          check-compliance.ts
          compute-deadlines.ts
          detect-fragmentation.ts
          detect-oab.ts
          compute-penalties.ts
          search-juridique.ts
        advisor.ts           # Agent IA principal avec streaming
      docs/
        templates/           # Structure des DAO-types
        generators/          # Generation Word/Excel/PDF
    components/
      ui/                    # Composants shadcn/ui
      dashboard/             # KPI, alertes, Kanban
      marche/                # Fiche marche, stepper etapes
      dao/                   # Wizard 3 etapes
      evaluation/            # Grilles notation
      ai-panel.tsx           # Panneau IA lateral
    types/                   # Types TypeScript partages
  scripts/
    seed.ts                  # Donnees de test
    index-juridique.ts       # Indexation RAG
  data/
    loi/                     # Textes de loi en JSON (chunks)
    dao-types/               # Templates DAO fixes
  __tests__/
    rules/                   # Tests unitaires moteur de regles
    api/                     # Tests API
  CLAUDE.md                  # Ce fichier
  drizzle.config.ts
  .env.local
```

## Seuils de passation des marches publics

Source : Decret 2020-599 Articles 1 a 6, Manuel de Procedures section 2.4

### Seuils pour les appels d'offres (Art. 1-2, Decret 2020-599)

Toutes AC sauf communes sans statut particulier :
- Travaux : 100 000 000 FCFA HT
- Fournitures ou services : 70 000 000 FCFA HT
- PI confiees a des cabinets : 50 000 000 FCFA HT
- PI confiees a des consultants individuels : 20 000 000 FCFA HT

Communes sans statut particulier :
- Travaux : 35 000 000 FCFA HT
- Fournitures ou services : 25 000 000 FCFA HT
- PI confiees a des cabinets : 20 000 000 FCFA HT
- PI confiees a des consultants individuels : 15 000 000 FCFA HT

### Seuils de sollicitation de prix (Art. 3-6, Decret 2020-599 et Decret 2020-605)

- Demande de Renseignements et de Prix (DRP) : montant > 10 000 000 et inferieur aux seuils de passation
- Demande de Cotation (DC) : montant > 4 000 000 et inferieur ou egal a 10 000 000
- Seuil de dispense : inferieur ou egal a 4 000 000 FCFA HT

### Seuils communautaires UEMOA (Art. 8, Decret 2020-599)

Etat, collectivites territoriales, etablissements publics :
- Travaux : 1 000 000 000 FCFA
- Fournitures et services : 500 000 000 FCFA
- PI : 150 000 000 FCFA

Organismes de droit public, societes nationales, SAPM :
- Travaux : 1 500 000 000 FCFA
- Fournitures et services : 750 000 000 FCFA
- PI : 200 000 000 FCFA

### Seuils de controle a priori DNCMP (Manuel Procedures p.19, Table 1)

AC standard (sauf communes sans statut et EP sans delegues) :
- Travaux : >= 500 000 000
- Fournitures et services : >= 300 000 000
- PI cabinets : >= 200 000 000
- PI consultants individuels : >= 100 000 000

Communes sans statut + EP dont CCMP ne sont pas delegues :
- Travaux : >= 300 000 000
- Fournitures et services : >= 150 000 000
- PI cabinets : >= 120 000 000
- PI consultants individuels : >= 80 000 000

### Seuils de controle a priori DDCMP (Manuel Procedures p.20-21, Table 2)

Communes a statut particulier :
- Travaux : >= 200 000 000 et < 500 000 000
- Fournitures : >= 100 000 000 et < 300 000 000
- PI cabinets : >= 100 000 000 et < 200 000 000
- PI individuels : >= 60 000 000 et < 100 000 000

Communes sans statut + EP sans delegues :
- Travaux : >= 150 000 000 et < 300 000 000
- Fournitures : >= 50 000 000 et < 150 000 000
- PI cabinets : >= 50 000 000 et < 120 000 000
- PI individuels : >= 30 000 000 et < 80 000 000

CCMP : tout marche >= seuils de passation et < seuils DNCMP/DDCMP.

## Delais legaux

Source : Decret 2020-600 Articles 3 a 6 ; Loi 2020-26 Articles 54, 79, 116-117

### Organes de passation (Art. 3, Decret 2020-600)

- Preparation du DAO : 30 jours calendaires avant la date de lancement prevue au PPM
- Transmission du DAO a l'organe de controle : 10 jours ouvrables avant la date de lancement
- Prise en compte des observations de l'organe de controle : 2 jours ouvrables
- Publication de l'AAO apres BAL : dans les 2 jours ouvrables
- Evaluation des offres par la COE : 10 jours ouvrables apres reception des offres
- Transmission du rapport d'evaluation a l'organe de controle : 1 jour ouvrable
- Notification des resultats aux candidats : 1 jour ouvrable apres reception de l'avis de l'organe
- Signature de l'attributaire : 3 jours ouvrables apres reception du marche
- Signature de la PRMP : 2 jours ouvrables apres retour du marche signe par l'attributaire
- Transmission du projet de marche pour examen juridique : 1 jour ouvrable
- Notification definitive : 3 jours calendaires apres approbation (Art. 86 al. 2, Loi 2020-26)
- Publication avis d'attribution definitive : 15 jours calendaires apres entree en vigueur (Art. 87)

### DNCMP et DDCMP (Art. 4, Decret 2020-600)

- Avis sur les DAO : 4 jours ouvrables
- Publication de l'avis d'appel a concurrence : 1 jour ouvrable apres reception de l'avis
- Etude du rapport d'analyse des offres : 5 jours ouvrables
- Publication du PV d'attribution provisoire : 1 jour ouvrable
- Publication de l'avis d'attribution definitif : 1 jour ouvrable
- Examen juridique et technique, visa et authentification : 3 jours ouvrables
- Tout autre dossier : 3 jours ouvrables

### CCMP (Art. 5, Decret 2020-600)

- Avis sur les DAO : 3 jours ouvrables
- Visa pour Bon a Lancer : 1 jour ouvrable
- Etude du rapport d'evaluation : 3 jours ouvrables
- Examen juridique et technique, visa, authentification : 3 jours ouvrables
- Tout autre dossier : 3 jours ouvrables

### Autorites approbatrices (Art. 6, Decret 2020-600)

- Approbation du marche : 5 jours ouvrables
- Nombre d'exemplaires du projet de contrat : 3 (Art. 7)

### Delais de remise des offres (Art. 54, Loi 2020-26)

- AO national (seuils de passation) : 21 jours calendaires minimum
- AO communautaire (seuils UEMOA) : 30 jours calendaires minimum
- Prequalification nationale : 21 jours calendaires
- Prequalification communautaire : 30 jours calendaires
- PI (Demande de Propositions) : 14 jours ouvrables minimum (Manuel p.131)
- DRP : 15 jours calendaires (Manuel p.97)
- Validite des offres DRP : 30 jours calendaires (Manuel p.107)

### Standstill et recours

- Standstill apres attribution provisoire : 10 jours calendaires minimum (Art. 79 al. 3)
- Standstill technique PI (entre resultats tech. et ouverture fin.) : 10 jours calendaires (Clause 21.1 IC DP)
- Recours devant l'AC : 5 jours ouvrables apres publication attribution provisoire (Art. 116)
- Reponse AC au recours : 3 jours ouvrables (Art. 116)
- Recours devant l'ARMP : 2 jours ouvrables apres notification decision AC (Art. 117)
- Decision ARMP : 7 jours ouvrables (Art. 117)
- Mise en conformite apres decision ARMP : 5 jours ouvrables (Art. 117)
- Recours DRP/DC devant AC : 2 jours ouvrables apres notification (Circulaire 2023-002)
- Reponse AC recours DRP/DC : 2 jours ouvrables (Circulaire 2023-002)

### Eclaircissements (Clauses 7/8 IC DAO-types)

- AO national : demande dans les 10 jours calendaires apres publication
- AO international : demande dans les 15 jours calendaires apres publication
- Reponse de la PRMP : 3 jours ouvrables apres reception

### Non-respect des delais (Art. 8, Decret 2020-600)

Si un organe de controle ne respecte pas ses delais, la PRMP saisit l'ARMP qui met en demeure l'organe sous 72 heures. Passe ce delai, l'ARMP enjoint a la PRMP de poursuivre la procedure sans delai.

### Execution des contrats

- Delai de paiement : 60 jours calendaires maximum (Art. 116, Loi 2020-26)
- Mise en demeure avant penalites : 8 jours calendaires (Art. 113)
- Plafond des penalites de retard : 10% du montant TTC (Art. 114). Depassement = resiliation de plein droit
- Plafond des avenants : 30% du montant initial (Art. 84)
- Plafond de la sous-traitance : 40% de la valeur globale (Art. 101)
- Garantie de bonne execution : maximum 5% du montant du marche
- Garantie de soumission : entre 1% et 3% du montant estime
- Liberation de la garantie de bonne execution : 30 jours apres achevement
- Duree d'archivage : 10 ans minimum
- PPM : delai de 10 jours calendaires apres approbation du budget (Art. 24 al. 1)
- Rapport trimestriel PRMP : 1 mois apres la fin du trimestre (Art. 2, Decret 2020-596)

## Procedures de passation (17 modes)

Source : Manuel de Procedures de Passation, Partie 3

### TFS (Travaux, Fournitures, Services)

1. AOO (Appel d'Offres Ouvert) : 14 etapes (E1 a E14), Manuel pp.31-75
2. AOO avec prequalification : Phase 1 (8 etapes) + Phase 2 (= AOO), Manuel pp.76-83
3. AO en deux etapes : Etape 1 (8 sous-etapes) + Etape 2 (= AOO), Manuel pp.84-91
4. AO avec concours : jury anonyme, Manuel pp.91-93
5. AO restreint : liste restreinte puis AOO simplifie
6. Gre a gre (entente directe) : 15 etapes, autorisation DNCMP obligatoire, Manuel pp.93-96
7. DRP travaux : controle a priori CCMP, Manuel pp.96-110
8. DRP fournitures : idem
9. DRP services : idem
10. DC (Demande de Cotation) : 4M-10M, sans controle a priori CCMP, Manuel pp.110-111

### PI (Prestations Intellectuelles)

11. SFQC (Selection Fondee sur la Qualite et le Cout) : 16 etapes, 2 enveloppes, Manuel pp.114-150
12. SFQ (Selection Fondee sur la Qualite)
13. SCBD (Selection dans le Cadre d'un Budget Determine)
14. SMC (Selection au Moindre Cout)
15. SfQC (Selection Fondee sur les Qualifications du Consultant)
16. SCI (Selection de Consultants Individuels)
17. Entente directe PI : autorisation DNCMP

### Sous seuils

- Dispense (< 4M) : comparaison de 3 pro forma minimum

### Les 14 etapes de l'AOO (Manuel pp.31-75)

E1. Definition des specifications techniques
E2. Preparation du DAO
E3. Lancement de l'AO et delai de preparation des offres
E4. Reception des offres
E5. Ouverture des plis (seance publique)
E6. Evaluation des offres et proposition d'attribution
E7. Notification d'attribution provisoire
E8. Elaboration et signature du marche
E9. Approbation du marche
E10. Authentification et numerotation (DNCMP)
E11. Enregistrement du marche (DGI, redevance ARMP)
E12. Notification de l'attribution definitive
E13. Entree en vigueur du marche
E14. Publication de l'avis d'attribution definitive

## Formules de calcul

### OAB - Offre Anormalement Basse (Art. 81, Loi 2020-26 ; Fiches memo ARMP)

M = 0.80 x (0.6 x Fm + 0.4 x Fc)

Fm = moyenne arithmetique des offres financieres corrigees = (P1 + P2 + ... + Pn) / N
Fc = estimation previsionnelle de l'AC pour le lot considere
Toute offre dont le montant est inferieur a M est presumee anormalement basse.
Avant rejet, obligation de demander des justifications ecrites au soumissionnaire.

### Corrections arithmetiques (Clause 31 IC DAO-types)

- Ecart entre montant en chiffres et en lettres : les lettres prevalent
- Ecart entre prix unitaire et montant total (PU x quantite) : le prix unitaire prevaut
- Si la correction entraine une variation > 10% du montant lu a l'ouverture : l'offre est ecartee (Clause 31.3)

### Penalites de retard

penalite = montant_TTC x taux_journalier x jours_retard
taux_journalier = 1/2000e (services, CCAP type) ou 1/5000e a 1/1000e selon CCAP
plafond = 10% du montant TTC du marche de base + avenants (Art. 114)
Si penalite >= plafond : resiliation de plein droit

### Fractionnement (Art. 24 al. 7 et Art. 26, Loi 2020-26)

Interdit. Le systeme cumule les marches de meme nature (travaux, fournitures, services, PI) par direction beneficiaire et par exercice. Si le cumul depasse le seuil de passation alors que chaque marche individuel est en dessous : alerte fractionnement. Sanctions : Art. 126, 5 a 10 ans d'emprisonnement et 50M a 500M FCFA d'amende.

## Regles de codage

### Conventions generales

- TypeScript strict : pas de any, toujours typer les parametres et retours
- Chaque fichier de schema DB cite ses sources juridiques en commentaire en tete
- Chaque regle metier dans src/lib/rules/ cite son article de loi en commentaire inline
- Les parties fixes des DAO-types (IC, CCAG) sont VERROUILLEES : hash SHA-256 de verification, aucune modification autorisee
- Les montants sont toujours en FCFA HT sauf indication contraire
- Les delais sont en jours ouvrables (lundi-vendredi) ou calendaires selon le texte — toujours preciser le type
- Les tests unitaires accompagnent chaque fichier de regles
- Utiliser Zod pour la validation des entrees

### Schema de base de donnees

Utiliser Drizzle ORM avec PostgreSQL. Un fichier par domaine dans src/lib/db/schema/. Les enum TypeScript doivent couvrir :

mode_passation : 17 valeurs (aoo, aoo_prequalification, ao_deux_etapes, ao_concours, ao_restreint, gre_a_gre, drp_travaux, drp_fournitures, drp_services, dc, sfqc, sfq, scbd, smc, sfqc_qualification, sci, entente_directe_pi)

statut_procedure : 19 valeurs (planifie, preparation, lance, evaluation, attribution_provisoire, standstill, recours, contractualisation, approuve, authentifie, enregistre, notifie, en_vigueur, execution, reception_provisoire, reception_definitive, solde, suspendu, annule)

nature_marche : 5 valeurs (travaux, fournitures, services, pi_cabinet, pi_individuel)

type_entite : 7 valeurs (ministere, ep_epic, ep_epa, commune_statut, commune_sans_statut, prefecture, autre)

organe_controle : 3 valeurs (ccmp, ddcmp, dncmp)

### Agent IA conseiller

Le prompt systeme de l'agent est dans src/lib/ai/prompts/system.ts. Il doit contenir les regles suivantes pour Claude :
1. Cite TOUJOURS l'article de loi ou la source (format : "Art. 54 al. 1, Loi 2020-26")
2. Signale les risques avec des niveaux : BLOQUANT (non-conformite juridique), AVERTISSEMENT (risque potentiel), SUGGESTION (amelioration)
3. Ne decide jamais a la place de la PRMP — propose et explique
4. Si doute sur une interpretation, recommande de consulter la DNCMP ou l'ARMP
5. Reponds en francais, de maniere concise et operationnelle
6. Tiens compte des circulaires recentes qui peuvent modifier l'interpretation des textes de base

Les tool functions sont dans src/lib/ai/tools/ et appellent les fonctions du moteur de regles.

### Beneficiaires effectifs et genre (Circulaire 2024-002)

Depuis novembre 2024, le formulaire de divulgation des beneficiaires effectifs doit obligatoirement contenir le champ "sexe" (masculin/feminin). Le beneficiaire effectif est toute personne physique qui detient directement ou indirectement 25% ou plus des actions, 25% ou plus des droits de vote, ou le pouvoir de nommer la majorite des membres du conseil d'administration. Sanctions pour fausses declarations : Art. 123, Loi 2020-26.

### Gre a gre (Art. 34-35, Loi 2020-26)

Cas limitatifs : brevet/licence/droits exclusifs, raisons techniques et artistiques, extreme urgence (defaillance prestataire), urgence imperieuse (force majeure), autorisation Conseil des Ministres. Autorisation prealable DNCMP obligatoire. Rapport special PRMP obligatoire. Cumul gre a gre <= 10% du total des marches de l'AC par an. Controle des prix specifique durant l'execution.

## Modules de la plateforme (8 + 3 transverses)

M1 Planification PPM : import PTAB, calcul seuils auto, detection fractionnement, dashboard PPM, rapport trimestriel
M2 Generation DAO : wizard 3 etapes, assemblage fixe/variable, check-list ARMP (85 points), BAL
M3 Publication AO : AAO multi-canal, compte a rebours, eclaircissements, additifs, registre retrait
M4 Reception et ouverture : registre horodate, interface COE, quorum 3/5, PV auto, publication immediate
M5 Evaluation : 3 phases (conformite, technique, financiere), corrections arithmetiques, OAB, marges preference, rapport
M6 Attribution et contrat : notification, standstill 10j, recours, contrat, workflow approbation, beneficiaires effectifs
M7 Execution : OS, decomptes, penalites auto, avenants (seuil 30%), receptions, garanties, DGD
M8 Archivage et reporting : archivage 10 ans, audit trail immutable, rapports trimestriels auto, KPI

T1 Agent IA conseiller (Claude) : RAG juridique, panneau lateral contextuel, tool functions
T2 Moteur de recherche juridique : recherche semantique pgvector sur toute la base juridique
T3 Notifications : email + web push + SMS pour delais, recours, cautions, rapports

## Phase actuelle : Phase 0 — Fondation

Objectif : schema BDD complet, moteur de regles teste, RAG juridique operationnel, auth PRMP, dashboard de base, panneau IA.

Priorite des taches :
1. Schema Drizzle (25+ tables avec tous les enums)
2. Moteur de regles seuils.ts + delais.ts + fractionnement.ts + oab.ts + penalites.ts
3. Migration BDD + seed (3 entites test) + pgvector
4. Pipeline RAG (indexation base juridique, retriever semantique)
5. Agent IA conseiller (prompt systeme, tools, streaming)
6. Auth + layout dashboard + panneau IA
7. Tests unitaires pour chaque module
