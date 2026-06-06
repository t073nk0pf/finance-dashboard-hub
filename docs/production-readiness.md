# Production Readiness Notes

## Current Candidate

- Candidate branch: `refactor/product-core`
- Production branch: `main`
- Production commit before deploy: `0ce3e7a Refresh enterprise visual design`
- Candidate tag: `v1-product-core-production-visual-merge`
- Readiness patch tag: `v1-production-readiness-patch`
- Prisma migration tag: `v1-product-core-prisma-migration`

## Required Checks Before Merge/Deploy

Run checks sequentially:

```bash
npm run lint
npm run build
npm audit --omit=dev
npm run check:analytics
BASE_URL=http://localhost:3000 npm run smoke
```

If `BASE_URL=http://localhost:3000 npm run smoke` is used, start the local app first.

## Required Production Env

Required existing production values:

```env
APP_BASE_URL="https://data.dashdodoboard.ru"
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
NEXT_PUBLIC_APP_NAME="Finance Dashboard Hub"
```

Product-core flags:

```env
USE_ANALYTICS_ENGINE=false
USE_DASHBOARD_TEMPLATE=false
NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED=false
NEXT_PUBLIC_FORECAST_ADVANCED_FILTERS_ENABLED=false
NEXT_PUBLIC_ARMENIA_ADVANCED_FILTERS_ENABLED=false
```

Dodo placeholders, keep empty unless Dodo sync is explicitly enabled:

```env
DODO_API_BASE_URL=
DODO_API_CLIENT_ID=
DODO_API_CLIENT_SECRET=
DODO_API_ACCESS_TOKEN=
DODO_API_REFRESH_TOKEN=
DODO_API_ORGANIZATION_ID=
DODO_API_TIMEOUT_MS=
```

## Feature Flag Recommendation For First Deploy

Recommended first production deploy:

```env
USE_ANALYTICS_ENGINE=false
USE_DASHBOARD_TEMPLATE=false
NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED=false
NEXT_PUBLIC_FORECAST_ADVANCED_FILTERS_ENABLED=false
NEXT_PUBLIC_ARMENIA_ADVANCED_FILTERS_ENABLED=false
```

Enable flags gradually after production smoke and manual checks. Treat `NEXT_PUBLIC_*` values as build-time sensitive in Next.js: if a public flag changes, rebuild the app image with the intended value.

## DB Strategy

Current status:

- `prisma/migrations` now contains a baseline migration and a product-core schema migration.
- Production is expected to already have the baseline schema but no historical `_prisma_migrations` rows.
- `prisma/schema.prisma` expanded significantly in product-core.
- Do not run production database commands during readiness review.

Migration files:

- `20260606230000_baseline_production_schema`
- `20260606230109_product_core_schema`

Preferred production-safe path for the first migration deploy:

1. Create and verify a PostgreSQL backup.
2. Confirm production is still on the baseline schema.
3. Mark the baseline migration as already applied. Do not execute the baseline SQL against an existing production database:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app \
  npx prisma migrate resolve --applied 20260606230000_baseline_production_schema
```

4. Check migration status:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app \
  npx prisma migrate status
```

5. Apply the product-core migration:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app \
  npx prisma migrate deploy
```

6. Re-check status:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app \
  npx prisma migrate status
```

For a clean staging database with no existing schema, run only:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app \
  npx prisma migrate deploy
```

Fallback path:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npx prisma db push
```

Use `prisma db push` only after PostgreSQL backup, explicit acceptance, and a clear reason not to use migrations. It is faster, but weaker than migrations for production drift control and rollback reasoning.

## Seed Policy

Do not run seed automatically on production.

Run seed only after an explicit decision about the exact production data to create or update:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npm run prisma:seed
```

## Backup Command

Create a PostgreSQL backup before merge/deploy:

```bash
timestamp=$(date +%Y-%m-%d_%H-%M-%S)
mkdir -p backups
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges \
  | gzip > "backups/finance-dashboard-hub-$timestamp.sql.gz"
ls -lh "backups/finance-dashboard-hub-$timestamp.sql.gz"
```

Record the backup filename, production commit, and deployment timestamp.

## Deploy Checklist

Do not run these commands without explicit approval.

```bash
git fetch origin --tags
git checkout main
git pull --ff-only origin main
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Choose one DB command:

```bash
# If Prisma migrations exist and were reviewed:
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app \
  npx prisma migrate resolve --applied 20260606230000_baseline_production_schema
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app \
  npx prisma migrate status
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npx prisma migrate deploy

# If the team consciously accepts db push for this release:
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npx prisma db push
```

Post-deploy smoke:

```bash
BASE_URL=https://data.dashdodoboard.ru npm run smoke
```

Manual checks:

- `/login`
- `/dashboards/plan-fact`
- `/dashboards/forecast`
- `/armenia`
- `/tv/armenia`
- `/admin/imports`
- `/admin/data-sources`

## Rollback Plan

Current rollback commit:

```text
0ce3e7a Refresh enterprise visual design
```

Redeploy previous known production commit:

```bash
git fetch origin --tags
git checkout 0ce3e7a
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Restore database backup only if schema or data changed and app rollback requires it.

Post-rollback smoke:

```bash
BASE_URL=https://data.dashdodoboard.ru npm run smoke
```

## Risk Table

| Area | Risk | Current mitigation | Manual check before deploy | Rollback note |
|---|---|---|---|---|
| Auth/login | Login or protected redirects regress | Existing middleware smoke and build checks | Login as admin and viewer; verify redirects | Redeploy `0ce3e7a` |
| DB schema | Product-core schema differs from production DB | Backup required; migration strategy documented | Decide migration vs `db push`; inspect schema diff | Restore backup if schema/data rollback needed |
| Import confirm write-flow | New confirm flow can write incorrect data | Import confirm checks pass locally | Test with safe sample data before production write | Rollback app; restore DB if bad writes landed |
| Admin permissions | Viewer/admin access boundaries regress | Role-gated routes and smoke checks | Confirm viewer cannot open admin/import/data-source pages | Redeploy previous commit |
| Feature flags | New paths enabled too broadly | First deploy flags recommended off | Verify `.env.production` and rebuild image with intended flags | Rebuild with flags off |
| Dodo placeholders | Empty Dodo config breaks sync if triggered | Dodo env placeholders documented as empty by default | Do not trigger Dodo sync until credentials are configured | Disable sync path; redeploy |
| Seed/test data | Seed can overwrite or add unwanted production data | Seed is manual only | Confirm no deploy script runs seed | Restore DB backup if seed pollutes data |
| Build artifacts | TypeScript build info creates Git noise | `tsconfig.tsbuildinfo` ignored | Confirm `git status` clean before merge | No runtime rollback needed |
| Env variables | Missing production flags cause unexpected defaults | `.env.production.example` documents required flags | Compare `.env.production` to example before build | Correct env and rebuild |
