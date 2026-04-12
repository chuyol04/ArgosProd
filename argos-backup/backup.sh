#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
MYSQL_FILE="$BACKUP_DIR/mysql_${DATE}.sql.gz"
MONGO_FILE="$BACKUP_DIR/mongo_${DATE}.gz"
LOG_PREFIX="[ARGOS BACKUP $DATE]"
GDRIVE_FOLDER="${GDRIVE_FOLDER:-ArgosBackups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

echo "$LOG_PREFIX === Inicio ==="

# ── MySQL ────────────────────────────────────────────────────────────────────
echo "$LOG_PREFIX Dumping MySQL..."
mysqldump \
  -h "$MYSQL_HOST" \
  -u "$MYSQL_USER" \
  -p"$MYSQL_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  "$MYSQL_DB" \
  | gzip > "$MYSQL_FILE"
echo "$LOG_PREFIX MySQL OK → $MYSQL_FILE"

# ── MongoDB ──────────────────────────────────────────────────────────────────
echo "$LOG_PREFIX Dumping MongoDB..."
mongodump \
  --uri="$MONGO_URI" \
  --archive="$MONGO_FILE" \
  --gzip
echo "$LOG_PREFIX MongoDB OK → $MONGO_FILE"

# ── Subir a Google Drive ─────────────────────────────────────────────────────
echo "$LOG_PREFIX Subiendo a Google Drive: $GDRIVE_FOLDER..."
rclone copy "$BACKUP_DIR" "gdrive:$GDRIVE_FOLDER" \
  --config /config/rclone/rclone.conf \
  --include "*.gz" \
  --log-level INFO
echo "$LOG_PREFIX Upload OK"

# ── Limpiar backups locales antiguos ─────────────────────────────────────────
echo "$LOG_PREFIX Eliminando backups locales > $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "*.gz" -mtime +"$RETENTION_DAYS" -delete
echo "$LOG_PREFIX Limpieza OK"

# ── Eliminar backups de Drive > RETENTION_DAYS días ──────────────────────────
echo "$LOG_PREFIX Eliminando backups en Drive > $RETENTION_DAYS días..."
rclone delete "gdrive:$GDRIVE_FOLDER" \
  --config /config/rclone/rclone.conf \
  --min-age "${RETENTION_DAYS}d" \
  --include "*.gz"
echo "$LOG_PREFIX Drive limpio"

echo "$LOG_PREFIX === Fin ==="
