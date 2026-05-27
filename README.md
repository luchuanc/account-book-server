# account-book-server

NestJS + Prisma backend for the shared account-book app.

## Scripts

```bash
npm run prisma:generate
npm run build
npm run start:dev
npm run test
```

## Environment

Required environment variables:

```env
APP_PORT=3000
DATABASE_URL=postgresql://account_book:password@127.0.0.1:5432/account_book
JWT_SECRET=replace_with_jwt_secret
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=replace_with_redis_password
```

The API prefix is `/api/v1`.
