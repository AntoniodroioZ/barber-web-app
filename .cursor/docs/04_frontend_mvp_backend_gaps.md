# 04. Frontend MVP Backend Gaps — Services & Endpoints Spec

## 1. Purpose

Docs [`01`](01_technologies_architecture_deployment.md) and [`02`](02_backend_mvp_data_model_endpoints.md) define the **backend core MVP**, which is already implemented.

Doc [`03`](03_frontend_bento_ux_ui_specs.md) defines the **barber mobile app** and **client web app** UX. Several UI surfaces require API contracts that are **not** in doc 02.

This document is the **executable backlog** for those gaps. Implement only what is specified here before treating the frontend MVP as backend-complete.

> **Status:** IMPLEMENTED (see `internal/service/` + router).  
> **Base path:** `/api/v1`  
> **Auth:** `Authorization: Bearer <access_token>` unless marked Public.

---

## 2. Gap Inventory (maps to Frontend Screens)

| # | Gap | Frontend surface (doc 03) | Priority |
|---|---|---|---|
| G1 | Barber session context + branch list | Top bar: Branch Selector & Barber Avatar | P0 |
| G2 | Client search by phone / name | Screen B fallback drawer | P0 |
| G3 | Today’s metrics | Bento Cell 2: Today’s Metrics | P1 |
| G4 | Public loyalty card (by phone) | Client web: Digital Loyalty Card | P0 |
| G5 | Station deep-link / mirror QR contract | Screen E + client web entry URL | P0 |

**Out of scope for this doc (already shipped in MVP 02):**
Google/LOCAL auth, org create, join requests, status PUT + SSE, QR lookup, subprofiles, confirm-service, history, media presigned URLs.

---

## 3. Domain Services to Add / Extend

### 3.1 `BarberSessionService` (new)
**Responsibility:** hydrate the authenticated barber’s working context after login.

| Method | Description |
|---|---|
| `GetMe` | Return user profile + approved branch memberships (org, branch, current status). |

### 3.2 `ClientService` (extend)
| Method | Description |
|---|---|
| `Search` | Find clients by E.164 phone (exact/prefix) or name/alias (ILIKE), scoped to the actor’s organization via prior haircuts or existing trackers. See §5.2 for scoping rules. |

### 3.3 `MetricsService` (new)
| Method | Description |
|---|---|
| `TodayForBarber` | Count haircuts completed today and rewards redeemed today for the barber at a branch (timezone = branch timezone). |

### 3.4 `LoyaltyService` (extend) + public handler
| Method | Description |
|---|---|
| `PublicPreviewByPhone` | Resolve or soft-create client + `Self` subprofile; return streak preview for the organization that owns the barber/branch station. No barber JWT. |

> Soft-create on public preview must **not** invent fake names; only ensure `clients` + `Self` subprofile + tracker exist so the loyalty card can render. Same onboarding spirit as `LookupByQR`, without requiring a scanned QR TTL payload.

---

## 4. Endpoints

### 4.1 G1 — Barber session context

#### `GET /barbers/me`

**Auth:** JWT (any active user).

**Response 200**
```json
{
  "user": {
    "id": "07d55237-ec38-447d-b6bc-befbef7780de",
    "full_name": "Carlos Méndez",
    "email": "carlos@demo.barber",
    "role": "BARBER",
    "avatar_url": null
  },
  "memberships": [
    {
      "membership_id": "4b2e8c61-1234-4567-89ab-cdef01234567",
      "organization_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "organization_name": "Classic Barber Studio",
      "organization_slug": "classic-barber-studio",
      "branch_id": "db30c69e-c20b-4f34-a871-2e284a885ac5",
      "branch_name": "Downtown Branch",
      "timezone": "America/Mexico_City",
      "request_status": "APPROVED",
      "current_status": "AVAILABLE",
      "status_updated_at": "2026-10-07T03:45:03Z",
      "is_active": true
    }
  ]
}
```

**Rules**
1. Include only `barber_branch_members` where `request_status = APPROVED` and `is_active = true`.
2. Order: `organization_name ASC`, then `branch_name ASC`.
3. Frontend uses this for: avatar, default branch selection, and status pills initial state (no need to wait for SSE).

**Errors:** `401`

---

### 4.2 G2 — Client search (scanner fallback)

#### `GET /clients/search?branch_id=&q=`

**Auth:** JWT + approved membership on `branch_id`.

**Query**
| Param | Required | Notes |
|---|---|---|
| `branch_id` | yes | UUID; membership enforced |
| `q` | yes | trim; min 2 chars |
| `limit` | no | default `20`, max `50` |

**Search behavior**
1. Normalize `q`:
   - If digits-looking (optional leading `+`), treat as phone search: match `clients.phone_number` with suffix/prefix against E.164 stored values (e.g. `5512345678` matches `+525512345678`).
   - Else treat as text: `ILIKE` on `clients.full_name` and `family_subprofiles.alias_name`.
2. **Scope:** return clients that already have a loyalty tracker **or** at least one haircut in the organization of `branch_id`. Do **not** invent new clients on search (unlike QR lookup).
3. For each client, include subprofiles with loyalty preview for that org (same fields as `lookup-by-qr`).

**Response 200**
```json
{
  "query": "551234",
  "results": [
    {
      "id": "d74f405f-534f-4bb6-a373-c97c46ef33bf",
      "phone_number": "+525512345678",
      "full_name": "Luis Hernández",
      "subprofiles": [
        {
          "id": "c8af5acf-b30b-4ba9-a20c-f482afb55e6b",
          "alias_name": "Self",
          "avatar_url": null,
          "relationship": "Self",
          "current_streak": 4,
          "next_haircut_reward_unlocked": true,
          "reward_banner": "¡Aviso: Este es su 5to corte, hoy toca 50% off!"
        }
      ]
    }
  ]
}
```

**Errors:** `400` (missing/short `q`, invalid `branch_id`), `403` (not approved member)

**Frontend flow after select:** same as post-QR — open Screen C (identity confirmation) using the selected client payload; no second lookup required unless the app prefers re-fetching via QR payload built client-side.

---

### 4.3 G3 — Today’s metrics

#### `GET /barbers/me/branches/:branch_id/metrics/today`

**Auth:** JWT + approved membership on `:branch_id`.

**Response 200**
```json
{
  "branch_id": "db30c69e-c20b-4f34-a871-2e284a885ac5",
  "barber_id": "07d55237-ec38-447d-b6bc-befbef7780de",
  "timezone": "America/Mexico_City",
  "date": "2026-10-07",
  "haircuts_completed": 12,
  "rewards_redeemed": 3
}
```

**Rules**
1. Day window is computed in the **branch timezone** (`branches.timezone`), from `00:00:00` inclusive to next day exclusive.
2. `haircuts_completed`: count `haircut_records` where `barber_id = me` AND `branch_id = :branch_id` AND `completed_at` in that window.
3. `rewards_redeemed`: count rows in the same set where a reward was applied (`reward_applied_id IS NOT NULL` **or** equivalent flag already stored on confirm — use the column that `confirm-service` persists today).
4. Empty day → zeros, not 404.

**Errors:** `400`, `403`

---

### 4.4 G4 — Public loyalty card (client web)

The client web stores only a phone in `localStorage` and renders a **dynamic QR** with:

```json
{"ver":1,"typ":"client_id","phone":"+525512345678","ts":1728240000}
```

The loyalty bento (“Tu Racha: 4/5”) therefore needs a **public, phone-based** preview tied to the station the client opened (`barber_id` + `branch_id` from the deep link).

#### `GET /public/stations/:barber_id/branches/:branch_id/loyalty?phone=`

**Auth:** Public (no JWT). Apply IP rate limit (suggest: 60 req/min).

**Query**
| Param | Required | Notes |
|---|---|---|
| `phone` | yes | E.164 (`+525512345678`) |

**Behavior**
1. Validate `barber_id` + `branch_id` refer to an **APPROVED + active** membership (station exists). Else `404`.
2. Resolve organization from the branch.
3. Upsert client by phone; ensure `Self` subprofile exists.
4. Return loyalty preview for `(organization_id, Self subprofile)` — **do not** mutate streak.
5. Do **not** return other family subprofiles on the public card (privacy + product: web card is for the phone owner’s Self profile). Barber app still sees all subprofiles via authenticated lookup/search.

**Response 200**
```json
{
  "barber_id": "07d55237-ec38-447d-b6bc-befbef7780de",
  "branch_id": "db30c69e-c20b-4f34-a871-2e284a885ac5",
  "organization_name": "Classic Barber Studio",
  "barber_name": "Carlos Méndez",
  "phone_number": "+525512345678",
  "subprofile_id": "c8af5acf-b30b-4ba9-a20c-f482afb55e6b",
  "alias_name": "Self",
  "current_streak": 4,
  "target_haircut_count": 5,
  "next_haircut_reward_unlocked": true,
  "reward_banner": "¡Aviso: Este es su 5to corte, hoy toca 50% off!",
  "reward_description": "50% off"
}
```

**Errors:** `400` (invalid phone), `404` (unknown station), `429` (rate limit)

**Privacy notes**
- Response must not include other clients, history photos, or technical notes.
- Phone echo is intentional (client already typed it).

---

### 4.5 G5 — Station deep-link / mirror QR contract

No new persistence table. This is a **URL + payload contract** the backend and both frontends must share.

#### Mirror / station URL

```
https://cliente.mi-barberia.com/b/{barber_id}?branch_id={branch_id}
```

| Segment / param | Required | Why |
|---|---|---|
| `barber_id` | yes | SSE channel + public loyalty station key |
| `branch_id` | yes | SSE requires branch; loyalty org is derived from branch |

**Screen E (barber app)** must encode **both** IDs when generating the printable/shareable mirror QR.

#### Client-generated dynamic QR payload (unchanged shape; keep `ver`)

```json
{"ver":1,"typ":"client_id","phone":"+525512345678","ts":1728240000}
```

- Generated on the client web from `localStorage.client_phone`.
- Consumed by barber app via existing `POST /clients/lookup-by-qr`.
- TTL validated server-side with `QR_TTL` (default 5m).

#### Client web bootstrap sequence (target)

1. Parse `barber_id` + `branch_id` from URL.
2. Open SSE: `GET /public/barbers/:barber_id/branches/:branch_id/status/stream`.
3. If phone in localStorage → `GET /public/stations/.../loyalty?phone=`.
4. Else show phone onboarding → store → call loyalty → render QR with rotating `ts`.

#### Optional helper (implement if cheap)

#### `GET /public/stations/:barber_id/branches/:branch_id`

**Auth:** Public.

**Response 200**
```json
{
  "barber_id": "07d55237-ec38-447d-b6bc-befbef7780de",
  "barber_name": "Carlos Méndez",
  "barber_avatar_url": null,
  "branch_id": "db30c69e-c20b-4f34-a871-2e284a885ac5",
  "branch_name": "Downtown Branch",
  "organization_name": "Classic Barber Studio",
  "organization_logo_url": null,
  "current_status": "AVAILABLE",
  "status_updated_at": "2026-10-07T03:45:03Z"
}
```

Used for header branding before the first SSE event. If omitted, the web can wait for SSE / hardcode labels — but implementing this avoids a blank header flash.

---

## 5. Business Rules Summary

1. **Membership gate:** G1 lists only APPROVED+active memberships; G2/G3 require APPROVED+active on the target branch.
2. **Search does not onboard:** unknown phones/names return empty results; onboarding remains QR lookup (or public loyalty soft-create for Self only).
3. **Public loyalty soft-create is Self-only** and org-scoped via the station’s branch.
4. **Metrics timezone** comes from `branches.timezone`, not the server local clock.
5. **Snake_case JSON** for all new payloads (do not repeat the PascalCase staff serialization inconsistency).
6. **No PII on SSE**; public loyalty returns only the caller’s phone + Self streak fields.

---

## 6. Suggested Implementation Order

| Step | Deliverable | Unblocks |
|---|---|---|
| 1 | `GET /barbers/me` | Branch selector, avatar, initial status |
| 2 | Station URL contract + optional `GET /public/stations/...` | Mirror QR + web header |
| 3 | `GET /public/stations/.../loyalty` | Client web loyalty bento + QR loop |
| 4 | `GET /clients/search` | Scanner fallback drawer |
| 5 | `GET /barbers/me/branches/:branch_id/metrics/today` | Today’s metrics bento |

---

## 7. Acceptance Checklist (Frontend MVP backend-ready)

- [x] After Google/LOCAL login, app can load branches without hardcoding UUIDs.
- [x] Barber can switch status using membership from `/barbers/me` and existing PUT status.
- [x] Barber can find a returning client without camera (phone or name).
- [x] Today’s haircuts + rewards counts render for the selected branch.
- [x] Mirror QR deep link includes `barber_id` **and** `branch_id`. *(contract; frontend encodes URL)*
- [x] Client web shows live SSE status + loyalty streak for the stored phone + regenerating QR.
- [x] Public loyalty is rate-limited and does not expose family subprofiles or cut history.

---

## 8. Explicitly Still Post-MVP

Unchanged from doc 02 / product backlog:

- Financial / cash register module
- Redis Pub/Sub multi-node SSE
- Apple Sign-In
- HMAC-signed QR payloads
- Autocomplete ranking / fuzzy name search beyond `ILIKE`
- Client accounts / OTP login (phone remains localStorage + dynamic QR)
