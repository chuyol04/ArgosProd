FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg \
    curl \
    cron \
    gzip \
    default-mysql-client \
    ca-certificates \
    && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
       | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
       | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update && apt-get install -y --no-install-recommends mongodb-database-tools \
    && curl https://rclone.org/install.sh | bash \
    && rm -rf /var/lib/apt/lists/*

COPY crontab /etc/cron.d/argos-backup
COPY backup.sh /backup.sh

RUN chmod +x /backup.sh \
    && chmod 0644 /etc/cron.d/argos-backup \
    && crontab /etc/cron.d/argos-backup \
    && mkdir -p /backups /config/rclone

CMD printenv > /etc/environment && cron -f
