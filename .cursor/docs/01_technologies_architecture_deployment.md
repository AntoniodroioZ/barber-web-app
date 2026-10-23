# 01. Technologies, Architecture, and Deployment Specifications

## 1. Executive Summary & Cost Philosophy

This document outlines the architectural blueprint, technology stack selection, and deployment pipelines for the **B2B2C SaaS Platform for Barbershops and Hair Salons**.

### Guiding Principles
1. **Extreme Cost Efficiency (Near-Zero or $0 Initial Cost):** Maximize generous free-tier cloud resources without sacrificing latency, uptime, or data durability during early adoption.
2. **Deterministic Stability & Zero Cold-Starts:** Prevent idle sleep penalties on customer-facing real-time endpoints (Server-Sent Events) and web applications.
3. **Decoupled Architecture:** Strict separation between client identity, barber affiliations, and organization-level loyalty programs.
4. **Full CI/CD Automation:** Every commit to `main` undergoes automated testing, artifact bundling, and zero-downtime deployment via GitHub Actions.

> **Repo note:** This repository (`barber-backend`) is the backend-only codebase. Paths in CI/CD reference the repo root (not a nested `backend/` folder).

---

## 2. Infrastructure & Hosting Strategy

### Keep-Alive / Cold Starts
Free-tier PaaS providers may sleep after inactivity. Preferred MVP hosting is a small always-on VPS (Hetzner / Oracle Always Free / DigitalOcean) so SSE connections stay alive without pingers.

Fallback if using free PaaS: UptimeRobot / cron-job.org pinging `GET /healthz` every 5–10 minutes.

### Hosting Matrix & Cost Breakdown

| Component | Technology / Platform | Tier / Plan | Estimated Monthly Cost | Fallback / Alternative |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API & SSE** | Go (Fiber) in Docker on Hetzner VPS / Fly.io / Oracle Cloud | CX22 VPS or Free Tier | **$0.00 – $4.10 USD** | Fly.io (Hobby) or Koyeb Free + UptimeRobot |
| **Database** | PostgreSQL 16 with JSONB (local Docker / Supabase / Neon) | Free Tier | **$0.00 USD** | Self-hosted PostgreSQL on VPS Docker |
| **Object Storage** | Cloudflare R2 | Free Tier | **$0.00 USD** | Mock mode locally (`R2_MOCK=true`) |
| **Client Web App** | Cloudflare Pages / Vercel | Free Tier | **$0.00 USD** | GitHub Pages |
| **Mobile App CI/CD** | Expo Application Services (EAS Build) | Free Tier | **$0.00 USD** | Local Fastlane / GitHub Actions Runner |
| **Domain & SSL** | Cloudflare DNS + Universal SSL / Let's Encrypt | Free Tier | **$0.00 USD** | Standard Registrar DNS |

---

## 3. Technology Stack (MVP Implemented)

### 3.1 Backend: Go 1.26 & Fiber v2
- Compiled static binary, low memory footprint, native concurrency for SSE.
- Layout: modular monolith with Clean Architecture (`cmd/`, `internal/`, `migrations/`).
- Driver: `pgx` + `pgxpool` (no ORM).
- Migrations: `goose` SQL files applied on boot when `RUN_MIGRATIONS=true`.

### 3.2 Database: PostgreSQL 16 + JSONB
- Relational multi-tenant integrity across organizations, branches, members, clients.
- JSONB for `technical_notes`.
- Row locks (`FOR UPDATE`) on loyalty trackers during `confirm-service`.

### 3.3 Media Storage: Cloudflare R2 + Presigned URLs
- `POST /api/v1/media/presigned-url` returns an expiring PUT URL.
- Local/dev default: `R2_MOCK=true` returns mock upload/public URLs.

### 3.4 Real-Time: In-Memory SSE Hub
- `EventBroadcaster` interface with `InMemoryBroadcaster` implementation.
- Redis Pub/Sub adapter is **post-MVP**.

### 3.5 Auth (MVP)
- **Google Sign-In** via ID token: `POST /api/v1/auth/google` (primary product login).
- Email/password LOCAL register + login (seed/dev / fallback).
- JWT access tokens (`JWT_ACCESS_TTL`, default 15m).
- Refresh token rotation stored hashed in `refresh_tokens`.
- Config: `GOOGLE_CLIENT_IDS` (CSV of OAuth client IDs; required outside development).
- Apple Sign-In is post-MVP.

---

## 4. Real-Time Architecture: Server-Sent Events (SSE)

```
[Barber Mobile App]
       │ (HTTP PUT /api/v1/barbers/me/branches/:branch_id/status)
       ▼
[Go Fiber Backend] ───► Updates DB (PostgreSQL)
       │
       ▼
[In-Memory EventBroadcaster] ───► Broadcasts channel barber:{id}:branch:{id}
       │
       └──────► [Client Web EventSource]
```

Public stream: `GET /api/v1/public/barbers/:barber_id/branches/:branch_id/status/stream`  
Heartbeat comments every 25 seconds.

---

## 5. Multi-Tenancy & Data Ownership

1. **Client Identity** (`clients`, `family_subprofiles`): global, keyed by E.164 phone.
2. **Organization Loyalty** (`client_loyalty_trackers`, `loyalty_rules`): scoped per organization (+ subprofile).
3. **Membership**:
   - `organization_members` — org-level role (`ORGANIZATION_ADMIN` | `BARBER`).
   - `barber_branch_members` — branch join requests + live status.
4. **Haircut Logbook** (`haircut_records`): owned cooperatively (barber technical notes + branch attendance).

### Dynamic Client QR (MVP)
Unsigned JSON payload with TTL validation (`QR_TTL`, default 5m):

```json
{"ver":1,"typ":"client_id","phone":"+525512345678","ts":1728240000}
```

HMAC signing is a post-MVP hardening item.

---

## 6. CI/CD Pipeline (this repo)

Workflow: [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml)

On push/PR to `main`:
1. `go vet ./...`
2. `go test -race ./...`
3. Static Linux binary build
4. Docker image build (no push required for CI)
5. Optional SSH deploy when `SERVER_HOST` / `SERVER_USER` / `SERVER_SSH_KEY` secrets exist

Local Docker Compose:
```bash
docker compose up -d postgres
go run ./cmd/api
```

---

## 7. Security & Environment Configuration

See [`.env.example`](../../.env.example). Mandatory variables:

```env
PORT=8080
ENV=production
ALLOWED_ORIGINS=https://cliente.mi-barberia.com
DATABASE_URL=postgres://user:password@host:5432/postgres?sslmode=require
JWT_SECRET=super-secret-random-32-char-string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h
GOOGLE_CLIENT_IDS=xxxx.apps.googleusercontent.com
R2_MOCK=false
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=barber-media-production
R2_PUBLIC_CUSTOM_DOMAIN=https://media.mi-barberia.com
```
