# Base documentaire juridique — PRMP-Pro

Déposez vos documents dans les dossiers correspondants.
Le pipeline RAG indexe automatiquement tout ce qui est placé ici.

## Structure des dossiers

```
data/
  loi/                  ← Lois et codes
  decrets/              ← Décrets d'application
  manuels/              ← Manuels de procédures ARMP
  circulaires/          ← Circulaires et avis ARMP
  dao-types/            ← DAO-types officiels ARMP
  rapports-types/       ← Modèles de rapports (PV, évaluation, etc.)
  avis-armp/            ← Avis et décisions ARMP
  jurisprudence/        ← Décisions de recours, jurisprudence
```

## Documents à déposer

### loi/
| Fichier | Description |
|---------|-------------|
| `loi-2020-26.pdf` | Code des marchés publics — 127 articles |
| `loi-2024-30-ppp.pdf` | Loi PPP |

### decrets/
| Fichier | Description |
|---------|-------------|
| `decret-2020-595.pdf` | |
| `decret-2020-596.pdf` | Rapport trimestriel PRMP |
| `decret-2020-597.pdf` | |
| `decret-2020-598.pdf` | |
| `decret-2020-599.pdf` | Seuils de passation et contrôle |
| `decret-2020-600.pdf` | Délais légaux |
| `decret-2020-601.pdf` | |
| `decret-2020-602.pdf` | DAO-types |
| `decret-2020-603.pdf` | |
| `decret-2020-604.pdf` | |
| `decret-2020-605.pdf` | Demandes de cotation |

### manuels/
| Fichier | Description |
|---------|-------------|
| `manuel-procedures-passation-2023.pdf` | Manuel ARMP passation — 155 pages (juin 2023) |
| `manuel-controle-2022.pdf` | Manuel de contrôle (juin 2022, MAJ juin 2023) |
| `manuel-recours-2023.pdf` | Manuel traitement recours et auto-saisines (juin 2023) |

### circulaires/
| Fichier | Description |
|---------|-------------|
| `circulaire-2022-001.pdf` | |
| `circulaire-2022-002.pdf` | |
| `circulaire-2023-002.pdf` | Délais recours DRP/DC |
| `circulaire-2024-001.pdf` | |
| `circulaire-2024-002.pdf` | Bénéficiaires effectifs + champ sexe |
| `circulaire-2024-003.pdf` | |
| `circulaire-2024-004.pdf` | |
| `circulaire-2024-005.pdf` | |
| `circulaire-2025-001.pdf` | |
| `circulaire-2025-002.pdf` | |

### dao-types/
| Fichier | Description |
|---------|-------------|
| `dao-type-travaux.docx` | DAO-type travaux (Décret 2020-602, juin 2023) |
| `dao-type-fournitures.docx` | DAO-type fournitures |
| `dao-type-services.docx` | DAO-type services |
| `dao-type-sfqc.docx` | DAO-type prestations intellectuelles SFQC |
| `dao-type-prequalification.docx` | DAO-type préqualification |

### rapports-types/
| Fichier | Description |
|---------|-------------|
| `pv-ouverture-type.docx` | PV d'ouverture des plis |
| `rapport-evaluation-type.docx` | Rapport d'évaluation des offres |
| `rapport-trimestriel-type.docx` | Rapport trimestriel PRMP |
| `contrat-type-travaux.docx` | Modèle de contrat travaux |
| `contrat-type-fournitures.docx` | Modèle de contrat fournitures |

## Formats acceptés

- **PDF** — recommandé pour les lois et manuels
- **DOCX** — pour les DAO-types et modèles
- **TXT / MD** — texte brut si disponible

## Après dépôt des documents

Lancer l'indexation RAG :

```bash
# Avec la clé Voyage AI configurée dans .env.local
VOYAGE_API_KEY=votre-cle npx tsx scripts/index-juridique.ts
```

Cela indexe tous les documents dans la table `chunks_juridiques`
avec des embeddings vectoriels pour la recherche sémantique.
