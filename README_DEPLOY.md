# VPS Deploy Guide

Deploy target: one VPS running the Next.js app, PostgreSQL, and Nginx reverse proxy.

## Server Requirements

- Ubuntu 22.04 or newer
- 2 CPU / 2 GB RAM minimum for MVP
- Node.js 22 LTS if running without Docker
- Docker Engine
- Docker Compose plugin
- Nginx
- Certbot for HTTPS

## Environment

Create `.env` on the server. Do not commit it.

Required variables:

```env
DATABASE_URL="postgresql://finance:change-me@postgres:5432/finance_dashboard_hub?schema=public"
POSTGRES_DB="finance_dashboard_hub"
POSTGRES_USER="finance"
POSTGRES_PASSWORD="change-me"
ADMIN_EMAIL="finance-admin@example.com"
ADMIN_PASSWORD="change-me"
SESSION_SECRET="replace-with-a-long-random-secret"
NODE_ENV="production"
DISABLE_AUTH="false"
NEXT_PUBLIC_APP_NAME="Finance Dashboard Hub"
```

Generate `SESSION_SECRET`:

```bash
openssl rand -base64 48
```

Use a strong one-time `ADMIN_PASSWORD`, then rotate it after the first login if password management is added later.

## Docker Production Deploy

Build and start PostgreSQL plus the app:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Check containers:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f app
```

Apply Prisma schema:

```bash
docker compose -f docker-compose.production.yml exec app npx prisma db push
```

For a migration-based production flow, create migrations in development and run:

```bash
docker compose -f docker-compose.production.yml exec app npx prisma migrate deploy
```

Seed admin user and base records:

```bash
docker compose -f docker-compose.production.yml exec app npm run prisma:seed
```

Run smoke checks from the host:

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run smoke
```

## Manual Node Deploy

If not using Docker for the app, install dependencies and build:

```bash
npm ci
npm run prisma:generate
npx prisma db push
npm run prisma:seed
npm run build
NODE_ENV=production npm run start
```

Because `next.config.ts` uses `output: "standalone"`, a standalone run is also possible after build:

```bash
node .next/standalone/server.js
```

## Nginx Reverse Proxy

Example site config:

```nginx
server {
  listen 80;
  server_name finance.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/finance-dashboard-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

Issue a certificate:

```bash
sudo certbot --nginx -d finance.example.com
```

Verify auto-renewal:

```bash
sudo certbot renew --dry-run
```

## Post-Deploy Checklist

- `.env` exists on the server and contains production values.
- `DISABLE_AUTH` is `false`.
- PostgreSQL container is healthy.
- Prisma schema has been applied with `db push` or `migrate deploy`.
- `npm run prisma:seed` completed and admin login works.
- `npm run build` completed during image or manual build.
- Nginx config passes `sudo nginx -t`.
- HTTPS certificate is active.
- Smoke routes return 200:
  - `/`
  - `/login`
  - `/dashboards/plan-fact`
  - `/armenia`
  - `/tv/armenia`
  - `/admin/users`
  - `/admin/imports`
  - `/admin/metrics`
  - `/api/dashboards/plan-fact`
  - `/api/dashboards/armenia`
- Plan-fact dashboard opens after login.
- Armenia dashboard opens after login.
- Office TV opens and shows the dark fullscreen layout.
