import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const PgStore = connectPgSimple(session);

app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "tides-75-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  }),
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const schema = await import("@shared/schema");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password TEXT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile_number TEXT NOT NULL DEFAULT '',
      nickname TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      needs_password_setup BOOLEAN NOT NULL DEFAULT false
    )
  `);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number TEXT`);
  await db.execute(sql`UPDATE users SET mobile_number = '' WHERE mobile_number IS NULL`);
  await db.execute(sql`ALTER TABLE users ALTER COLUMN mobile_number SET DEFAULT ''`);
  await db.execute(sql`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer'`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_full_name_unique_idx ON users (full_name)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_number_unique_idx ON users (mobile_number) WHERE mobile_number <> ''`);
  await db.execute(sql`UPDATE users SET role = 'viewer' WHERE role = 'member'`);
  await db.execute(sql`UPDATE users SET role = 'admin' WHERE role = 'root'`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      event_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS event_id INTEGER`);
  await db.execute(sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS recommendation_id INTEGER`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      event_date TIMESTAMP NOT NULL,
      location TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      created_by_user_id VARCHAR,
      created_by_name TEXT
    )
  `);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_name TEXT`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS recommendations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      created_by_user_id VARCHAR,
      created_by_name TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR`);
  await db.execute(sql`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS created_by_name TEXT`);
  await db.execute(sql`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS location TEXT`);
  await db.execute(sql`UPDATE recommendations SET location = '' WHERE location IS NULL`);
  await db.execute(sql`ALTER TABLE recommendations ALTER COLUMN location SET DEFAULT ''`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS recommendation_comments (
      id SERIAL PRIMARY KEY,
      recommendation_id INTEGER NOT NULL,
      author_user_id VARCHAR,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql`ALTER TABLE recommendation_comments ADD COLUMN IF NOT EXISTS author_user_id VARCHAR`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rsvps (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      mobile_number TEXT,
      status TEXT NOT NULL,
      arrival_date TEXT,
      departure_date TEXT,
      accommodation TEXT,
      transportation TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS mobile_number TEXT`);

  const { seedDatabase } = await import("./seed");
  await seedDatabase();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions =
    process.platform === "darwin"
      ? { port, host: "0.0.0.0" }
      : { port, host: "0.0.0.0", reusePort: true };

  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
