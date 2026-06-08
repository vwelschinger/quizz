# Quizzs à Gogo

Quiz **mobile-first** au style « propagande constructiviste », avec progression **ELO joueur-vs-question**,
mode **bataille** PvP, **badges** à débloquer (dont la famille **Podium**), une monnaie **Kopecks** et son
système de **jokers**, **contestations** et **classement**. Les questions proviennent de
[La Table des Savoirs](https://latabledessavoirs.fr/).

Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · PostgreSQL.

> Déploiement cible : conteneur Docker derrière Caddy (voir `deploy/DEPLOY.md`).

## Fonctionnalités

- **Quiz solo** — saisie libre, ELO joueur-vs-question (`K=32`), bonus selon la rareté de la bonne réponse, séance de 10 + écran de correction.
- **Session à thème** — tuiles de tous les thèmes (`/themes`) ; la série ne porte que sur le thème choisi.
- **Bataille** — duel asynchrone sur les mêmes questions (10 par défaut), ELO joueur-vs-joueur, revue des réponses des deux joueurs, bilan victoires / nuls / défaites. **Bataille à thème** dédiée (`/bataille/theme`).
- **Badges** — ~89 badges à débloquer dont **36 badges de thème** (10 thèmes × 3 niveaux + 6 multi-thèmes) ; familles progression, précision, rang, **podium** (top 3 / 2ᵉ / nº 1 du classement), bataille, expertise, communauté, régularité, thème + écran de félicitations.
- **Kopecks & jokers** — les bonnes réponses (et désormais badges + batailles) rapportent des **Kopecks** (monnaie tenue par un *ledger*). On les dépense en **jokers** (Esquive, Gilet pare-balles, Caféine ×2, Dopage ×3, Seconde chance, Fourbe en bataille) achetés sur `/jokers`, activés en partie. Prix progressif (+30 %/achat). Conversions ELO ↔ Kopecks (Balle dans le pied, Recyclage). Cf. `src/lib/jokers/`.
- **Fiche joueur** (`/joueur/[id]`, depuis le classement) — stats générales, bilan batailles, badges, réussite par thème, et historique des questions répondues (réponse donnée + bonne réponse).
- **Contestation** — proposer une réponse refusée à tort ; validation par un admin (recrédit d'ELO + Kopecks, recalcul de bataille).
- **Classement** (admins affichés « hors classement »), **statistiques** (courbe d'ELO), **série quotidienne**, **notifications** in-app.
- **Console admin** — menu en **tuiles** (couleurs admin) : Contestations, Joueurs (ELO + Kopecks éditables, activité), Connexions (actifs en direct + journal), Achats (journal des achats de jokers), Synchro (scraping + token API).

## Développement local

```bash
npm install
cp .env.example .env        # renseigner les valeurs
npm run test                # tests unitaires (logique pure : ELO, badges, scoring…)
npm run typecheck
npm run dev                 # http://localhost:3000
```

Une base PostgreSQL est nécessaire pour l'app complète (pas pour les tests) :

```bash
npm run migrate             # applique db/migrations/*
npm run seed:admin          # crée le compte admin (ADMIN_USERNAME / ADMIN_PASSWORD)
```

## Logique de jeu

- **Difficulté** dérivée du taux de réussite communautaire : `high` ≤ 33 %, `middle` 34-66 %, `low` ≥ 67 %.
- **Libellé affiché** : la combinaison catégorie + difficulté est mappée sur une échelle 1-6 (`src/lib/quiz/scoring.ts`), avec un code couleur sur le badge :
  - Abordable → Très Facile (1/6, vert clair), Facile (2/6, vert), Moyenne (3/6, jaune) pour low / middle / high.
  - Expert → Difficile (4/6, orange), Très Difficile (5/6, rouge), Démoniaque (6/6, violet foncé) pour low / middle / high.
- **Badges de thème** : maîtrise par thème à 3 niveaux (volume **et** taux de réussite cumulés) + badges multi-thèmes (`src/lib/badges/themeBadges.ts`).
- **ELO question** = base catégorie (Abordable / Expert) + décalage difficulté (caché).
- **ELO joueur** mis à jour à chaque réponse (formule ELO standard, `K=32`), ELO de départ 800.
- **Kopecks** gagnés par bonne réponse = `100 − taux de réussite communautaire` (solde dépensable = `SUM(bonus_ledger.delta)`). Récompenses additionnelles : badges au déblocage et batailles à la résolution (barème `BAREME_KOPECKS.md`).
- **Jokers** : définitions figées dans `src/lib/jokers/catalog.ts` (ids = noms des SVG `public/jokers/`), effets purs testés dans `src/lib/jokers/engine.ts`. Prix progressif `nextJokerPrice` (+30 %/achat).
- Constantes ajustables dans `src/lib/quiz/config.ts` ; catalogue des badges dans `src/lib/badges/catalog.ts`.

## Structure

```
src/
├── app/                 # pages + routes API (App Router)
├── lib/
│   ├── quiz/            # moteur pur : ELO, difficulté, scoring (+ tests)
│   ├── badges/          # catalogue + badges de thème + moteur de déblocage (+ tests)
│   ├── jokers/          # catalogue, ledger Kopecks, moteur + helpers purs, backfill (+ tests)
│   ├── db/              # accès PostgreSQL
│   ├── auth/            # sessions + mots de passe
│   └── ltds/            # client + synchro La Table des Savoirs
db/migrations/           # schéma SQL (001 → 011)
scripts/                 # migrate.mjs, seed-admin.mjs
deploy/                  # Dockerfile + snippets compose / Caddy + DEPLOY.md
```

## Spécifications sources

Les évolutions récentes ont été pilotées par des documents de spécification fournis (hors dépôt, dossier
parent `Quizz/` et Google Drive). Correspondance feature ↔ spec :

| Document | Type | Ce qu'il a produit |
|---|---|---|
| `SPEC_CODE_BADGES_PODIUM.md` | code | Famille de badges **Podium** (`podium`, `vice-champion`, `numero-un`) : rang ELO, hooks, propagation. |
| `SPEC_DESIGN_BADGES_PODIUM.md` | design | Les 3 visuels podium (`public/badge-icons/{podium,vice-champion,numero-un}.svg`). |
| `SPEC_CODE_JOKERS.md` | code | Système complet de **jokers + Kopecks** : ledger, catalogue, moteur, intégration solo/bataille, routes, UI. |
| `SPEC_DESIGN_JOKERS.md` | design | Les 8 visuels octogonaux des jokers (`public/jokers/*.svg`). |
| `BAREME_KOPECKS.md` | barème | Récompenses en **Kopecks** : badges (🥉100 / 🥈250 / 🥇500) et batailles (V 50 / N 20 / D 10), + rétro-crédit. |

> Les visuels (familles Podium et Jokers) ont été fournis séparément et intégrés tels quels.

## Licence

Projet personnel — Revolution On The Run.
