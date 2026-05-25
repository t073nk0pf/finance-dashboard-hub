# Acceptance Checklist

Use this checklist before accepting the production-ready MVP.

## Environment

- [ ] `.env` or `.env.local` exists locally.
- [ ] `.env` and `.env.local` are ignored by git.
- [ ] `.env.example` contains documented sample values.
- [ ] `DATABASE_URL` points to the intended PostgreSQL instance.
- [ ] `SESSION_SECRET` is set and is not the sample production value.
- [ ] `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set for seed.
- [ ] `NODE_ENV` is correct for the environment.
- [ ] `DISABLE_AUTH=false` outside local smoke checks.

## Login

- [ ] `npm run prisma:seed` completed.
- [ ] Viewer user can be created with `npm run create:user`.
- [ ] `/login` opens.
- [ ] Login works with admin credentials from env.
- [ ] Protected pages redirect to `/login` when unauthenticated.
- [ ] Authenticated session can open protected pages.

## Plan-Fact Dashboard

- [ ] `/dashboards/plan-fact` opens after login.
- [ ] KPI cards render.
- [ ] Executive summary renders.
- [ ] Charts and tables render.
- [ ] Existing plan-fact API contract is unchanged.

## Armenia Dashboard

- [ ] `/armenia` opens after login.
- [ ] Revenue, EBITDA, EBITDA %, net profit, Food Cost / UC, Opex %, restaurant count, and average revenue render.
- [ ] Growth readiness badge renders.
- [ ] EBITDA monthly chart renders.
- [ ] Risk/status panel renders.
- [ ] Profitability drivers render.

## Office TV

- [ ] `/tv/armenia` opens after login.
- [ ] Layout is fullscreen and dark.
- [ ] KPI cards are large and readable.
- [ ] Slide rotation works.
- [ ] Auto-refresh placeholder is visible.
- [ ] Only aggregated data is shown.

## API

- [ ] `GET /api/dashboards/plan-fact` returns JSON.
- [ ] `GET /api/dashboards/armenia` returns JSON.
- [ ] Unauthorized API access is rejected when auth is enabled.
- [ ] Viewer can read dashboard APIs.
- [ ] Viewer receives 403 for admin/import/metric mutation APIs.
- [ ] API routes return 200 during authenticated smoke checks.

## Viewer Role Acceptance

- [ ] Viewer can login.
- [ ] Viewer can open `/dashboards/plan-fact`.
- [ ] Viewer can open `/dashboards/forecast`.
- [ ] Viewer can open `/armenia`.
- [ ] Viewer can open `/tv/armenia`.
- [ ] Viewer cannot open `/admin/users`.
- [ ] Viewer cannot open `/admin/imports`.
- [ ] Viewer cannot open `/admin/metrics`.
- [ ] Viewer cannot open `/admin/forecast-rules`.
- [ ] Viewer cannot add, edit, or delete users.
- [ ] Viewer cannot add, edit, delete, import, approve, or rollback data.
- [ ] Viewer does not see admin navigation in the sidebar.

## Build And Quality

- [ ] `npm run build` passes.
- [ ] `npm run lint` passes.
- [ ] `npm audit --omit=dev` returns 0 vulnerabilities or documented acceptable findings.
- [ ] `npm run smoke` passes.

## Smoke Routes

- [ ] `/` redirects to `/login` when unauthenticated.
- [ ] `/login` returns 200.
- [ ] Protected pages redirect to `/login` when unauthenticated.
- [ ] Dashboard APIs return 401 when unauthenticated.
- [ ] Optional viewer smoke with `VIEWER_EMAIL` and `VIEWER_PASSWORD` passes.

## Docker

- [ ] `docker compose up -d` starts local PostgreSQL.
- [ ] `docker compose -f docker-compose.production.yml config` validates production compose.
- [ ] Production compose does not hard-code secrets.
- [ ] PostgreSQL has a healthcheck.
- [ ] App depends on healthy PostgreSQL.
- [ ] Docker image builds.

## Deploy

- [ ] `README_DEPLOY.md` steps were followed.
- [ ] PostgreSQL is healthy on VPS.
- [ ] Prisma schema was applied.
- [ ] Seed completed.
- [ ] Nginx reverse proxy is active.
- [ ] HTTPS is active.
- [ ] Post-deploy smoke test passes.
