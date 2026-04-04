/**
 * Script d'indexation de la base juridique (RAG)
 * Lit les textes de loi depuis data/loi/ et les indexe dans pgvector
 *
 * Usage : npm run rag:index
 */

import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { indexerTousTextes } from "../src/lib/ai/rag/indexer";
import type { ChunkInput } from "../src/lib/ai/rag/indexer";

// ---------------------------------------------------------------------------
// Textes juridiques integres directement (base initiale)
// Les textes complets seront en data/loi/*.json
// ---------------------------------------------------------------------------

const TEXTES_BASE: ChunkInput[] = [
  // Extraits cles de la Loi 2020-26 — a completer avec les 127 articles
  {
    source: "Loi 2020-26",
    articleRef: "Art. 54",
    titre: "Delais de remise des offres",
    contenu: `Article 54. Le delai de remise des offres est fixe selon la nature et le montant du marche :
- Appel d'offres national (au-dessus des seuils de passation) : 21 jours calendaires minimum
- Appel d'offres communautaire (seuils UEMOA) : 30 jours calendaires minimum
- Prequalification nationale : 21 jours calendaires minimum
- Prequalification communautaire : 30 jours calendaires minimum

Ces delais courent a compter de la date de premiere publication de l'avis d'appel d'offres.
Tout candidat peut demander des eclaircissements sur le dossier d'appel d'offres, dans les 10 jours calendaires suivant la publication pour un AO national, ou 15 jours pour un AO international.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 79",
    titre: "Attribution provisoire et standstill",
    contenu: `Article 79. L'autorite contractante notifie le resultat de l'appel d'offres a tous les soumissionnaires ayant participe.

Al. 3 : Apres notification des resultats provisoires, un delai de standstill minimum de 10 jours calendaires doit s'ecouler avant la signature du marche. Ce delai permet aux candidats evincis de deposer un recours devant l'autorite contractante.

Durant le standstill, l'autorite contractante ne peut pas signer le marche sauf en cas d'urgence imperieuse.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 81",
    titre: "Offres anormalement basses",
    contenu: `Article 81. Une offre est presumee anormalement basse lorsque son montant est inferieur au seuil M calcule comme suit :

M = 0,80 x (0,6 x Fm + 0,4 x Fc)

Ou :
- Fm = moyenne arithmetique des offres financieres corrigees de tous les soumissionnaires
- Fc = estimation previsionnelle de l'autorite contractante pour le lot considere

Avant tout rejet d'une offre presumee anormalement basse, l'autorite contractante est tenue de demander par ecrit des justifications au soumissionnaire concerne. Le soumissionnaire dispose d'un delai raisonnable pour fournir ces justifications.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 84",
    titre: "Avenants — Plafond 30%",
    contenu: `Article 84. Des avenants au marche peuvent etre conclus pour couvrir des travaux, fournitures ou services suppleants non prevus au marche initial, a condition que :
1. La nature du marche ne soit pas modifiee substantiellement
2. Le montant cumule des avenants ne depasse pas 30% du montant initial du marche

Au-dela de ce seuil, un nouveau marche doit etre passe selon les procedures applicables.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 86",
    titre: "Notification definitive du marche",
    contenu: `Article 86. Al. 2 : La notification definitive du marche intervient dans les 3 jours calendaires suivant son approbation par l'autorite approbatrice.

La notification definitive rend le marche executoire et permet a l'attributaire de commencer les prestations a la date prevue dans le contrat.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 87",
    titre: "Publication de l'avis d'attribution definitive",
    contenu: `Article 87. L'avis d'attribution definitive du marche est publie dans les 15 jours calendaires suivant l'entree en vigueur du marche.

Cet avis mentionne notamment : la denomination du titulaire, le montant du marche, la nature des prestations, et la duree d'execution.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 101",
    titre: "Sous-traitance — Plafond 40%",
    contenu: `Article 101. Le titulaire peut sous-traiter l'execution d'une partie du marche a condition que :
1. La sous-traitance ne depasse pas 40% de la valeur globale du marche
2. Le titulaire reste responsable de l'execution devant l'autorite contractante
3. Les sous-traitants ne peuvent eux-memes sous-traiter

Le titulaire doit obtenir l'accord prealable de l'autorite contractante pour tout recours a la sous-traitance.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 113",
    titre: "Mise en demeure avant penalites",
    contenu: `Article 113. Avant d'appliquer les penalites de retard, l'autorite contractante doit mettre en demeure le titulaire par lettre recommandee avec accuse de reception.

Le titulaire dispose d'un delai de 8 jours calendaires a compter de la reception de la mise en demeure pour remedier au retard ou fournir des explications.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 114",
    titre: "Penalites de retard — Plafond 10%",
    contenu: `Article 114. Les penalites de retard sont calculees comme suit :

Penalite = Montant TTC x Taux journalier x Nombre de jours de retard

Le taux journalier est fixe dans le CCAP (generalement 1/2000e du montant TTC).

Le montant cumule des penalites ne peut exceder 10% du montant TTC du marche (base + avenants). Lorsque ce plafond est atteint, le marche est resilier de plein droit.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 116",
    titre: "Recours devant l'autorite contractante",
    contenu: `Article 116. Tout candidat qui s'estime lese par les decisions de l'autorite contractante peut introduire un recours.

- Depot du recours : dans les 5 jours ouvrables suivant la publication de l'attribution provisoire
- Reponse de l'AC : dans les 3 jours ouvrables suivant la reception du recours
- Delai de paiement : 60 jours calendaires maximum apres validation du decompte`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 117",
    titre: "Recours devant l'ARMP",
    contenu: `Article 117. Si la reponse de l'autorite contractante n'est pas satisfaisante ou si l'AC ne repond pas dans les delais :

- Le candidat peut saisir l'ARMP dans les 2 jours ouvrables suivant la notification de la decision AC
- L'ARMP rend sa decision dans les 7 jours ouvrables suivant la saisine
- En cas de decision favorable, l'AC dispose de 5 jours ouvrables pour se mettre en conformite`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 24",
    titre: "Plan de Passation des Marches (PPM) et anti-fractionnement",
    contenu: `Article 24. Al. 1 : Le Plan de Passation des Marches (PPM) doit etre publie dans les 10 jours calendaires suivant l'approbation du budget de l'autorite contractante.

Al. 7 : Il est interdit de fractionner les marches pour se soustraire aux procedures de passation. Le fractionnement consiste a diviser intentionnellement un marche en plusieurs marches dont le montant individuel est inferieur aux seuils de passation, mais dont le cumul les depasse.`,
  },
  {
    source: "Loi 2020-26",
    articleRef: "Art. 126",
    titre: "Sanctions penales du fractionnement",
    contenu: `Article 126. Le fractionnement des marches publics est puni de 5 a 10 ans d'emprisonnement et d'une amende de 50 000 000 a 500 000 000 FCFA.

Ces sanctions s'appliquent a toute personne ayant participe a la conception, la validation ou l'execution d'un marche fractionne.`,
  },
  // Decret 2020-599
  {
    source: "Decret 2020-599",
    articleRef: "Art. 1",
    titre: "Seuils de passation — Toutes AC standard",
    contenu: `Article 1. Pour toutes les autorites contractantes, a l'exception des communes sans statut particulier, les seuils de passation en appel d'offres sont :
- Travaux : 100 000 000 FCFA HT
- Fournitures ou services : 70 000 000 FCFA HT
- Prestations intellectuelles confiees a des cabinets : 50 000 000 FCFA HT
- Prestations intellectuelles confiees a des consultants individuels : 20 000 000 FCFA HT`,
  },
  {
    source: "Decret 2020-599",
    articleRef: "Art. 2",
    titre: "Seuils de passation — Communes sans statut particulier",
    contenu: `Article 2. Pour les communes sans statut particulier, les seuils de passation en appel d'offres sont :
- Travaux : 35 000 000 FCFA HT
- Fournitures ou services : 25 000 000 FCFA HT
- Prestations intellectuelles confiees a des cabinets : 20 000 000 FCFA HT
- Prestations intellectuelles confiees a des consultants individuels : 15 000 000 FCFA HT`,
  },
  {
    source: "Decret 2020-599",
    articleRef: "Art. 3-6",
    titre: "Seuils de sollicitation de prix (DRP et DC)",
    contenu: `Articles 3 a 6. Les seuils de sollicitation de prix sont les suivants :

- Demande de Renseignements et de Prix (DRP) : montant superieur a 10 000 000 FCFA HT et inferieur aux seuils de passation en AO
- Demande de Cotation (DC) : montant superieur a 4 000 000 et inferieur ou egal a 10 000 000 FCFA HT
- Dispense de mise en concurrence : montant inferieur ou egal a 4 000 000 FCFA HT (3 pro forma minimum obligatoires)`,
  },
  {
    source: "Decret 2020-599",
    articleRef: "Art. 8",
    titre: "Seuils communautaires UEMOA",
    contenu: `Article 8. Au-dessus des seuils suivants, les marches font l'objet d'un appel d'offres communautaire ouvert aux entreprises des pays membres de l'UEMOA.

Pour l'Etat, les collectivites territoriales et les etablissements publics :
- Travaux : 1 000 000 000 FCFA
- Fournitures et services : 500 000 000 FCFA
- Prestations intellectuelles : 150 000 000 FCFA

Pour les organismes de droit public, societes nationales et SAPM :
- Travaux : 1 500 000 000 FCFA
- Fournitures et services : 750 000 000 FCFA
- Prestations intellectuelles : 200 000 000 FCFA`,
  },
  // Decret 2020-600
  {
    source: "Decret 2020-600",
    articleRef: "Art. 3",
    titre: "Delais des organes de passation",
    contenu: `Article 3. Les organes de passation sont tenus de respecter les delais suivants :
- Preparation du DAO : au moins 30 jours calendaires avant la date de lancement prevue au PPM
- Transmission du DAO a l'organe de controle : au moins 10 jours ouvrables avant la date de lancement
- Prise en compte des observations de l'organe de controle : 2 jours ouvrables
- Publication de l'AAO apres BAL : dans les 2 jours ouvrables
- Evaluation des offres par la COE : 10 jours ouvrables apres la date limite de reception des offres
- Transmission du rapport d'evaluation a l'organe de controle : 1 jour ouvrable
- Notification des resultats aux candidats : 1 jour ouvrable apres reception de l'avis de l'organe`,
  },
  {
    source: "Decret 2020-600",
    articleRef: "Art. 4",
    titre: "Delais DNCMP et DDCMP",
    contenu: `Article 4. La DNCMP et la DDCMP sont tenues de respecter les delais suivants :
- Avis sur les DAO : 4 jours ouvrables
- Publication de l'avis d'appel a concurrence : 1 jour ouvrable apres reception de l'avis
- Etude du rapport d'analyse des offres : 5 jours ouvrables
- Publication du PV d'attribution provisoire : 1 jour ouvrable
- Publication de l'avis d'attribution definitif : 1 jour ouvrable
- Examen juridique et technique, visa et authentification : 3 jours ouvrables
- Tout autre dossier : 3 jours ouvrables`,
  },
  {
    source: "Decret 2020-600",
    articleRef: "Art. 5",
    titre: "Delais CCMP",
    contenu: `Article 5. Le CCMP est tenu de respecter les delais suivants :
- Avis sur les DAO : 3 jours ouvrables
- Visa pour Bon a Lancer (BAL) : 1 jour ouvrable
- Etude du rapport d'evaluation : 3 jours ouvrables
- Examen juridique et technique, visa, authentification : 3 jours ouvrables
- Tout autre dossier : 3 jours ouvrables`,
  },
  {
    source: "Decret 2020-600",
    articleRef: "Art. 6",
    titre: "Delais des autorites approbatrices",
    contenu: `Article 6. L'autorite approbatrice dispose de 5 jours ouvrables pour approuver le marche a compter de sa reception.

Article 7 : Le projet de contrat est elabore en 3 exemplaires.`,
  },
  {
    source: "Decret 2020-600",
    articleRef: "Art. 8",
    titre: "Non-respect des delais par les organes de controle",
    contenu: `Article 8. Si un organe de controle ne respecte pas ses delais, la PRMP saisit l'ARMP qui met en demeure l'organe dans un delai de 72 heures. Passe ce delai sans reaction de l'organe de controle, l'ARMP enjoint a la PRMP de poursuivre la procedure sans attendre l'avis de l'organe.`,
  },
  // Manuel de Procedures
  {
    source: "Manuel de Procedures ARMP",
    articleRef: "Section 2.4",
    titre: "Seuils de controle a priori",
    contenu: `Section 2.4. Les seuils de controle a priori par la DNCMP sont les suivants (Table 1, p.19) :

Pour les AC standard (sauf communes sans statut et EP dont CCMP ne sont pas delegues) :
- Travaux : >= 500 000 000 FCFA
- Fournitures et services : >= 300 000 000 FCFA
- PI cabinets : >= 200 000 000 FCFA
- PI consultants individuels : >= 100 000 000 FCFA

Pour les communes sans statut + EP dont CCMP ne sont pas delegues :
- Travaux : >= 300 000 000 FCFA
- Fournitures et services : >= 150 000 000 FCFA
- PI cabinets : >= 120 000 000 FCFA
- PI consultants individuels : >= 80 000 000 FCFA

CCMP : tout marche >= seuils de passation et < seuils DNCMP.`,
  },
  {
    source: "Circulaire ARMP 2023-002",
    articleRef: "Section 3",
    titre: "Recours DRP/DC — delais specifiques",
    contenu: `Circulaire ARMP 2023-002. Pour les procedures DRP et DC, les delais de recours sont :
- Depot du recours devant l'AC : 2 jours ouvrables apres notification des resultats
- Reponse de l'AC : 2 jours ouvrables apres reception du recours

Ces delais sont inferieurs aux delais applicables aux AO (5j et 3j) compte tenu de la simplification des procedures sous-seuils.`,
  },
  {
    source: "Circulaire ARMP 2024-002",
    articleRef: "Section 2",
    titre: "Beneficiaires effectifs — champ sexe obligatoire",
    contenu: `Circulaire ARMP 2024-002 (novembre 2024). Le formulaire de divulgation des beneficiaires effectifs doit obligatoirement comporter le champ "sexe" (masculin/feminin) depuis novembre 2024.

Est considere comme beneficiaire effectif toute personne physique qui :
- Detient directement ou indirectement 25% ou plus des actions de la societe
- Detient directement ou indirectement 25% ou plus des droits de vote
- Dispose du pouvoir de nommer la majorite des membres du conseil d'administration

Sanctions pour fausses declarations : Art. 123, Loi 2020-26.`,
  },
];

async function main() {
  console.log("🔍 Indexation de la base juridique PRMP-Pro...\n");

  // Charger les chunks depuis data/loi/*.json si disponibles
  let allChunks = [...TEXTES_BASE];

  try {
    const dataDir = join(process.cwd(), "data", "loi");
    const files = await readdir(dataDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      const content = await readFile(join(dataDir, file), "utf-8");
      const data = JSON.parse(content) as ChunkInput[];
      allChunks = [...allChunks, ...data];
      console.log(`  📖 ${file} : ${data.length} chunks charges`);
    }
  } catch {
    console.log("  ℹ️  Pas de fichiers JSON dans data/loi/ — utilisation des textes integres");
  }

  console.log(`\n📦 Total : ${allChunks.length} chunks a indexer\n`);

  const rapport = await indexerTousTextes(allChunks);

  console.log("\n📊 Rapport d'indexation :");
  console.log(`  Total : ${rapport.totalChunks} chunks`);
  console.log(`  Indexes : ${rapport.indexed}`);
  console.log(`  Erreurs : ${rapport.errors}`);
  console.log(`  Duree : ${rapport.durationMs}ms`);
  console.log(`  Sources : ${rapport.sources.join(", ")}`);
}

main().catch((err) => {
  console.error("❌ Erreur d'indexation :", err);
  process.exit(1);
});
