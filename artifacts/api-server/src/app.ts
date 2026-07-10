import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import pg from "pg";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    sessionVersion?: number;
    emailVerified?: boolean;
  }
}

const app: Express = express();

// Replit (and most cloud platforms) terminate TLS at their reverse proxy and
// forward requests to the app over plain HTTP. Without this, Express sees
// req.secure=false and refuses to set the `secure: true` session cookie,
// so every login appears to succeed but the session is immediately lost.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

function buildAllowedOrigins(): string[] {
  const domains = (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `https://${d}`);

  if (process.env.NODE_ENV !== "production") {
    domains.push(
      "http://localhost",
      "http://localhost:80",
      "http://localhost:3000",
      "http://localhost:18082",
    );
  }

  return domains;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = buildAllowedOrigins();
      if (allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: origin not allowed"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production");
  }
  logger.warn("SESSION_SECRET is not set — using insecure fallback. Set SESSION_SECRET before deploying.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable must be set");
}

const PgSession = ConnectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: databaseUrl });

// create the session table inline so it works when bundled by esbuild
// (connect-pg-simple's createTableIfMissing reads a .sql file from disk,
//  which breaks after bundling because the path no longer exists)
pgPool.query(`
  CREATE TABLE IF NOT EXISTS "user_sessions" (
    "sid"    varchar     NOT NULL COLLATE "default",
    "sess"   json        NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
  ) WITH (OIDS=FALSE);
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
`).catch((err: Error) => logger.error({ err }, "Failed to ensure user_sessions table"));

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "user_sessions",
      createTableIfMissing: false,
    }),
    secret: sessionSecret ?? "scalewise-dev-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api", router);

export default app;
