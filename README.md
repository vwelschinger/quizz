# RevoRun Quizz

Quiz constructiviste (mobile-first) avec progression **ELO joueur-vs-question**, alimenté par les
quiz de [La Table des Savoirs](https://latabledessavoirs.fr/). Next.js + TailwindCSS + PostgreSQL.

> Déploiement cible : conteneur Docker sur le VPS, derrière Caddy, sur `quizz.revorun.eu`.
> Voir `deploy/` et la documentation VPS (`../ressources/VPS_GUIDE5.md`).

## Stack

- **Next.js (App Router)** — UI + routes API + tâche planifiée (synchro quotidienne).
- **TailwindCSS** — styles (thème minimal pour l'instant, charte à venir).
- **PostgreSQL** (`pg`) — base `quizz` (questions, users, answers, sessions, settings).
- **Auth** — sessions en base + cookie httpOnly, mots de passe `bcryptjs`.

## Développement local

```bash
npm install
cp .env.example .env        # puis renseigner les valeurs
npm run test                # tests du moteur ELO / difficulté / bonus
npm run typecheck           # vérification TypeScript
npm run dev                 # http://localhost:3000
```

Une base PostgreSQL est nécessaire pour l'app complète (pas pour les tests du moteur) :

```bash
npm run migrate             # applique db/migrations/*
npm run seed:admin          # crée le compte admin (ADMIN_USERNAME / ADMIN_PASSWORD)
```

## Logique de jeu (cœur du PRD)

- **Difficulté** dérivée du taux de réussite communautaire : High ≤ 33 %, Middle 34-66 %, Low ≥ 67 %.
- **ELO question** = base catégorie (Abordable/Expert) + décalage difficulté. Caché.
- **ELO joueur** mis à jour à chaque réponse (formule ELO standard, `K=32`).
- **Bonus** par bonne réponse = `100 − taux de réussite communautaire`.
- Constantes ajustables dans `src/lib/quiz/config.ts`.

## Structure

```
src/
├── app/                 # pages + routes API (App Router)
├── lib/
│   ├── quiz/            # moteur pur : ELO, difficulté, scoring (+ tests)
│   ├── db/              # accès PostgreSQL
│   ├── auth/            # sessions + mots de passe
│   └── ltds/            # client + synchro La Table des Savoirs
db/migrations/           # schéma SQL
scripts/                 # migrate.mjs, seed-admin.mjs
deploy/                  # Dockerfile + snippets compose/Caddy
```
