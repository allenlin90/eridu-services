```
npm install
npm run dev
```

```
open http://localhost:3000
```

# Local development setup
1. install `nodejs>20`
2. install `pnpm` for global use `npm install pnpm -g`
3. create new local database for developing `docker compose up`
4. generate auth db schema for drizzle `pnpm auth:schema`
5. generate sql migration for database `pnpm db:generate`
6. migrate auth schema to db `pnpm db:migrate`
