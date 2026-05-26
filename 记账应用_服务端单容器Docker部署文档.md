# 记账应用服务端单容器部署与后端设计文档

> 适用项目：多人共享记账 App 服务端  
> 部署目标：所有服务打包到一个 Docker 容器里  
> 容器内包含：Backend API、PostgreSQL、Redis、Nginx、Supervisor  
> 适合场景：个人项目、小团队、私有化部署、低成本服务器、一键安装  
> 不推荐场景：高并发、大规模商业化、多节点集群

---

## 1. 单容器部署目标

本项目服务端采用单容器部署，目标是：

```text
一个镜像
一个容器
一个启动脚本
一个数据目录
一条命令部署完整服务
```

容器内同时运行：

```text
Node.js API 服务
PostgreSQL 数据库
Redis 缓存
Nginx 反向代理
Supervisor 进程管理
定时备份任务
```

用户只需要执行：

```bash
./scripts/install.sh
```

即可完成部署。

---

## 2. 为什么使用单容器

### 2.1 优点

```text
部署简单
迁移简单
适合个人服务器
适合 NAS / 云服务器 / 家用服务器
不用理解多个 Docker 服务之间的网络关系
备份目录清晰
一键安装体验好
```

### 2.2 缺点

```text
不符合标准微服务拆分习惯
数据库和应用耦合在一起
容器升级时要更注意数据卷
高并发场景不方便独立扩容
PostgreSQL 和 Redis 无法单独横向扩展
```

### 2.3 适合本项目的原因

记账 App 第一阶段主要是：

```text
用户登录
账本管理
多人共享
记账流水
统计查询
```

访问量通常不大，单容器部署可以极大降低部署门槛。

等后期用户量上来后，可以再拆成：

```text
API 容器
PostgreSQL 容器
Redis 容器
Nginx 容器
```

---

## 3. 单容器整体架构

```text
Android / iOS App
        |
        | HTTPS / HTTP
        |
    Docker Container
        |
        |-- Nginx :80 / :443
        |
        |-- Node.js API :3000
        |
        |-- PostgreSQL :5432
        |
        |-- Redis :6379
        |
        |-- Supervisor
        |
        |-- Cron / Backup Script
```

容器内部访问关系：

```text
Nginx -> http://127.0.0.1:3000
API -> PostgreSQL 127.0.0.1:5432
API -> Redis 127.0.0.1:6379
```

对外只暴露：

```text
80
443，可选
3000，可选，不推荐生产环境暴露
```

---

## 4. 推荐技术栈

### 4.1 后端

```text
Node.js 20
NestJS
TypeScript
PostgreSQL 16
Redis 7
Nginx
Supervisor
Alpine / Debian Slim
```

### 4.2 为什么用 Supervisor

一个 Docker 容器一般推荐只跑一个主进程，但本项目明确要求「服务打包到一个容器里」，所以需要进程管理工具来同时管理多个进程。

Supervisor 负责启动和守护：

```text
PostgreSQL
Redis
Node.js API
Nginx
Cron
```

如果其中某个进程退出，Supervisor 可以自动拉起。

---

## 5. 项目目录结构

推荐目录：

```text
account-book-server/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   ├── config/
│   └── modules/
│       ├── auth/
│       ├── users/
│       ├── books/
│       ├── book-members/
│       ├── categories/
│       ├── transactions/
│       ├── statistics/
│       ├── invitations/
│       └── system/
├── deploy/
│   ├── nginx/
│   │   └── default.conf
│   ├── supervisor/
│   │   └── supervisord.conf
│   ├── postgres/
│   │   └── init-db.sh
│   ├── redis/
│   │   └── redis.conf
│   ├── cron/
│   │   └── account-book-cron
│   └── entrypoint.sh
├── scripts/
│   ├── install.sh
│   ├── start.sh
│   ├── stop.sh
│   ├── restart.sh
│   ├── update.sh
│   ├── backup.sh
│   ├── restore.sh
│   └── logs.sh
└── data/
    ├── postgres/
    ├── redis/
    ├── uploads/
    ├── logs/
    └── backups/
```

说明：

```text
data/ 目录必须挂载到宿主机
容器删除后，data/ 目录不能丢
```

---

## 6. 单容器 docker-compose.yml

虽然只运行一个容器，仍然建议使用 Docker Compose，方便配置端口、数据卷和环境变量。

```yaml
services:
  account-book:
    build:
      context: .
      dockerfile: Dockerfile
    image: account-book-server:latest
    container_name: account-book-server
    restart: always
    env_file:
      - .env
    ports:
      - "${HTTP_PORT}:80"
      - "${HTTPS_PORT}:443"
      # 开发调试时可以打开，生产环境建议关闭
      # - "${APP_PORT}:3000"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./data/redis:/var/lib/redis
      - ./data/uploads:/app/uploads
      - ./data/logs:/var/log/account-book
      - ./data/backups:/backups
      - ./deploy/nginx/cert:/etc/nginx/cert
    environment:
      TZ: Asia/Shanghai
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://127.0.0.1/api/v1/system/health"]
      interval: 30s
      timeout: 5s
      retries: 5
```

---

## 7. .env 配置

`.env.example`：

```env
APP_NAME=account-book
APP_ENV=production
APP_PORT=3000
APP_BASE_URL=http://localhost

HTTP_PORT=80
HTTPS_PORT=443

APP_SECRET=replace_with_app_secret
JWT_SECRET=replace_with_jwt_secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=account_book
POSTGRES_PASSWORD=replace_with_db_password
POSTGRES_DB=account_book

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=replace_with_redis_password

UPLOAD_DIR=/app/uploads

BACKUP_DIR=/backups
BACKUP_KEEP_DAYS=30

TZ=Asia/Shanghai
```

正式部署前必须修改：

```text
APP_SECRET
JWT_SECRET
POSTGRES_PASSWORD
REDIS_PASSWORD
APP_BASE_URL
```

---

## 8. Dockerfile 单容器设计

推荐基于 Debian Slim，而不是 Alpine。

原因：

```text
PostgreSQL
Redis
Nginx
Supervisor
Node.js
```

都放在一个容器里时，Debian Slim 兼容性更稳。

```dockerfile
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    supervisor \
    cron \
    curl \
    ca-certificates \
    gosu \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/redis/redis.conf /etc/redis/redis.conf
COPY deploy/cron/account-book-cron /etc/cron.d/account-book-cron
COPY deploy/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && chmod 0644 /etc/cron.d/account-book-cron \
    && mkdir -p /app/uploads /backups /var/log/account-book /run/postgresql \
    && chown -R postgres:postgres /run/postgresql

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
```

---

## 9. entrypoint.sh 设计

`deploy/entrypoint.sh`：

```bash
#!/usr/bin/env bash

set -e

echo "Account Book Server starting..."

export PGDATA="/var/lib/postgresql/data"

mkdir -p /var/log/account-book
mkdir -p /app/uploads
mkdir -p /backups
mkdir -p /var/lib/redis
mkdir -p /run/postgresql

chown -R postgres:postgres /var/lib/postgresql /run/postgresql
chown -R redis:redis /var/lib/redis || true

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL database..."

  gosu postgres initdb -D "$PGDATA"

  echo "listen_addresses='127.0.0.1'" >> "$PGDATA/postgresql.conf"
  echo "port=5432" >> "$PGDATA/postgresql.conf"

  cat >> "$PGDATA/pg_hba.conf" <<EOF
host all all 127.0.0.1/32 md5
host all all ::1/128 md5
EOF

  gosu postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='127.0.0.1'" -w start

  gosu postgres psql --command "CREATE USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';" || true
  gosu postgres psql --command "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};" || true
  gosu postgres psql --command "GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};" || true

  gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop

  echo "PostgreSQL initialized."
fi

echo "Generating Redis config..."
cat > /etc/redis/redis-runtime.conf <<EOF
bind 127.0.0.1
port 6379
dir /var/lib/redis
appendonly yes
requirepass ${REDIS_PASSWORD}
EOF

echo "Generating API env file..."
cat > /app/.runtime.env <<EOF
APP_NAME=${APP_NAME}
APP_ENV=${APP_ENV}
APP_PORT=${APP_PORT}
APP_BASE_URL=${APP_BASE_URL}
APP_SECRET=${APP_SECRET}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
REFRESH_TOKEN_EXPIRES_IN=${REFRESH_TOKEN_EXPIRES_IN}
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
UPLOAD_DIR=${UPLOAD_DIR}
TZ=${TZ}
EOF

echo "Starting Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
```

注意：

```text
entrypoint.sh 负责初始化数据库
supervisord 负责正式启动所有服务
```

---

## 10. Supervisor 配置

`deploy/supervisor/supervisord.conf`：

```ini
[supervisord]
nodaemon=true
logfile=/var/log/account-book/supervisord.log
pidfile=/tmp/supervisord.pid

[program:postgres]
command=/usr/lib/postgresql/15/bin/postgres -D /var/lib/postgresql/data
user=postgres
autostart=true
autorestart=true
stdout_logfile=/var/log/account-book/postgres.log
stderr_logfile=/var/log/account-book/postgres.err.log

[program:redis]
command=/usr/bin/redis-server /etc/redis/redis-runtime.conf
autostart=true
autorestart=true
stdout_logfile=/var/log/account-book/redis.log
stderr_logfile=/var/log/account-book/redis.err.log

[program:api]
directory=/app
command=node dist/main.js
autostart=true
autorestart=true
environment=NODE_ENV="production"
stdout_logfile=/var/log/account-book/api.log
stderr_logfile=/var/log/account-book/api.err.log

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/var/log/account-book/nginx.log
stderr_logfile=/var/log/account-book/nginx.err.log

[program:cron]
command=/usr/sbin/cron -f
autostart=true
autorestart=true
stdout_logfile=/var/log/account-book/cron.log
stderr_logfile=/var/log/account-book/cron.err.log
```

注意 PostgreSQL 版本路径：

```text
Debian bookworm 默认可能是 /usr/lib/postgresql/15/bin/postgres
实际版本需要根据基础镜像安装结果确认
```

如果安装的是 PostgreSQL 16，需要改为：

```text
/usr/lib/postgresql/16/bin/postgres
```

更稳的方式是在 Dockerfile 中固定 PostgreSQL 版本。

---

## 11. Nginx 配置

`deploy/nginx/default.conf`：

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /app/uploads/;
        autoindex off;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/api/v1/system/health;
    }

    location / {
        return 200 "Account Book Server is running";
        add_header Content-Type text/plain;
    }
}
```

生产环境推荐：

```text
外部使用宝塔 / Caddy / 云服务商负载均衡做 HTTPS
容器内部只负责 HTTP
```

如果必须让容器内 Nginx 直接处理 HTTPS，可以挂载证书到：

```text
./deploy/nginx/cert
```

---

## 12. Redis 配置

`deploy/redis/redis.conf` 可以保留为空模板，因为最终配置由 `entrypoint.sh` 动态生成。

如果希望静态配置：

```conf
bind 127.0.0.1
port 6379
dir /var/lib/redis
appendonly yes
```

密码建议动态写入，避免写死在镜像里。

---

## 13. Cron 自动备份配置

`deploy/cron/account-book-cron`：

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 3 * * * root /app/scripts/backup-in-container.sh >> /var/log/account-book/backup.log 2>&1
```

容器内备份脚本：

```bash
#!/usr/bin/env bash

set -e

DATE=$(date +"%Y%m%d_%H%M%S")
FILE="/backups/account_book_${DATE}.sql"

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h 127.0.0.1 \
  -U "${POSTGRES_USER}" \
  "${POSTGRES_DB}" > "$FILE"

find /backups -name "account_book_*.sql" -type f -mtime +"${BACKUP_KEEP_DAYS:-30}" -delete

echo "Backup created: $FILE"
```

---

## 14. 一键安装脚本

`scripts/install.sh`：

```bash
#!/usr/bin/env bash

set -e

PROJECT_NAME="account-book-server"

echo "开始安装 ${PROJECT_NAME}..."

if ! command -v docker >/dev/null 2>&1; then
  echo "未检测到 Docker，正在尝试安装 Docker..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "未检测到 Docker Compose，请安装新版 Docker Compose 插件"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "创建 .env 配置文件..."
  cp .env.example .env

  APP_SECRET=$(openssl rand -hex 24 2>/dev/null || date +%s | sha256sum | head -c 48)
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | head -c 64)
  DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s | sha256sum | head -c 32)
  REDIS_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s | sha256sum | head -c 32)

  sed -i "s/replace_with_app_secret/${APP_SECRET}/g" .env
  sed -i "s/replace_with_jwt_secret/${JWT_SECRET}/g" .env
  sed -i "s/replace_with_db_password/${DB_PASSWORD}/g" .env
  sed -i "s/replace_with_redis_password/${REDIS_PASSWORD}/g" .env
fi

mkdir -p data/postgres data/redis data/uploads data/logs data/backups deploy/nginx/cert

chmod +x deploy/entrypoint.sh || true
chmod +x scripts/*.sh || true

echo "构建镜像..."
docker compose build

echo "启动服务..."
docker compose up -d

echo "等待服务启动..."
sleep 15

echo "服务状态："
docker compose ps

echo ""
echo "安装完成"
echo "访问地址：http://服务器IP"
echo "健康检查：http://服务器IP/api/v1/system/health"
echo ""
echo "重要提醒："
echo "1. 请确认 .env 中 APP_BASE_URL 是否为你的真实域名"
echo "2. 生产环境请配置 HTTPS"
echo "3. data/ 目录是核心数据目录，请定期备份"
```

---

## 15. 启动脚本

`scripts/start.sh`：

```bash
#!/usr/bin/env bash
set -e

docker compose up -d

echo "服务已启动"
```

---

## 16. 停止脚本

`scripts/stop.sh`：

```bash
#!/usr/bin/env bash
set -e

docker compose down

echo "服务已停止"
```

---

## 17. 重启脚本

`scripts/restart.sh`：

```bash
#!/usr/bin/env bash
set -e

docker compose down
docker compose up -d

echo "服务已重启"
```

---

## 18. 更新脚本

`scripts/update.sh`：

```bash
#!/usr/bin/env bash
set -e

echo "开始更新..."

./scripts/backup.sh || true

git pull

docker compose build
docker compose up -d

echo "等待服务恢复..."
sleep 10

docker compose ps

echo "更新完成"
```

---

## 19. 宿主机备份脚本

`scripts/backup.sh`：

```bash
#!/usr/bin/env bash
set -e

BACKUP_DIR="./data/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
FILE_NAME="account_book_${DATE}.sql"

mkdir -p "$BACKUP_DIR"

source .env

docker exec account-book-server bash -c "
PGPASSWORD='${POSTGRES_PASSWORD}' pg_dump \
  -h 127.0.0.1 \
  -U '${POSTGRES_USER}' \
  '${POSTGRES_DB}'
" > "${BACKUP_DIR}/${FILE_NAME}"

echo "备份完成：${BACKUP_DIR}/${FILE_NAME}"
```

---

## 20. 宿主机恢复脚本

`scripts/restore.sh`：

```bash
#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "用法：./scripts/restore.sh ./data/backups/xxx.sql"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "备份文件不存在：$BACKUP_FILE"
  exit 1
fi

source .env

cat "$BACKUP_FILE" | docker exec -i account-book-server bash -c "
PGPASSWORD='${POSTGRES_PASSWORD}' psql \
  -h 127.0.0.1 \
  -U '${POSTGRES_USER}' \
  '${POSTGRES_DB}'
"

echo "恢复完成"
```

---

## 21. 日志查看脚本

`scripts/logs.sh`：

```bash
#!/usr/bin/env bash
set -e

SERVICE=$1

if [ -z "$SERVICE" ]; then
  docker compose logs -f
  exit 0
fi

docker exec -it account-book-server tail -f "/var/log/account-book/${SERVICE}.log"
```

用法：

```bash
./scripts/logs.sh
./scripts/logs.sh api
./scripts/logs.sh postgres
./scripts/logs.sh redis
./scripts/logs.sh nginx
```

---

## 22. 数据目录说明

宿主机目录：

```text
data/
├── postgres/
├── redis/
├── uploads/
├── logs/
└── backups/
```

说明：

| 目录 | 说明 |
|---|---|
| data/postgres | PostgreSQL 数据 |
| data/redis | Redis 持久化数据 |
| data/uploads | 上传文件 |
| data/logs | 服务日志 |
| data/backups | 数据库备份 |

非常重要：

```text
更新镜像或删除容器前，不能删除 data/ 目录
```

---

## 23. 服务端模块划分

```text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── utils/
├── config/
└── modules/
    ├── auth/
    ├── users/
    ├── books/
    ├── book-members/
    ├── categories/
    ├── transactions/
    ├── statistics/
    ├── invitations/
    ├── uploads/
    └── system/
```

---

## 24. 核心数据模型

### 24.1 User

```text
id
phone
email
passwordHash
nickname
avatarUrl
status
createdAt
updatedAt
```

### 24.2 Book

```text
id
name
icon
color
ownerUserId
defaultCurrency
description
status
createdAt
updatedAt
```

### 24.3 BookMember

```text
id
bookId
userId
role
nicknameInBook
joinedAt
status
```

角色：

```text
owner
admin
editor
viewer
```

### 24.4 Category

```text
id
bookId
type
name
icon
color
sortOrder
isSystem
status
createdAt
updatedAt
```

type：

```text
expense
income
transfer
```

### 24.5 Transaction

```text
id
bookId
categoryId
amount
type
title
note
transactionDate
creatorUserId
recorderUserId
paymentAccount
location
images
tags
status
createdAt
updatedAt
```

重点：

```text
creatorUserId：创建这条记录的人
recorderUserId：这笔账实际归属的人
```

按人统计必须使用：

```text
recorderUserId
```

---

## 25. 数据库表设计

### 25.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone VARCHAR(32) UNIQUE,
  email VARCHAR(128) UNIQUE,
  password_hash VARCHAR(255),
  nickname VARCHAR(64),
  avatar_url TEXT,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.2 books

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  icon VARCHAR(64),
  color VARCHAR(32),
  owner_user_id UUID NOT NULL REFERENCES users(id),
  default_currency VARCHAR(16) DEFAULT 'CNY',
  description TEXT,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.3 book_members

```sql
CREATE TABLE book_members (
  id UUID PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(32) NOT NULL,
  nickname_in_book VARCHAR(64),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) DEFAULT 'active',
  UNIQUE(book_id, user_id)
);
```

### 25.4 categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  book_id UUID REFERENCES books(id),
  type VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  icon VARCHAR(64),
  color VARCHAR(32),
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.5 transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id),
  category_id UUID REFERENCES categories(id),
  amount BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(128),
  note TEXT,
  transaction_date TIMESTAMP NOT NULL,
  creator_user_id UUID NOT NULL REFERENCES users(id),
  recorder_user_id UUID NOT NULL REFERENCES users(id),
  payment_account VARCHAR(64),
  location VARCHAR(128),
  images JSONB,
  tags JSONB,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.6 invitations

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id),
  inviter_user_id UUID NOT NULL REFERENCES users(id),
  invitee_phone VARCHAR(32),
  invitee_user_id UUID REFERENCES users(id),
  invite_code VARCHAR(64) UNIQUE NOT NULL,
  role VARCHAR(32) DEFAULT 'editor',
  status VARCHAR(32) DEFAULT 'pending',
  expired_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 26. 索引设计

```sql
CREATE INDEX idx_transactions_book_date
ON transactions(book_id, transaction_date DESC);

CREATE INDEX idx_transactions_book_recorder
ON transactions(book_id, recorder_user_id);

CREATE INDEX idx_transactions_book_category
ON transactions(book_id, category_id);

CREATE INDEX idx_transactions_book_type
ON transactions(book_id, type);

CREATE INDEX idx_book_members_user
ON book_members(user_id);

CREATE INDEX idx_book_members_book
ON book_members(book_id);

CREATE INDEX idx_invitations_code
ON invitations(invite_code);
```

---

## 27. API 设计规范

统一前缀：

```text
/api/v1
```

统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

分页返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

错误返回：

```json
{
  "code": 40001,
  "message": "登录已过期",
  "data": null
}
```

---

## 28. 主要接口

### 28.1 认证

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### 28.2 账本

```http
POST   /api/v1/books
GET    /api/v1/books
GET    /api/v1/books/{bookId}
PUT    /api/v1/books/{bookId}
DELETE /api/v1/books/{bookId}
```

### 28.3 成员

```http
GET    /api/v1/books/{bookId}/members
PUT    /api/v1/books/{bookId}/members/{memberId}
DELETE /api/v1/books/{bookId}/members/{memberId}
```

### 28.4 邀请

```http
POST /api/v1/books/{bookId}/invitations
GET  /api/v1/invitations/{inviteCode}
POST /api/v1/invitations/{inviteCode}/accept
POST /api/v1/invitations/{inviteCode}/reject
```

### 28.5 分类

```http
GET    /api/v1/books/{bookId}/categories
POST   /api/v1/books/{bookId}/categories
PUT    /api/v1/books/{bookId}/categories/{categoryId}
DELETE /api/v1/books/{bookId}/categories/{categoryId}
```

### 28.6 流水

```http
GET    /api/v1/books/{bookId}/transactions
POST   /api/v1/books/{bookId}/transactions
GET    /api/v1/books/{bookId}/transactions/{transactionId}
PUT    /api/v1/books/{bookId}/transactions/{transactionId}
DELETE /api/v1/books/{bookId}/transactions/{transactionId}
```

### 28.7 统计

```http
GET /api/v1/books/{bookId}/statistics/overview
GET /api/v1/books/{bookId}/statistics/trend
GET /api/v1/books/{bookId}/statistics/category
GET /api/v1/books/{bookId}/statistics/member
```

### 28.8 系统

```http
GET /api/v1/system/health
GET /api/v1/system/version
```

---

## 29. 权限矩阵

| 操作 | owner | admin | editor | viewer |
|---|---|---|---|---|
| 查看账本 | 是 | 是 | 是 | 是 |
| 修改账本 | 是 | 是 | 否 | 否 |
| 删除账本 | 是 | 否 | 否 | 否 |
| 查看流水 | 是 | 是 | 是 | 是 |
| 新增流水 | 是 | 是 | 是 | 否 |
| 编辑自己的流水 | 是 | 是 | 是 | 否 |
| 编辑他人流水 | 是 | 是 | 否 | 否 |
| 删除自己的流水 | 是 | 是 | 是 | 否 |
| 删除他人流水 | 是 | 是 | 否 | 否 |
| 管理成员 | 是 | 是 | 否 | 否 |
| 管理分类 | 是 | 是 | 否 | 否 |
| 查看统计 | 是 | 是 | 是 | 是 |

---

## 30. 金额与时间规则

### 30.1 金额

数据库统一使用：

```text
BIGINT
单位：分
```

示例：

```text
25.90 元 => 2590
100 元 => 10000
```

禁止用浮点数存金额。

### 30.2 时间

默认时区：

```text
Asia/Shanghai
```

统计规则：

```text
日：00:00:00 - 23:59:59
周：周一 - 周日
月：自然月
```

---

## 31. 健康检查接口

```http
GET /api/v1/system/health
```

返回：

```json
{
  "status": "ok",
  "time": "2026-05-26T12:00:00+08:00",
  "database": "ok",
  "redis": "ok",
  "version": "1.0.0"
}
```

健康检查需要验证：

```text
API 服务正常
PostgreSQL 可连接
Redis 可连接
```

---

## 32. 单容器部署流程

### 32.1 准备服务器

最低配置：

```text
1 核 CPU
1GB 内存
20GB 磁盘
Ubuntu 22.04 / Debian 12
```

推荐配置：

```text
2 核 CPU
2GB 内存
40GB 磁盘
```

### 32.2 拉取项目

```bash
git clone https://github.com/luchuanc/account-book-server.git
cd account-book-server
```

### 32.3 一键安装

```bash
chmod +x scripts/*.sh
./scripts/install.sh
```

### 32.4 查看状态

```bash
docker compose ps
```

### 32.5 查看日志

```bash
./scripts/logs.sh api
```

---

## 33. 生产部署建议

### 33.1 域名

推荐：

```text
api.your-domain.com
```

### 33.2 HTTPS

更推荐在容器外处理 HTTPS：

```text
宝塔面板
Caddy
Nginx Proxy Manager
云服务商负载均衡
```

容器只暴露 HTTP：

```text
80
```

这样单容器内部更简单。

### 33.3 防火墙

只开放：

```text
80
443
22
```

不要开放：

```text
5432
6379
3000
```

---

## 34. 升级注意事项

升级前必须备份：

```bash
./scripts/backup.sh
```

升级流程：

```bash
./scripts/update.sh
```

不要执行：

```bash
docker compose down -v
```

因为 `-v` 可能删除数据卷。

虽然本项目使用宿主机目录挂载，但仍然建议避免危险命令。

---

## 35. 单容器迁移方法

迁移到新服务器：

### 35.1 老服务器备份

```bash
./scripts/backup.sh
tar -czvf account-book-data.tar.gz data/
```

### 35.2 新服务器恢复

```bash
git clone https://github.com/luchuanc/account-book-server.git
cd account-book-server

tar -xzvf account-book-data.tar.gz
cp .env.example .env
```

把旧服务器 `.env` 复制到新服务器。

启动：

```bash
docker compose up -d --build
```

---

## 36. 后期拆分容器方案

当用户量上来之后，可以从单容器平滑迁移到多容器。

### 36.1 当前单容器

```text
account-book-server
  ├── API
  ├── PostgreSQL
  ├── Redis
  └── Nginx
```

### 36.2 后期多容器

```text
account-book-api
account-book-postgres
account-book-redis
account-book-nginx
```

### 36.3 迁移重点

```text
导出 PostgreSQL 数据
迁移 Redis 可选
修改 POSTGRES_HOST
修改 REDIS_HOST
更新 docker-compose.yml
```

---

## 37. 服务端 MVP 范围

第一版建议实现：

```text
用户注册登录
创建账本
切换账本
账本成员
邀请加入
分类管理
新增流水
编辑流水
删除流水
流水查询
日统计
周统计
月统计
按人统计
单容器 Docker 部署
一键安装脚本
备份恢复脚本
健康检查
```

---

## 38. 不建议第一期实现

```text
支付宝账单自动同步
微信账单自动同步
复杂资产账户
AI 小票识别
多币种
复杂预算
多节点部署
Kubernetes
```

第一期优先目标：

```text
多人账本 + 快速记账 + 流水查询 + 按人统计 + 一键部署
```

---

## 39. 验收标准

### 39.1 部署验收

```text
执行 install.sh 后可成功启动一个容器
docker ps 中只看到 account-book-server 一个业务容器
访问 /api/v1/system/health 正常
PostgreSQL 数据持久化到 data/postgres
Redis 数据持久化到 data/redis
上传文件保存到 data/uploads
日志保存到 data/logs
备份文件保存到 data/backups
```

### 39.2 功能验收

```text
用户可以注册登录
用户可以创建账本
用户可以邀请成员
成员可以加入账本
用户可以切换账本
用户可以新增流水
用户可以查看流水
用户可以查看日/周/月统计
用户可以按成员统计
viewer 无法新增流水
editor 无法删除他人流水
owner 可以管理账本
```

---

## 40. 最终建议

本项目当前阶段建议采用：

```text
单容器 Docker 部署
宿主机 data 目录持久化
Supervisor 管理多进程
Nginx 作为容器入口
PostgreSQL 和 Redis 仅监听 127.0.0.1
外部只暴露 80 / 443
```

这样部署成本最低，也最适合个人和小团队使用。

等项目稳定、有真实用户之后，再考虑拆成多容器或云数据库。
