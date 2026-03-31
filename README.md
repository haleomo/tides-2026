# tides-2026

## Local database setup

This app uses PostgreSQL and reads its connection string from `DATABASE_URL`.

1. Start the local Postgres container:

```sh
docker compose up -d postgres
```

2. The repo includes a local `.env` with the connection settings the app expects:

```env
DATABASE_URL=postgres://tides:tides_dev_password@localhost:5432/tides2016
SESSION_SECRET=change-me-for-production
PORT=5000
```

3. Apply the schema:

```sh
npm run db:push
```

4. Start the app from the repository root:

```sh
npm run dev
```

### Postgres container settings

- Host: `localhost`
- Port: `5432`
- Database: `tides2016`
- User: `tides`
- Password: `tides_dev_password`

If you need to recreate your local database from scratch, run:

```sh
docker compose down -v
docker compose up -d postgres
```

Use `.env.example` as the template if you want to regenerate your local env file.

