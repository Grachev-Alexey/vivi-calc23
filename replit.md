# Vivi Calc

Express + React (Vite) TypeScript app with Drizzle ORM on PostgreSQL.

## Stack
- Backend: Express (server/index.ts) using Vite middleware in dev
- Frontend: React + Vite (client/)
- ORM: Drizzle (shared/schema.ts), `npm run db:push` to sync
- DB: Replit-managed PostgreSQL (DATABASE_URL injected by Replit)

## Replit setup
- Workflow `Start application`: `npm run dev` on port 5000 (webview)
- Single-port: Express serves both API and Vite-managed frontend on port 5000 (host 0.0.0.0)
- `.env` sets `PORT=5000`, `NODE_ENV=development`, `SESSION_SECRET`
- Vite has `allowedHosts: true` (server/vite.ts) for the Replit iframe proxy

## Deployment
- Configured as `autoscale`: build `npm run build`, run `npm run start`

## Notes
- Pinned versions for Drizzle compatibility: `drizzle-orm@0.39.1`, `drizzle-kit@0.30.6`, `zod@3.24.2`
