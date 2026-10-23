# 02. Backend MVP Architecture, Data Model, and Endpoints

## 1. Backend Architecture & Domain Services

Modular monolith in **Go (Fiber v2)** with Clean Architecture.

```
                    ┌──────────────────────────────┐
                    │      HTTP Layer (Fiber)      │
                    │   Routers, Handlers, DTOs    │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │      Domain Service Layer    │
                    │   Business Rules & UseCases  │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
┌─────────────▼────────────┐              ┌─────────────▼────────────┐
│    Repository Layer      │              │   EventBroadcaster       │
│ PostgreSQL / pgx Driver  │              │ In-Memory SSE Broadcast  │
└──────────────────────────┘              └──────────────────────────┘
```

### Core Domain Services (MVP)
1. **`AuthService`** — Google ID token login, LOCAL register/login, JWT access, refresh rotation, logout revoke.
2. **`OrganizationService`** — create org + initial branch, default loyalty rule, list staff.
3. **`MembershipService`** — join requests, approve/reject, approved-member checks.
4. **`BarberStatusService`** — status updates + SSE publish.
5. **`ClientService`** — QR lookup, auto-onboard, subprofiles.
6. **`LoyaltyService`** — streak preview + transactional apply/redeem.
7. **`HaircutService`** — history + `confirm-service` (ACID with loyalty).
8. **`MediaService`** — R2 (or mock) presigned URLs.

---

## 2. PostgreSQL Data Model

Snake_case English identifiers. UUIDs via `gen_random_uuid()`.

### Enums
- `user_role`: `SUPERADMIN`, `ORGANIZATION_ADMIN`, `BARBER`
- `org_member_role`: `ORGANIZATION_ADMIN`, `BARBER`
- `barber_status`: `AVAILABLE`, `BUSY_WAITLIST_OPEN`, `BUSY_WAITLIST_FULL`, `OFFLINE`
- `join_request_status`: `PENDING`, `APPROVED`, `REJECTED`
- `loyalty_reward_type`: `PERCENTAGE_DISCOUNT`, `FIXED_DISCOUNT`, `FREE_HAIRCUT`, `FREE_PRODUCT`

### Tables (MVP)
| Table | Purpose |
|---|---|
| `organizations` | Tenant root |
| `branches` | Locations |
| `users` | Barber/admin identities |
| `organization_members` | Org-scoped role membership |
| `barber_branch_members` | Branch join + live status |
| `refresh_tokens` | Hashed refresh tokens |
| `clients` | Global clients by E.164 phone |
| `family_subprofiles` | Family members under a phone |
| `loyalty_rules` | Org (or barber) reward rules |
| `client_loyalty_trackers` | Streaks per org + subprofile |
| `haircut_records` | Technical logbook + streak snapshot |

Canonical DDL: [`migrations/00001_init.sql`](../../migrations/00001_init.sql).

---

## 3. Endpoints (`/api/v1`)

Authenticated routes require `Authorization: Bearer <access_token>`.

### 3.1 Auth
- `POST /auth/google` — `{id_token, role?}` — primary login (Google Sign-In ID token; upsert user)
- `POST /auth/register` — `{email,password,full_name,role?}` — LOCAL
- `POST /auth/login` — `{email,password}` — LOCAL
- `POST /auth/refresh` — `{refresh_token}` (rotates)
- `POST /auth/logout` — `{refresh_token}` (revokes)

### 3.2 Organizations & Staff
- `POST /organizations` — creates org + initial branch + admin membership + default loyalty rule
- `POST /branches/:branch_id/join-requests` — barber requests join
- `PUT /branches/:branch_id/join-requests/:request_id` — `{action: APPROVE|REJECT}` (org admin)
- `GET /branches/:branch_id/staff` — list memberships

### 3.3 Barber Status & SSE
- `PUT /barbers/me/branches/:branch_id/status` — `{status}`
- `GET /public/barbers/:barber_id/branches/:branch_id/status/stream` — public SSE

### 3.4 Clients
- `POST /clients/lookup-by-qr` — `{qr_payload, branch_id}`
- `POST /clients/:client_id/subprofiles` — `{alias_name, relationship?}`

### 3.5 Haircuts
- `GET /subprofiles/:subprofile_id/history?branch_id=`
- `POST /haircuts/confirm-service` — `{subprofile_id, branch_id, redeem_reward, technical_notes, photo_urls}`

### 3.6 Media
- `POST /media/presigned-url` — `{file_type: image/webp, category: haircut_photo|avatar}`

### Ops
- `GET /healthz`

---

## 4. Key Business Rules

1. Branch operations require `barber_branch_members.request_status = APPROVED` and `is_active = true`.
2. Creating an organization makes the actor org admin and approved branch member; a default 5-cut / 50% loyalty rule is seeded.
3. QR payload phone must be E.164; `ts` must be within `QR_TTL`.
4. First scan creates client + `Self` subprofile + loyalty tracker on preview.
5. `confirm-service` locks the tracker (`FOR UPDATE`), increments streak, optionally redeems (reset to 0 when threshold met), then inserts the haircut row in the same transaction.
6. SSE payload contains only status fields (no client PII).

---

## 5. Post-MVP (NOT IMPLEMENTED)

- Financial / cash register module
- Redis Pub/Sub multi-node SSE
- Apple Sign-In
- HMAC-signed QR payloads
