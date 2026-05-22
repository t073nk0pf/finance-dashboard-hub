# Backup And Restore

Production PostgreSQL backups are created with `pg_dump` from the `postgres` Docker service.

## Create Backup

Run from the project directory on the server:

```bash
bash scripts/backup-postgres.sh
```

The script:

- reads database settings from `.env.production`;
- writes compressed SQL backups to `backups/`;
- names files with date and time;
- deletes backup files older than 14 days;
- does not store the database password in the script.

Override defaults when needed:

```bash
BACKUP_DIR=/var/backups/finance-dashboard-hub RETENTION_DAYS=30 bash scripts/backup-postgres.sh
```

## Restore Backup

Pick a backup file:

```bash
ls -lh backups/
```

Restore into the production database:

```bash
gunzip -c backups/finance-dashboard-hub-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

If `$POSTGRES_USER` and `$POSTGRES_DB` are not loaded in the shell, load them first:

```bash
set -a
source .env.production
set +a
```

For a destructive clean restore, recreate the database or clear tables first. Do this only during a planned maintenance window.

## Cron

Example daily backup at 03:15:

```cron
15 3 * * * cd /opt/finance-dashboard-hub && /usr/bin/env bash scripts/backup-postgres.sh >> logs/backup.log 2>&1
```

Create the log directory:

```bash
mkdir -p logs
```

Check cron output and backup files regularly:

```bash
tail -n 100 logs/backup.log
ls -lh backups/
```
