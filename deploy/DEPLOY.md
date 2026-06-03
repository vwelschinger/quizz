# Déploiement — RevoRun Quizz sur le VPS

> À lire avec `../ressources/VPS_GUIDE5.md` (règles d'or) et `SOCLE_SECURITE.md`.
> Les **secrets sont générés sur le VPS** par Victor et ne transitent pas par le chat.
> Sous-domaine cible : `quizz.revorun.eu` → Caddy → conteneur `quizz` (port interne 3000).

## Pré-requis (côté Victor)

1. **DNS** : enregistrement A `quizz.revorun.eu` → `51.89.22.185` (manager OVH).
   Vérifier : `dig quizz.revorun.eu +short` → `51.89.22.185`.
2. **API La Table des Savoirs** : URL de base + token (Bearer JWT) valides.

## 1. Déposer le code

Copier le dossier `revorun-quizz/` dans `~/stack/` (via `git archive`/`scp`/`rsync`, comme goeland).
Résultat attendu : `~/stack/revorun-quizz/` (avec son `Dockerfile`).

## 2. Base de données `quizz`

Le Postgres existe déjà (volume initialisé) → les scripts `postgres-init/` ne se rejouent pas.
Créer la base à la main :

```bash
cd ~/stack
docker compose exec postgres psql -U "$POSTGRES_USER" -c "CREATE DATABASE quizz;"
```

## 3. Variables d'environnement

Ajouter à `~/stack/.env` (voir `deploy/env.snippet`). Générer les secrets **sur le VPS** :

```bash
echo "QUIZZ_SESSION_SECRET=$(openssl rand -hex 32)" >> ~/stack/.env
# Puis éditer .env pour QUIZZ_ADMIN_USERNAME / QUIZZ_ADMIN_PASSWORD / LTDS_API_BASE_URL / LTDS_API_TOKEN
```

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `TZ` sont déjà présents (partagés avec DECP).

## 4. Compose + Caddy

- Fusionner le service de `deploy/docker-compose.quizz.yml` dans `~/stack/docker-compose.yml`.
- Ajouter le bloc de `deploy/Caddyfile.snippet` dans `~/stack/Caddyfile`.

```bash
cd ~/stack
docker compose config                 # valider la syntaxe
docker compose up -d --build quizz
docker compose logs quizz --tail 50   # démarrage propre + ligne "[cron] synchro planifiée"
```

## 5. Migrations + compte admin

```bash
cd ~/stack
docker compose exec quizz node scripts/migrate.mjs      # crée les tables
docker compose exec quizz node scripts/seed-admin.mjs   # crée l'admin (ADMIN_USERNAME/PASSWORD)
```

## 6. Publier via Caddy + tester

```bash
docker compose restart caddy
curl -I https://quizz.revorun.eu                         # 200/302/307
# Surface réseau : aucun port app ni 5432 exposé sur l'hôte
sudo ss -tulpn | grep -E '3000|5432' || echo "OK: ni 3000 ni 5432 exposés"
```

Ouvrir `https://quizz.revorun.eu`, se connecter en admin, **console admin** :
renseigner l'URL/token API si pas déjà en `.env`, puis **Lancer une synchro**.

## 7. Sauvegardes

La base `quizz` contient des données **précieuses** (comptes, ELO, historique). Elle est
déjà couverte par `pg_dumpall` (cf. VPS_GUIDE5.md). Pour un dump ciblé :

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" quizz | gzip > ~/backups/quizz-$(date +%Y%m%d-%H%M%S).sql.gz
```

## 8. Mettre à jour la doc

Ajouter `quizz.revorun.eu` (service `quizz`) dans `VPS_GUIDE5.md` :
sous-domaines actifs, arborescence (`~/stack/revorun-quizz/`), note backup base `quizz`.

## Mettre à jour l'app plus tard

```bash
# remplacer le code dans ~/stack/revorun-quizz/ puis :
cd ~/stack && docker compose up -d --build quizz
docker compose exec quizz node scripts/migrate.mjs   # si nouvelles migrations
```
