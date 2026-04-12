FROM mongo:7.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-mysql-client \
    curl \
    cron \
    gzip \
    ca-certificates \
    && curl https://rclone.org/install.sh | bash \
    && rm -rf /var/lib/apt/lists/*

COPY crontab /etc/cron.d/argos-backup
COPY backup.sh /backup.sh

RUN chmod +x /backup.sh \
    && chmod 0644 /etc/cron.d/argos-backup \
    && crontab /etc/cron.d/argos-backup \
    && mkdir -p /backups /config/rclone

CMD printenv > /etc/environment && cron -f
