# Finance Dashboard Hub

Production-ready MVP внутреннего финансового сервиса для управленческих дашбордов.

Проект содержит принятый MVP plan-fact dashboard, контур Armenia dashboard, Office TV экран и минимальную admin/auth основу для дальнейшего подключения PostgreSQL, Excel или Google Sheets источников.

## Stack

- Next.js App Router 15
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Docker Compose
- Cookie-based session auth

## Local Setup

Установите зависимости:

```bash
npm install
```

Создайте локальный env файл:

```bash
cp .env.example .env
```

Для local dev можно оставить значения из `.env.example`:

```env
DATABASE_URL="postgresql://finance:finance@localhost:5432/finance_dashboard_hub?schema=public"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin"
SESSION_SECRET="replace-with-a-long-random-secret"
NODE_ENV="development"
DISABLE_AUTH="false"
```

Для production обязательно замените `ADMIN_PASSWORD`, `SESSION_SECRET` и database credentials. `.env` и `.env.local` не должны попадать в git.

## PostgreSQL

Запустите PostgreSQL локально:

```bash
docker compose up -d
```

Проверьте статус:

```bash
docker compose ps
```

## Prisma

Сгенерируйте Prisma Client:

```bash
npm run prisma:generate
```

Примените schema к локальной базе:

```bash
npx prisma db push
```

Заполните базовые справочники и admin пользователя:

```bash
npm run prisma:seed
```

Seed создает или обновляет admin пользователя из env:

```text
ADMIN_EMAIL / ADMIN_PASSWORD
```

При значениях из `.env.example`:

```text
admin@example.com / admin
```

## Run Dev

```bash
npm run dev
```

Откройте:

```text
http://localhost:3000
```

## Routes

Public:

- `/`
- `/login`

Protected by middleware:

- `/dashboards/plan-fact`
- `/dashboards/forecast`
- `/armenia`
- `/armenia/profitability`
- `/armenia/growth`
- `/armenia/restaurants`
- `/armenia/unit-economics`
- `/tv/armenia`
- `/admin/users`
- `/admin/imports`
- `/admin/metrics`
- `/admin/forecast-rules`

API:

- `GET /api/dashboards/plan-fact`
- `GET /api/dashboards/armenia`
- `GET /api/forecast`
- `GET /api/imports`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Data Sources

Current MVP data is static JSON behind service layers:

- Plan-fact: `data/sample-dashboard-data.json` through `lib/data/dashboardDataService.ts`
- Armenia: `data/armenia-dashboard-data.json` through `lib/data/armeniaDataService.ts`

Frontend components should use service/API contracts, not direct JSON imports. This keeps the replacement path open for PostgreSQL, Excel or Google Sheets.

## Auth Notes

Middleware protects dashboards, admin pages, TV, and dashboard APIs. For local smoke/UI checks only, you may run the app with:

```bash
DISABLE_AUTH=true npm run dev
```

Do not use `DISABLE_AUTH=true` in production.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm audit --omit=dev
npm run smoke
npm run prisma:generate
npm run prisma:seed
```

`npm run smoke` expects the app to be running. Override the target URL with:

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run smoke
```

## Production Notes

See `README_DEPLOY.md` for VPS deployment, Docker Compose production setup, Nginx reverse proxy, HTTPS, and post-deploy checks.
