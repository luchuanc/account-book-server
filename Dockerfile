FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    redis-server \
    postgresql \
    postgresql-contrib \
    cron \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src
COPY deploy /deploy
COPY scripts /scripts

RUN chmod +x /deploy/entrypoint.sh /scripts/*.sh /deploy/postgres/init-db.sh

RUN mkdir -p /var/log/account-book /var/lib/redis /backups /app/uploads

EXPOSE 80 443 3000
ENTRYPOINT ["/deploy/entrypoint.sh"]
