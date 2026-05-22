# VPS Deploy Guide

Use this guide for the production deployment of `finance-dashboard-hub`.

Detailed operational steps are in `docs/DEPLOYMENT_RUNBOOK.md`. Backup and restore steps are in `docs/BACKUP_RESTORE.md`.

## Requirements

- Ubuntu 22.04 or newer
- Node.js 22 LTS on the host for `npm run smoke`
- Docker Engine and Docker Compose plugin
- Nginx
- Certbot for HTTPS
- Git and SSH access for the deploy user

## Production Environment

Create `.env.production` on the server:

```bash
cp .env.production.example .env.production
```

Required values:

```env
APP_BASE_URL="https://dashboard.example.com"
PORT="3000"
DATABASE_URL="postgresql://finance:change-me@postgres:5432/finance_dashboard_hub?schema=public"
POSTGRES_DB="finance_dashboard_hub"
POSTGRES_USER="finance"
POSTGRES_PASSWORD="change-me"
ADMIN_EMAIL="finance-admin@example.com"
ADMIN_PASSWORD="change-me"
SESSION_SECRET="replace-with-a-long-random-secret"
NODE_ENV="production"
DISABLE_AUTH="false"
```

Generate `SESSION_SECRET`:

```bash
openssl rand -base64 48
```

Never commit `.env.production`.

## Docker Deploy

Start PostgreSQL and the app:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Apply Prisma schema:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npx prisma db push
```

Seed only when explicitly needed:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npm run prisma:seed
```

Check containers:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

## Deploy Script

Manual production deploy:

```bash
BASE_URL=https://dashboard.example.com bash scripts/deploy.sh
```

Run seed explicitly:

```bash
RUN_SEED=true BASE_URL=https://dashboard.example.com bash scripts/deploy.sh
```

The script pulls latest code, rebuilds containers, runs `prisma db push`, skips seed by default, runs smoke tests, and prints container status.

## GitHub Actions

CI runs on pull requests and pushes to `main`.

Deploy is manual through `workflow_dispatch` and requires repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `PRODUCTION_BASE_URL`

The deploy workflow connects over SSH and runs `scripts/deploy.sh` on the server.

## Nginx

Use `nginx/finance-dashboard-hub.conf` as the site config. Replace:

```text
dashboard.example.com
```

Enable and reload:

```bash
sudo cp nginx/finance-dashboard-hub.conf /etc/nginx/sites-available/finance-dashboard-hub
sudo ln -s /etc/nginx/sites-available/finance-dashboard-hub /etc/nginx/sites-enabled/finance-dashboard-hub
sudo nginx -t
sudo systemctl reload nginx
```

The app is bound to `127.0.0.1:3000`; public traffic should enter through Nginx.

## HTTPS

```bash
sudo certbot --nginx -d dashboard.example.com
sudo certbot renew --dry-run
```

## Smoke Test

```bash
BASE_URL=https://dashboard.example.com npm run smoke
```

Expected result: all routes print `200 OK`.

## Post-Deploy Checklist

- `.env.production` exists and is not committed.
- `DISABLE_AUTH=false`.
- PostgreSQL is healthy.
- Prisma schema was applied.
- Nginx config passes `sudo nginx -t`.
- HTTPS certificate is active.
- `BASE_URL=https://dashboard.example.com npm run smoke` passes.
- `/login`, `/dashboards/plan-fact`, `/armenia`, and `/tv/armenia` open manually.
