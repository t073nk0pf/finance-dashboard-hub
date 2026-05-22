# Deployment Runbook

This runbook describes the production deployment path for `finance-dashboard-hub` on a VPS.

## Server Requirements

- Ubuntu 22.04 or newer
- Node.js 22 LTS
- Docker Engine
- Docker Compose plugin
- Nginx
- Certbot
- Git
- SSH access for a deploy user

## Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git nginx
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Create Deploy User

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chown -R deploy:deploy /home/deploy/.ssh
```

Add the GitHub Actions public deploy key to:

```text
/home/deploy/.ssh/authorized_keys
```

## SSH Setup

GitHub Actions requires these repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `PRODUCTION_BASE_URL`

`DEPLOY_SSH_KEY` is the private key that matches the server public key in `authorized_keys`.

## Firewall

Allow SSH, HTTP, and HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
sudo ufw status
```

The app container binds to `127.0.0.1:3000`, so it is not exposed publicly without Nginx.

## Clone Repo

As the deploy user:

```bash
sudo su - deploy
git clone git@github.com:OWNER/finance-dashboard-hub.git /opt/finance-dashboard-hub
cd /opt/finance-dashboard-hub
```

If the repository uses HTTPS instead of SSH, configure a deploy token outside the repo.

## Production Env

Create `.env.production`:

```bash
cp .env.production.example .env.production
nano .env.production
```

Generate `SESSION_SECRET`:

```bash
openssl rand -base64 48
```

Set at minimum:

- `APP_BASE_URL`
- `PORT`
- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `NODE_ENV=production`
- `DISABLE_AUTH=false`

Never commit `.env.production`.

## Start Docker Compose

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Apply Prisma schema:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npx prisma db push
```

Seed only when explicitly needed:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npm run prisma:seed
```

## Nginx

Copy config:

```bash
sudo cp nginx/finance-dashboard-hub.conf /etc/nginx/sites-available/finance-dashboard-hub
sudo nano /etc/nginx/sites-available/finance-dashboard-hub
```

Replace:

```text
dashboard.example.com
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/finance-dashboard-hub /etc/nginx/sites-enabled/finance-dashboard-hub
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

Install Certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Issue certificate:

```bash
sudo certbot --nginx -d dashboard.example.com
```

Check renewal:

```bash
sudo certbot renew --dry-run
```

## Deploy

Manual deploy on server:

```bash
BASE_URL=https://dashboard.example.com bash scripts/deploy.sh
```

Run seed explicitly only when needed:

```bash
RUN_SEED=true BASE_URL=https://dashboard.example.com bash scripts/deploy.sh
```

GitHub Actions deploy:

1. Set all deploy secrets.
2. Open Actions.
3. Run `Deploy` workflow manually.

## Verify Routes

```bash
BASE_URL=https://dashboard.example.com npm run smoke
```

Expected result: every route prints `200 OK`.

Also verify manually:

- `/login`
- `/dashboards/plan-fact`
- `/armenia`
- `/tv/armenia`

## Rollback

Find previous commit:

```bash
git log --oneline -10
```

Rollback to a known good commit:

```bash
git checkout <commit-sha>
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml exec -T app npx prisma db push
BASE_URL=https://dashboard.example.com npm run smoke
```

Return to main after incident handling:

```bash
git checkout main
git pull --ff-only
```

If a database change caused the incident, restore from backup using `docs/BACKUP_RESTORE.md`.
