# Quizzs à Gogo

Quiz **mobile-first** au style « propagande constructiviste », avec progression **ELO joueur-vs-question**,
mode **bataille** PvP, **badges** à débloquer, **contestations** et **classement**. Les questions
proviennent de [La Table des Savoirs](https://latabledessavoirs.fr/).

Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · PostgreSQL.

> Déploiement cible : conteneur Docker derrière Caddy (voir `deploy/DEPLOY.md`).

## Fonctionnalités

- **Quiz solo** — saisie libre, ELO joueur-vs-question (`K=32`), bonus selon la rareté de la bonne réponse, séance de 10 + écran de correction.
- **Bataille** — duel asynchrone sur les mêmes questions, ELO joueur-vs-joueur, revue des réponses des deux joueurs.
- **Badges** — 50 badges à débloquer (progression, précision, rang, bataille, expertise, communauté, régularité) + écran de félicitations.
- **Contestation** — proposer une réponse refusée à tort ; validation par un admin (recrédit d'ELO, recalcul de bataille).
- **Classement**, **statistiques** (courbe d'ELO), **série quotidienne**, **notifications** in-app.
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

- **Difficulté** dérivée du taux de réussite communautaire : High ≤ 33 %, Middle 34-66 %, Low ≥ 67 %.
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
│   ├── badges/          # catalogue + moteur de déblocage (+ tests)
│   ├── db/              # accès PostgreSQL
│   ├── auth/            # sessions + mots de passe
│   └── ltds/            # client + synchro La Table des Savoirs
db/migrations/           # schéma SQL (001 → 007)
scripts/                 # migrate.mjs, seed-admin.mjs
deploy/                  # Dockerfile + snippets compose / Caddy + DEPLOY.md
```

## Licence

Projet personnel — Revolution On The Run.
