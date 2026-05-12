# tides-2026

Tides 2026 is a full-stack event and trip coordination app. It provides authenticated access to schedules, RSVPs, recommendations, photo uploads, messages, and admin workflows from a single TypeScript codebase.

## Architecture

The application is structured as a single deployable service with a separate browser client:

- `client/`: React single-page app built with Vite.
- `server/`: Express application that serves the API, sessions, uploads, and the built client in production.
- `shared/`: Drizzle schema and Zod validation shared between client/server types and API contracts.
- `uploads/`: Runtime storage for uploaded images.

### Runtime flow

1. The browser loads the React app from the built Vite output in `dist/public`.
2. The React client calls Express API routes under `/api/...`.
3. Express uses PostgreSQL both for application data and for persisted user sessions.
4. Uploaded images are written to the `uploads/` directory via Multer.
5. Shared schema definitions in `shared/schema.ts` keep database types and request validation aligned.

### Data model at a glance

The PostgreSQL schema covers these core entities:

- users
- events
- recommendations
- recommendation comments
- messages
- message comments
- photos
- RSVPs
- itineraries

Role-based access control is built around these roles:

- `admin`
- `editor`
- `contributor`
- `viewer`

## Tools and Libraries

### Application framework

- `React 18` for the client UI
- `Vite` for client development and production builds
- `Express 5` for the HTTP server and API layer
- `TypeScript` across client, server, and shared code

### Routing, state, and forms

- `wouter` for client-side routing
- `@tanstack/react-query` for server-state fetching and cache management
- `react-hook-form` with `@hookform/resolvers` for forms
- `zod` and `drizzle-zod` for validation and typed input schemas

### UI system

- `Tailwind CSS`
- `Radix UI` primitives
- `class-variance-authority`, `clsx`, and `tailwind-merge` for component styling
- `lucide-react`, `react-icons`, `recharts`, `framer-motion`, `embla-carousel-react`, and other focused UI packages used by specific screens

### Data and persistence

- `PostgreSQL` as the primary datastore
- `drizzle-orm` for queries and typed schema access
- `drizzle-kit` for schema push workflows
- `pg` as the PostgreSQL driver
- `connect-pg-simple` for PostgreSQL-backed Express sessions

### Authentication and uploads

- `express-session` for cookie-backed sessions
- `bcryptjs` for password hashing
- `multer` for image upload handling

### Build and operations

- `tsx` for local TypeScript execution in development
- `esbuild` for bundling the server into `dist/index.cjs`
- `Docker` and `docker compose` for containerized database and full-stack deployment

## Project Layout

```text
client/
    src/
        components/
        hooks/
        lib/
        pages/
server/
    db.ts
    index.ts
    routes.ts
    seed.ts
    static.ts
    storage.ts
shared/
    schema.ts
uploads/
script/
    build.ts
```

## Local Development

### Prerequisites

- Node.js 22
- npm
- Docker Desktop or another Docker runtime

### Environment variables

The app reads configuration from environment variables via `dotenv/config`.

Minimum local configuration:

```env
DATABASE_URL=postgres://tides:tides_dev_password@localhost:5432/tides2026
SESSION_SECRET=change-me-for-production
PORT=3000
```

### Start the database

```sh
npm run db:up
```

Default local Postgres settings:

- Host: `localhost`
- Port: `5432`
- Database: `tides2026`
- User: `tides`
- Password: `tides_dev_password`

### Install dependencies and apply schema

```sh
npm install
npm run db:push
```

### Start the app

```sh
npm run dev
```

This runs the Express server directly from `server/index.ts` using `tsx`. In development, the Vite client is integrated into the same workflow.

### Reset the local database

```sh
npm run db:reset
```

## Bootstrap Admin User

There is no fixed default password for the bootstrap admin accounts.

Bootstrap usernames:

- `admin`
- `root`

On first login, enter one of those usernames and any password you want to assign. That password is then stored and becomes the password for future logins.

Relevant implementation files:

- `server/seed.ts`
- `server/routes.ts`

## Build and Deployment

The production build has two parts:

- Vite builds the client into `dist/public`
- esbuild bundles the server into `dist/index.cjs`

Run a production build locally with:

```sh
npm run build
```

### Option 1: Deploy with Node.js

Use this when you want to run the built app directly on a VM or host.

1. Install dependencies:

```sh
npm install
```

2. Set production environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
SESSION_SECRET=replace-with-a-long-random-secret
```

3. Build the app:

```sh
npm run build
```

4. Start the server:

```sh
npm run start
```

Notes:

- `npm run start` runs `node dist/index.cjs`
- The server serves the built client assets from `dist/public`
- Ensure the `uploads/` directory is writable in the deployment environment
- PostgreSQL must be reachable from the app using `DATABASE_URL`

### Option 2: Deploy with Docker Compose

This repository includes a production-oriented `Dockerfile` and `docker-compose.yml`.

Start the full stack:

```sh
docker compose up --build -d
```

The compose setup provides:

- `postgres`: PostgreSQL 16 with a named Docker volume for persistent database storage
- `app`: the Node.js application container built from this repository

Default container environment:

- App port: `3000`
- Postgres port: `5432`
- Database URL inside Compose: `postgres://tides:tides_dev_password@postgres:5432/tides2026`

Recommended production overrides:

- Set a strong `SESSION_SECRET`
- Replace the default Postgres credentials
- Keep `./uploads:/app/uploads` or mount another persistent volume for uploaded photos

To stop the stack:

```sh
docker compose down
```

To remove the database volume as well:

```sh
docker compose down -v
```

## Persistence Notes

- PostgreSQL data is stored in the named Docker volume `postgres-data`
- Uploaded files are stored in `uploads/` and mounted into the app container in Compose

On macOS, the Docker volume backing PostgreSQL lives inside Docker Desktop's Linux VM rather than as a normal Finder-visible directory on the host.