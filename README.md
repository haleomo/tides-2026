# tides-2026

## Local database setup

This app uses PostgreSQL and reads its connection string from `DATABASE_URL`.

1. Start the local Postgres container:

```sh
npm run db:up
```

2. The repo includes a local `.env` with the connection settings the app expects:

```env
DATABASE_URL=postgres://tides:tides_dev_password@localhost:5432/tides2026
SESSION_SECRET=change-me-for-production
PORT=3000
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
- Database: `tides2026`
- User: `tides`
- Password: `tides_dev_password`

## Bootstrap admin user

There is no pre-set password for bootstrap admins.

Bootstrap usernames:

- admin
- root

How login works:

On first login, enter the username plus whatever password you want to set.
That first password is saved and becomes the account password going forward.

- Seeded accounts: `server/seed.ts`
- First-login setup logic: `server/routes.ts`

If you need to recreate your local database from scratch:

```sh
npm run db:reset
```

Use `.env.example` as the template if you want to regenerate your local env file.

# Access Controls

- admin
- editor
- contributor
- viewer