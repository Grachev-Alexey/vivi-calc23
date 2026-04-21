import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { seedPerksIfEmpty } from "./seed-perks";
import { storage } from "./storage";

const app = express();

// Trust the first reverse proxy (nginx, etc.) so secure cookies and
// req.protocol work correctly behind HTTPS termination.
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Session configuration with production-ready store
const PgSession = connectPgSimple(session);

const isProd = process.env.NODE_ENV === 'production';
const useSecureCookie = isProd && process.env.HTTPS !== 'false';

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'laser-hair-removal-calculator-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: useSecureCookie,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Make sure default packages/admin user exist before seeding perks,
  // because package_perk_values has a FK to packages.type.
  await storage.initializeDefaultData();
  await seedPerksIfEmpty();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error:', err);
    res.status(status).json({ message });
  });

  // Conditional setup based on environment
  if (process.env.NODE_ENV === 'production') {
    // Production: serve pre-built static files
    serveStatic(app);
    log('Production mode: serving static files');
  } else {
    // Development: use Vite middleware
    await setupVite(app, server);
    log('Development mode: using Vite middleware');
  }

  const port = process.env.PORT || 3000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\nPress Ctrl+C to stop the server\n`);
    log(`serving on port ${port}`);
  });
})();
