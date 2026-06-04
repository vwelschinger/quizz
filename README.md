# Quizzs à Gogo

Quiz **mobile-first** au style « propagande constructiviste », avec progression **ELO joueur-vs-question**,
mode **bataille** PvP, **badges** à débloquer, **contestations** et **classement**. Les questions
proviennent de [La Table des Savoirs](https://latabledessavoirs.fr/).

Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · PostgreSQL.

> Déploiement cible : conteneur Docker derrière Caddy (voir `deploy/DEPLOY.md`).

## Fonctionnalités

- **Quiz solo** — saisie libre, ELO joueur-vs-question (`K=32`), bonus selon la rareté de la bonne réponse, séance de 10 + écran de correction.
- **Session à thème** — tuiles de tous les thèmes (`/themes`) ; la série ne porte que sur le thème choisi.
- **Bataille** — duel asynchrone sur les mêmes questions (10 par défaut), ELO joueur-vs-joueur, revue des réponses des deux joueurs, bilan victoires / nuls / défaites. **Bataille à thème** dédiée (`/bataille/theme`).
- **Badges** — 85 badges à débloquer dont **36 badges de thème** (10 thèmes × 3 niveaux + 6 multi-thèmes), familles progression, précision, rang, bataille, expertise, communauté, régularité, thème + écran de félicitations.
- **Fiche joueur** (`/joueur/[id]`, depuis le classement) — stats générales, bilan batailles, badges, réussite par thème, et historique des questions répondues (réponse donnée + bonne réponse).
- **Contestation** — proposer une réponse refusée à tort ; validation par un admin (recrédit d'ELO, recalcul de bataille).
- **Classement** (admins affichés « hors classement »), **statistiques** (courbe d'ELO), **série quotidienne**, **notifications** in-app.
- **Console admin** — synchro des questions, gestion des comptes, ELO manuel, contestations.

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
- **Bonus** par bonne réponse = `100 − taux de réussite communautaire`.
- Constantes ajustables dans `src/lib/quiz/config.ts` ; catalogue des badges dans `src/lib/badges/catalog.ts`.

## Structure

```
src/
├── app/                 # pages + routes API (App Router)
├── lib/
│   ├── quiz/            # moteur pur : ELO, difficulté, scoring (+ tests)
│   ├── badges/          # catalogue + badges de thème + moteur de déblocage (+ tests)
│   ├── db/              # accès PostgreSQL
│   ├── auth/            # sessions + mots de passe
│   └── ltds/            # client + synchro La Table des Savoirs
db/migrations/           # schéma SQL (001 → 007)
scripts/                 # migrate.mjs, seed-admin.mjs
deploy/                  # Dockerfile + snippets compose / Caddy + DEPLOY.md
```

## Licence

Projet personnel — Revolution On The Run.
