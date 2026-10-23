# 07. Servicios pedidos al backend — perfil, equipo, barbería, clientes y página pública

Spec de la app barbero para el repo `barber-backend`.  
**Estado: implementado** en `barber-backend` (migración `00003_profile_shop_public.sql`). El contrato vigente es `docs/02-services.md`, `docs/03-api-endpoints.md` y `docs/04-data-model.md`. Este archivo queda como spec de origen.

No confundir este archivo con `barber-backend/docs/07-frontend-integration.md`.

Convenciones que este spec no relaja:

- Prefijo `/api/v1`.
- JSON snake_case. UUIDs string. Fechas ISO-8601 UTC.
- Teléfono E.164: `^\+[1-9]\d{7,14}$` (la misma regex de `ClientService`).
- Errores `{ "error": "mensaje legible" }` con los HTTP de `05-auth-and-errors.md`.
- Auth de escritura: `Authorization: Bearer <access_token>`.
- Membership de silla: `request_status = APPROVED` y `is_active = true`, vía `MembershipService.RequireApprovedMember`, salvo donde este doc diga otra cosa.
- Admin de organización: `organization_members.role = ORGANIZATION_ADMIN` y `is_active = true` sobre la org dueña del recurso.

La app no geocodifica en el servidor ni abre un SDK de mapas en el backend. El mapa y el botón de compartir (Apple Maps / Google Maps) son de la app. El backend solo persiste dirección y coordenadas.

---

## 1. Inventario

| # | Feature de la app | Servicio | Tipo |
|---|---|---|---|
| S1 | Listado de clientes del barbero en la sucursal activa | `ClientService` | extender |
| S2 | Ficha del barbero (propia y de un compañero) | `BarberSessionService` + `OrganizationService` | extender |
| S3 | Quitar / reactivar barbero del equipo, y salir de la silla | `MembershipService` | extender |
| S4 | Leer y editar barbería y sucursales (dirección, pin, horario, logo) | `OrganizationService` | extender |
| S5 | Perfil del usuario: nombre, teléfono, bio, foto | `BarberSessionService` + `MediaService` | extender |
| S6 | Página pública tipo linktree (status + redes + catálogo + ubicación) | `PublicPageService` nuevo, lectura montada sobre la station actual | nuevo |
| S7 | QR de bitácora del cliente (largo plazo, distinto del QR de escaneo en silla) | `LogbookPassService` nuevo | nuevo |

Citas **no** se implementan. El payload público lleva `capabilities.appointments: false` fijo para que la página pueda colgar un `BookingService` después sin romper el contrato.

---

## 2. Lo que ya existe y no hay que rehacer

| Pieza | Uso en estas features |
|---|---|
| `GET /barbers/me` | Base de la ficha propia. Se le agregan campos; no se quitan los actuales. |
| `GET /branches/:branch_id/staff` | Roster. Cambiar el JSON emitido a snake_case y sumar `avatar_url`. La app ya acepta PascalCase y snake_case. |
| `PUT .../join-requests/:request_id` | Sigue siendo el único camino para `APPROVE` / `REJECT`. No mezclarlo con la baja. |
| `POST /organizations` | Sigue creando org + sucursal inicial + admin APPROVED + regla de lealtad. `address` ya es obligatorio ahí. |
| `users.full_name`, `users.avatar_url`, `users.phone_number` | Columnas listas. `UserRepo.UpdateProfile` existe y no está expuesto por HTTP: usarlo, no duplicar el `UPDATE`. |
| `branches.address`, `branches.phone_number`, `branches.timezone`, `branches.is_active` | Columnas listas. Address no se devuelve en `/barbers/me`. |
| `organizations.logo_url` | Columna lista, sin escritura. |
| `POST /media/presigned-url` | `category` ya acepta `haircut_photo` y `avatar`. Sumar categorías nuevas (§8). |
| `GET /public/stations/:barber_id/branches/:branch_id` | Base del linktree. Respuesta aditiva. Mismas reglas de 404 y el rate limit de 60 req/min/IP. |
| `POST /clients/lookup-by-qr` | QR corto de teléfono (`typ: client_id`, TTL `QR_TTL`). No reemplazarlo con el pase de bitácora. |
| `GET /subprofiles/:id/history` | Bitácora autenticada del barbero, con `technical_notes`. El pase público no la reutiliza tal cual (§7.S7). |
| `GET /clients/search` | Búsqueda de la org. No es el listado “mis clientes”. |

Baja física de organización, sucursal o usuario: no. `haircut_records.branch_id` y `barber_id` son `ON DELETE RESTRICT`.

---

## 3. Modelo de datos

Migración nueva (goose). Nada de esto reemplaza columnas actuales.

### 3.1 Columnas

`users`

| Columna | Tipo | Regla |
|---|---|---|
| `bio` | `TEXT` NULL | Máximo 280 caracteres. NULL = sin bio. |

`phone_number` ya existe y es único. En el perfil, `null` limpia el teléfono.

`organizations`

| Columna | Tipo | Regla |
|---|---|---|
| `is_active` | `BOOLEAN NOT NULL DEFAULT TRUE` | Baja lógica. Las filas actuales quedan activas. |

`branches`

| Columna | Tipo | Regla |
|---|---|---|
| `latitude` | `NUMERIC(9,6)` NULL | −90 a 90. NULL si no hay pin. |
| `longitude` | `NUMERIC(9,6)` NULL | −180 a 180. NULL si no hay pin. |
| `opening_hours` | `JSONB` NULL | Ver §3.3. NULL = horario no cargado (la UI no inventa “cerrado”). |

`latitude` y `longitude` se escriben juntas: ambas con valor, o ambas NULL. Una sola presente → `400`.

Índice no requerido para el pin (no hay búsqueda geo en este alcance).

### 3.2 Tablas nuevas

```sql
CREATE TYPE public_link_owner AS ENUM ('USER', 'BRANCH');
CREATE TYPE public_link_platform AS ENUM (
  'instagram', 'tiktok', 'facebook', 'whatsapp', 'x', 'youtube', 'website', 'other'
);

CREATE TABLE public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type public_link_owner NOT NULL,
    owner_id UUID NOT NULL,
    platform public_link_platform NOT NULL,
    label VARCHAR(40) NOT NULL,
    url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_public_links_owner ON public_links (owner_type, owner_id, sort_order);

CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(80) NOT NULL,
    description VARCHAR(280),
    photo_url TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_portfolio_user ON portfolio_items (user_id, sort_order);

CREATE TABLE logbook_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subprofile_id UUID NOT NULL REFERENCES family_subprofiles(id) ON DELETE CASCADE,
    issued_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logbook_passes_subprofile ON logbook_passes (organization_id, subprofile_id);
```

`public_links.owner_id` no tiene FK polimórfica. El servicio valida que el `USER` o la `BRANCH` existan antes de insertar. Borrar un user cascadea su portafolio. Borrar links de un user o branch es responsabilidad del servicio en la baja lógica (no hace falta trigger).

Tope por dueño: **12** links con `is_active = true`. El link 13 → `409`.

Tope por barbero: **24** `portfolio_items`. El 25 → `409`.

### 3.3 `opening_hours`

Objeto con las siete llaves exactas: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`.

Cada valor es un array de rangos (cero, uno o dos). Array vacío = cerrado ese día.

```json
{
  "mon": [{ "open": "09:00", "close": "14:00" }, { "open": "16:00", "close": "20:00" }],
  "tue": [{ "open": "09:00", "close": "19:00" }],
  "wed": [{ "open": "09:00", "close": "19:00" }],
  "thu": [{ "open": "09:00", "close": "19:00" }],
  "fri": [{ "open": "09:00", "close": "19:00" }],
  "sat": [{ "open": "09:00", "close": "14:00" }],
  "sun": []
}
```

- `open` y `close`: `HH:MM` 24 h, hora local de `branches.timezone`.
- En este alcance `close` > `open` (sin turno que cruce medianoche). Si no, `400`.
- Máximo 2 rangos por día. Rangos del mismo día no se solapan.
- Falta una llave, llave extra, o más de 2 rangos → `400`.

### 3.4 Ownership

| Dato | Dueño |
|---|---|
| Bio, avatar, teléfono, links de usuario, portafolio | User (el barbero) |
| Dirección, pin, horario, teléfono y links de sucursal, logo | Organization, editado por `ORGANIZATION_ADMIN` |
| Listado “mis clientes” | Derivado de `haircut_records` del barbero en esa branch. El client sigue siendo global; la racha sigue siendo de la org |
| Pase de bitácora | Organization + subprofile. Lo emite un member aprobado de una branch de esa org |

---

## 4. Servicios

### 4.1 `ClientService` — `ListForBarber`

Clientes a los que **este barbero** les cortó el pelo en **esta sucursal**. No es el censo de la organización (`Search` sigue igual y no onboarda).

Definición de fila: un `clients` con al menos un `haircut_records` donde `barber_id = actor` y `branch_id = branch`. Dentro del client, solo los `family_subprofiles` que tengan al menos un corte de ese par. Orden: `MAX(completed_at)` descendente, desempate `client_id` descendente.

Cada fila incluye el preview de lealtad de la org de la branch (el mismo shape de subprofile que `Search`: `current_streak`, `next_haircut_reward_unlocked`, `reward_banner`). No crea trackers: si no hay tracker, streak `0` y banner `null`.

`q` opcional, mismas reglas que `Search` (mínimo 2; dígitos → teléfono; si no → `ILIKE` en `full_name` / `alias_name`), aplicado **después** del filtro “me los cortó aquí”. `q` vacío o ausente = listado completo paginado.

Paginación opaca. El cliente no parsea `next_cursor`. Por dentro el cursor es `(last_completed_at, client_id)` del último ítem de la página. `limit` default 20, máximo 50. `limit` &lt; 1 o &gt; 50 → `400`. Cursor ilegible → `400`.

Día sin clientes → `200` y `clients: []`, `next_cursor: null`. No 404.

No devolver `clients.notes`.

### 4.2 `BarberSessionService`

`GetMe` (existente): además de lo que ya devuelve, hidratar bio, teléfono y, en cada membership, dirección, teléfono, timezone (ya está), lat/lng, logo de la org. Solo memberships `APPROVED` + `is_active`, como hoy. Un admin desactivado en la silla no aparece aquí aunque siga siendo admin de la org; la gestión de la org sale por `GET /organizations`.

`UpdateMe`: patch parcial del usuario autenticado.

| Campo | Regla |
|---|---|
| `full_name` | Si viene: trim, 1–150. Vacío → `400`. |
| `phone_number` | Si viene string: E.164. Si viene `null`: limpia. Único; otro user → `409`. |
| `bio` | Si viene string: trim, 0–280. `""` o `null` guardan NULL. |
| `avatar_url` | Si viene string: `https://` absoluto, máximo 2048. `null` limpia. No hace falta comprobar que el host sea R2. |

Campo ausente = no tocar. No acepta `email`, `role`, `password`. El email de Google o LOCAL no se edita en esta tanda.

Implementación: llamar a `UserRepo.UpdateProfile` con el estado ya mezclado (nombre actual si no vino en el patch, etc.).

`GetPublicProfile`: bio + links activos del user + portafolio (publicados y borradores). Sirve para la pantalla de edición. No incluye datos de sucursal.

### 4.3 `OrganizationService`

`ListMine`: organizaciones donde el actor es `ORGANIZATION_ADMIN` activo. Incluye sus branches activas e inactivas. No incluye orgs ajenas donde solo es barbero.

`UpdateOrganization`: patch de `name` (1–150), `legal_name` (`null` limpia, máximo 200), `slug` (mismas reglas que el alta; duplicado → `409`), `logo_url` (`https://` o `null`), `is_active`.

Desactivar la org no borra branches ni members. `StationService.GetPublic` y el público de bitácora deben tratar org inactiva como station inexistente (`404`).

`CreateBranch`: bajo una org que el actor administra y que está activa.

Body requerido: `name` (1–150), `address` (1–500). Opcionales: `phone_number` (E.164 o ausente), `timezone` (IANA; default `America/Mexico_City`; zona inválida → `400`), `latitude`+`longitude`, `opening_hours`.

Efecto: inserta la branch `is_active = true` y crea `barber_branch_members` del actor en esa branch con `APPROVED`, `is_active = true`, `current_status = OFFLINE`, igual que la sucursal inicial de `Create`. No copia al resto del equipo.

`GetBranch`: lectura para cualquier member `APPROVED` (activo o no hace falta que el actor esté activo en esa branch si es admin de la org). Un barbero aprobado y activo también puede leerla: la pantalla de información de la barbería no es solo de admin.

Devuelve nombre, address, phone, timezone, lat/lng, opening_hours, is_active, organization_id, organization_name, organization_logo_url, y los links activos de la branch.

`UpdateBranch`: solo admin de la org. Patch parcial de `name`, `address` (1–500; no se puede mandar `""`), `phone_number` (`null` limpia), `timezone`, `latitude`, `longitude`, `opening_hours` (`null` limpia el JSON), `is_active`.

Desactivar la branch: `is_active = false`. Los memberships no se borran. La station pública pasa a `404` (ya exige branch activa). Reactivar: `is_active = true`, sin re-aprobar a la gente.

No hay `DELETE` de org ni de branch.

### 4.4 `MembershipService`

`ListBranchStaff` (existente): mismo conjunto (pending, approved, rejected, activos e inactivos). JSON de salida snake_case. Campos nuevos en cada ítem: `avatar_url`. El resto de los datos ya está en el query.

`GetBranchMember`: un member de esa branch, visible para un member aprobado activo de la misma branch, o para un admin de la org. `404` si no hay fila `(user_id, branch_id)`.

Respuesta: `membership_id`, `user_id`, `full_name`, `email`, `avatar_url`, `bio`, `request_status`, `current_status`, `status_updated_at`, `is_active`. El email ya se muestra hoy en el roster; se mantiene para quien puede ver el roster.

`SetMemberActive`:

| Action | Quién | Efecto |
|---|---|---|
| `DEACTIVATE` | Admin de la org | `is_active = false`, `current_status = OFFLINE`, `status_updated_at = now()`. `request_status` no cambia. |
| `REACTIVATE` | Admin de la org | Solo si `request_status = APPROVED`. `is_active = true`. Status se queda `OFFLINE` hasta que el barbero lo cambie. Si está `PENDING` o `REJECTED` → `409`. |

No se puede `DEACTIVATE` al último `ORGANIZATION_ADMIN` activo de la org si ese admin es el objetivo y no queda otro admin activo. En ese caso `409` con mensaje explícito. La baja de silla de un admin que no es el último admin sí está permitida: el rol de org vive en `organization_members`, no en la silla.

`LeaveBranch`: el propio barbero pone `is_active = false` y `OFFLINE` en su membership de esa branch. No aplica el candado de “último admin” si todavía existe otro admin activo. Si él es el último admin activo → `409` (tiene que nombrar a otro antes; nombrar admin queda fuera de esta tanda, así que el último admin no puede irse). Idempotente si ya estaba inactivo: `200` con el estado actual.

Un member desactivado que vuelve a `POST .../join-requests` recibe el estado actual (hoy es idempotente) y **sigue inactivo**. Para volver a la silla el admin usa `REACTIVATE`. Documentar este comportamiento en el handler de join: no poner `is_active = true` dentro de `RequestJoin`.

Al desactivar, la station pública de ese `(barber, branch)` deja de existir (`404`), porque ya filtra `is_active`.

### 4.5 `MediaService`

`PresignedURL`: nuevas `category` además de las actuales.

| category | Prefijo de objeto |
|---|---|
| `haircut_photo` | el actual |
| `avatar` | el actual |
| `portfolio_photo` | `portfolio/<uuid>.webp` |
| `organization_logo` | `logos/<uuid>.webp` |

Sigue siendo solo `image/webp`. Otra category → `400`.

`organization_logo` exige que el actor sea admin de al menos una org activa. `portfolio_photo` y `avatar` exigen usuario autenticado activo. El presign no escribe `users.avatar_url` ni `organizations.logo_url`: eso lo hace el `PATCH` correspondiente con `public_url`.

### 4.6 `PublicPageService` (nuevo)

Arma la página que abre el QR de espejo. No guarda un documento aparte: compone station + perfil + links + portafolio + sucursal.

`GetPublic(barberID, branchID)` — sin JWT.

Condición de existencia, todas a la vez, si no `404`:

1. Lo que `StationService` ya exige: membership `APPROVED` + `is_active`, branch activa, user activo.
2. Organización `is_active = true`.

Payload = respuesta actual de `GET /public/stations/...` más los campos de §6.2. Links solo `is_active`. Portafolio solo `is_published`, orden `sort_order ASC, created_at ASC`, máximo 24. Horario y pin salen de la branch aunque el visitante no tenga sesión.

`capabilities.appointments` es siempre `false` en esta entrega. No crear tablas de citas.

Rate limit: el mismo grupo `/api/v1/public/stations/*` (60/min/IP). No abrir un limiter distinto.

Escritura del barbero (JWT, user activo; no exige silla para editar su propio perfil público, porque puede armar el catálogo antes de que lo aprueben):

- CRUD de sus `public_links` (`owner_type = USER`, `owner_id = uid`).
- CRUD de sus `portfolio_items`.

Escritura de links de sucursal: solo admin de la org dueña (`owner_type = BRANCH`).

Validación de link:

| Campo | Regla |
|---|---|
| `platform` | enum §3.2 |
| `label` | trim, 1–40 |
| `url` | `https://` absoluto, máximo 2048. WhatsApp entra como `https://wa.me/...`, no como `tel:`. |
| `sort_order` | entero ≥ 0. Default: max actual + 1. |

Validación de pieza de catálogo:

| Campo | Regla |
|---|---|
| `title` | trim, 1–80 |
| `description` | ausente o `null` o string 0–280. `""` guarda NULL. |
| `photo_url` | `https://`, máximo 2048. Obligatorio. |
| `tags` | array de 0 a 5 strings, cada uno trim 1–24. Duplicados se descartan conservando orden. |
| `sort_order` | entero ≥ 0 |
| `is_published` | bool, default `true` |

El catálogo es del barbero, no de la sucursal: la misma lista se ve en todas sus stations. Las fotos de `haircut_records` no se copian solas al portafolio. El barbero sube piezas de muestra a propósito.

`DELETE` de link o de pieza es físico (no hay historial que los referencie).

### 4.7 `LogbookPassService` (nuevo)

Pase opaco para que el cliente abra su bitácora en esa organización sin JWT y sin llevar el teléfono en el QR.

`Issue`:

- Actor: member aprobado activo de `branch_id`.
- La branch pertenece a la org que quedará en el pase.
- El subprofile pertenece al `client_id` de la URL.
- Debe existir al menos un `haircut_records` de ese subprofile en alguna branch de esa org, o un `client_loyalty_trackers` de esa org. Si no, `404` (no se emite un pase a un desconocido).
- Token: 32 bytes random, se guarda solo `SHA-256` hex en `token_hash` (igual que refresh tokens). El claro se devuelve una sola vez.
- TTL: 90 días desde la emisión (`expires_at`).
- Emitir otro pase no revoca el anterior. Para cortar el acceso está `Revoke`.

`Revoke`: el mismo tipo de actor, sobre un pase de esa org y ese subprofile. Ya revocado o de otra org → `404`. Setea `revoked_at`.

`GetPublic`: sin JWT.

- Token ausente, hash desconocido, revocado o vencido → `404` (no distinguir el motivo).
- Org inactiva → `404`.
- Rate limit nuevo: **30 req/min/IP** en `/api/v1/public/logbook`.
- No devuelve `phone_number`, ni `technical_notes`, ni `clients.notes`, ni ids internos de reglas de lealtad.
- Historial: últimos 20 `haircut_records` del subprofile en branches de esa org, `completed_at DESC`. Cada ítem: `completed_at`, `barber_name`, `photo_urls`.
- Sí devuelve alias, nombre de la org, racha actual, target y `reward_banner` (preview, sin mutar streak).

El QR corto de silla (`POST /clients/lookup-by-qr`) no cambia.

### 4.8 `StationService`

Sin método nuevo. `GetPublic` debe sumar el filtro de organización activa, compartido con `PublicPageService` para no divergir. La forma práctica: `PublicPageService.GetPublic` llama a la carga de station y le añade el resto; el handler público actual pasa a devolver ese payload extendido. Un solo endpoint, no dos URLs.

---

## 5. Matriz de autorización

| Endpoint | Público | Barber aprobado en la branch | Admin de la org |
|---|---|---|---|
| `GET /barbers/me` | | sí (su usuario) | sí |
| `PATCH /barbers/me` | | sí, sin exigir silla | sí |
| `GET /barbers/me/branches/:id/clients` | | sí | sí, si también es member aprobado |
| `GET /branches/:id` | | sí | sí, aunque no tenga silla activa |
| `GET /branches/:id/staff` | | sí | sí |
| `GET /branches/:id/staff/:user_id` | | sí | sí |
| `PUT /branches/:id/members/:membership_id` | | | sí |
| `DELETE /barbers/me/branches/:id/membership` | | sí, la propia | sí, la propia |
| `GET /organizations` | | | sí |
| `PATCH /organizations/:id` | | | sí |
| `POST /organizations/:id/branches` | | | sí |
| `PATCH /branches/:id` | | | sí |
| CRUD links y portafolio propios | | sí, sin exigir silla | sí |
| CRUD links de branch | | | sí |
| `POST` presign `organization_logo` | | | sí |
| `POST .../logbook-pass` y `DELETE` | | sí | sí si es member aprobado, o admin de la org |
| `GET /public/stations/...` | sí | | |
| `GET /public/logbook` | sí | | |

Admin sin membership aprobado en la branch: puede gestionar org, branches, links de branch y activar/desactivar members. No lista “mis clientes” de esa silla ni emite un pase salvo que también cumpla `RequireApprovedMember` o, en el pase, la alternativa “admin de la org” de la tabla.

---

## 6. Endpoints

Campos nuevos en respuestas ya existentes son aditivos. Los clientes viejos ignoran lo que no conocen.

### 6.1 Perfil

#### `PATCH /api/v1/barbers/me`

Body, todos opcionales, al menos uno requerido. Si el body es `{}` → `400`.

```json
{
  "full_name": "Carlos Méndez",
  "phone_number": "+525512345678",
  "bio": "Fades y barba. 8 años en silla.",
  "avatar_url": "https://media.example/avatars/uuid.webp"
}
```

`phone_number: null`, `bio: null` y `avatar_url: null` limpian.

**200** — el objeto `user` de `GET /barbers/me`, ya actualizado:

```json
{
  "id": "07d55237-ec38-447d-b6bc-befbef7780de",
  "full_name": "Carlos Méndez",
  "email": "carlos@demo.barber",
  "phone_number": "+525512345678",
  "bio": "Fades y barba. 8 años en silla.",
  "role": "BARBER",
  "avatar_url": "https://media.example/avatars/uuid.webp"
}
```

Errores: `400`, `401`, `409` (teléfono ocupado).

#### `GET /api/v1/barbers/me` (extender)

`user` gana `phone_number` y `bio` (nullable). Cada membership gana:

```json
{
  "branch_address": "Av. Insurgentes Sur 450, CDMX",
  "branch_phone_number": "+525500000000",
  "branch_latitude": 19.372800,
  "branch_longitude": -99.171400,
  "organization_logo_url": null
}
```

`timezone` ya viaja en el membership. Si no hay pin, lat/lng son `null`, no `0`.

#### `GET /api/v1/barbers/me/public-profile`

**200**

```json
{
  "bio": "Fades y barba. 8 años en silla.",
  "links": [
    {
      "id": "…",
      "platform": "instagram",
      "label": "Instagram",
      "url": "https://instagram.com/carlos",
      "sort_order": 0,
      "is_active": true
    }
  ],
  "portfolio": [
    {
      "id": "…",
      "title": "Mid fade",
      "description": null,
      "photo_url": "https://media.example/portfolio/uuid.webp",
      "tags": ["fade"],
      "sort_order": 0,
      "is_published": true
    }
  ]
}
```

Incluye piezas con `is_published: false` y links inactivos, porque es la pantalla de edición. Orden: `sort_order ASC`, luego `created_at ASC`.

### 6.2 Página pública (QR de espejo)

Deep link sin cambio:

```
https://cliente.mi-barberia.com/b/{barber_id}?branch_id={branch_id}
```

#### `GET /api/v1/public/stations/:barber_id/branches/:branch_id`

Sin JWT. Rate limit 60/min/IP.

**200** — todos los campos actuales, más:

```json
{
  "barber_id": "07d55237-ec38-447d-b6bc-befbef7780de",
  "barber_name": "Carlos Méndez",
  "barber_avatar_url": null,
  "barber_bio": "Fades y barba. 8 años en silla.",
  "branch_id": "db30c69e-c20b-4f34-a871-2e284a885ac5",
  "branch_name": "Downtown Branch",
  "branch_address": "Av. Insurgentes Sur 450, CDMX",
  "branch_phone_number": "+525500000000",
  "branch_latitude": 19.372800,
  "branch_longitude": -99.171400,
  "branch_timezone": "America/Mexico_City",
  "opening_hours": {
    "mon": [{ "open": "09:00", "close": "19:00" }],
    "tue": [{ "open": "09:00", "close": "19:00" }],
    "wed": [{ "open": "09:00", "close": "19:00" }],
    "thu": [{ "open": "09:00", "close": "19:00" }],
    "fri": [{ "open": "09:00", "close": "19:00" }],
    "sat": [{ "open": "09:00", "close": "14:00" }],
    "sun": []
  },
  "organization_name": "Classic Barber Studio",
  "organization_logo_url": null,
  "current_status": "AVAILABLE",
  "status_updated_at": "2026-10-07T03:45:03Z",
  "barber_links": [
    {
      "id": "…",
      "platform": "instagram",
      "label": "Instagram",
      "url": "https://instagram.com/carlos",
      "sort_order": 0
    }
  ],
  "branch_links": [],
  "portfolio": [
    {
      "id": "…",
      "title": "Mid fade",
      "description": null,
      "photo_url": "https://media.example/portfolio/uuid.webp",
      "tags": ["fade"],
      "sort_order": 0
    }
  ],
  "capabilities": {
    "appointments": false
  }
}
```

Errores: `400` (UUID), `404` (station, user, branch u org inactivos, o membership no aprobado), `429`.

No incluir email, teléfono del barbero (`users.phone_number`), ni piezas no publicadas. El teléfono de la sucursal sí, porque es dato de la barbería.

### 6.3 Links y catálogo

#### `POST /api/v1/barbers/me/links`

```json
{ "platform": "instagram", "label": "Instagram", "url": "https://instagram.com/carlos", "sort_order": 0 }
```

**201** — el link, con `id` e `is_active: true`.

#### `PATCH /api/v1/barbers/me/links/:link_id`

Patch parcial de `platform`, `label`, `url`, `sort_order`, `is_active`. Link de otro user → `404`.

**200** — el link.

#### `DELETE /api/v1/barbers/me/links/:link_id`

**204** vacío. Ajeno → `404`.

#### `POST /api/v1/barbers/me/portfolio`

```json
{
  "title": "Mid fade",
  "description": "Tijera arriba, máquina a los lados.",
  "photo_url": "https://media.example/portfolio/uuid.webp",
  "tags": ["fade", "tijera"],
  "sort_order": 0,
  "is_published": true
}
```

**201** — la pieza.

#### `PATCH /api/v1/barbers/me/portfolio/:item_id`

Patch parcial de los mismos campos. Ajena → `404`.

#### `DELETE /api/v1/barbers/me/portfolio/:item_id`

**204**.

#### `POST /api/v1/branches/:branch_id/links`

Igual que el POST del barbero. Solo admin. **201**.

#### `PATCH /api/v1/branches/:branch_id/links/:link_id`

#### `DELETE /api/v1/branches/:branch_id/links/:link_id`

Link que no es de esa branch → `404`.

Tope 12 activos: `409` en el POST (y en el PATCH que reactive por encima del tope). Tope 24 piezas: `409` en el POST de portafolio.

### 6.4 Equipo

#### `GET /api/v1/branches/:branch_id/staff`

Misma autorización que hoy. Cuerpo en snake_case:

```json
{
  "staff": [
    {
      "membership_id": "4b2e8c61-1234-4567-89ab-cdef01234567",
      "user_id": "07d55237-ec38-447d-b6bc-befbef7780de",
      "full_name": "Demo Barber",
      "email": "barber@demo.barber",
      "avatar_url": null,
      "request_status": "PENDING",
      "current_status": "OFFLINE",
      "is_active": true
    }
  ]
}
```

Dejar de emitir `MembershipID`, `FullName`, etc. La app ya normaliza ambos durante la transición; el contrato nuevo es solo snake_case.

#### `GET /api/v1/branches/:branch_id/staff/:user_id`

**200**

```json
{
  "membership_id": "…",
  "user_id": "…",
  "full_name": "Carlos Méndez",
  "email": "carlos@demo.barber",
  "avatar_url": null,
  "bio": "Fades y barba.",
  "request_status": "APPROVED",
  "current_status": "AVAILABLE",
  "status_updated_at": "2026-10-07T03:45:03Z",
  "is_active": true
}
```

Errores: `400`, `401`, `403`, `404`.

#### `PUT /api/v1/branches/:branch_id/members/:membership_id`

Solo admin. Body:

```json
{ "action": "DEACTIVATE" }
```

`action`: `DEACTIVATE` | `REACTIVATE`.

**200**

```json
{
  "membership_id": "…",
  "user_id": "…",
  "is_active": false,
  "current_status": "OFFLINE",
  "request_status": "APPROVED",
  "updated_at": "2026-10-09T18:00:00Z"
}
```

Errores: `400` (action), `403`, `404`, `409` (reactivar quien no está `APPROVED`, o desactivar al último admin).

`:membership_id` es `barber_branch_members.id`, no el `user_id`. Tiene que pertenecer a `:branch_id`.

#### `DELETE /api/v1/barbers/me/branches/:branch_id/membership`

El actor suelta su silla. **200** con el mismo shape del PUT. `409` si es el último admin activo. `404` si no tiene membership en esa branch.

### 6.5 Barbería

#### `GET /api/v1/organizations`

Solo admin. Orgs donde lo es, con todas sus branches.

**200**

```json
{
  "organizations": [
    {
      "id": "…",
      "name": "Classic Barber Studio",
      "legal_name": null,
      "slug": "classic-barber-studio",
      "logo_url": null,
      "is_active": true,
      "branches": [
        {
          "id": "…",
          "name": "Downtown Branch",
          "address": "Av. Insurgentes Sur 450, CDMX",
          "phone_number": null,
          "timezone": "America/Mexico_City",
          "latitude": null,
          "longitude": null,
          "opening_hours": null,
          "is_active": true
        }
      ]
    }
  ]
}
```

Sin orgs → `200` y `organizations: []`.

#### `PATCH /api/v1/organizations/:organization_id`

```json
{
  "name": "Classic Barber Studio",
  "legal_name": null,
  "slug": "classic-barber-studio",
  "logo_url": "https://media.example/logos/uuid.webp",
  "is_active": true
}
```

**200** — el objeto organización sin el array `branches` (la app vuelve a pedir `GET /organizations` o usa el `GET` de la branch).

Errores: `400`, `403`, `404`, `409` (slug).

#### `POST /api/v1/organizations/:organization_id/branches`

```json
{
  "name": "Roma Norte",
  "address": "Av. Álvaro Obregón 120, CDMX",
  "phone_number": "+525511112222",
  "timezone": "America/Mexico_City",
  "latitude": 19.419400,
  "longitude": -99.162200,
  "opening_hours": null
}
```

**201** — el objeto branch del listado de arriba. El actor queda `APPROVED` en esa branch.

Org inactiva → `409`.

#### `GET /api/v1/branches/:branch_id`

Member aprobado activo, o admin de la org.

**200**

```json
{
  "id": "…",
  "organization_id": "…",
  "organization_name": "Classic Barber Studio",
  "organization_logo_url": null,
  "name": "Downtown Branch",
  "address": "Av. Insurgentes Sur 450, CDMX",
  "phone_number": null,
  "timezone": "America/Mexico_City",
  "latitude": 19.372800,
  "longitude": -99.171400,
  "opening_hours": null,
  "is_active": true,
  "links": []
}
```

`links` aquí incluye inactivos (pantalla de edición). El público no.

#### `PATCH /api/v1/branches/:branch_id`

Patch parcial. Ejemplo de pin:

```json
{
  "address": "Av. Insurgentes Sur 450, CDMX",
  "latitude": 19.372800,
  "longitude": -99.171400
}
```

Quitar el pin:

```json
{ "latitude": null, "longitude": null }
```

**200** — el mismo objeto que el `GET`, con `links`.

`address` vacío, timezone inválida, pin a medias, horario mal formado → `400`.

### 6.6 Clientes del barbero

#### `GET /api/v1/barbers/me/branches/:branch_id/clients?limit=20&cursor=&q=`

`q` y `cursor` opcionales.

**200**

```json
{
  "clients": [
    {
      "id": "d74f405f-534f-4bb6-a373-c97c46ef33bf",
      "phone_number": "+525512345678",
      "full_name": "Luis Hernández",
      "last_haircut_at": "2026-10-08T18:45:00Z",
      "haircut_count": 4,
      "subprofiles": [
        {
          "id": "c8af5acf-b30b-4ba9-a20c-f482afb55e6b",
          "alias_name": "Self",
          "avatar_url": null,
          "relationship": "Self",
          "current_streak": 4,
          "next_haircut_reward_unlocked": true,
          "reward_banner": "¡Aviso: Este es su 5to corte, hoy toca 50% off!",
          "last_haircut_at": "2026-10-08T18:45:00Z",
          "haircut_count": 4
        }
      ]
    }
  ],
  "next_cursor": null
}
```

`haircut_count` y `last_haircut_at` del client son el agregado de los subprofiles incluidos (los que este barbero cortó en esta branch). Los del subprofile son solo de ese subprofile, mismo barbero y misma branch.

La ficha de un cliente y su bitácora técnica siguen en `GET /subprofiles/:id/history?branch_id=`. No hace falta un `GET /clients/:id` nuevo.

Errores: `400`, `401`, `403`.

### 6.7 Pase de bitácora

#### `POST /api/v1/clients/:client_id/subprofiles/:subprofile_id/logbook-pass`

```json
{ "branch_id": "db30c69e-c20b-4f34-a871-2e284a885ac5" }
```

**201** — el token en claro solo aquí:

```json
{
  "pass_id": "…",
  "token": "hex-o-base64url-de-32-bytes",
  "expires_at": "2027-01-07T18:00:00Z",
  "qr_payload": "{\"ver\":1,\"typ\":\"logbook\",\"token\":\"…\"}",
  "public_path": "/logbook?token=…"
}
```

`qr_payload` es el string JSON que la app pinta en el QR. `public_path` es relativo al host de la web cliente (`https://cliente.mi-barberia.com`). La app no hardcodea otro formato.

Errores: `400` (branch), `403`, `404` (subprofile que no es de ese client, o sin cortes ni tracker en la org).

#### `DELETE /api/v1/clients/:client_id/subprofiles/:subprofile_id/logbook-pass/:pass_id`

**204**. Revoca uno. No exige el `branch_id`; el pase ya tiene `organization_id`. El actor tiene que ser admin de esa org o member aprobado de alguna branch de esa org.

#### `GET /api/v1/public/logbook?token=`

Sin JWT. 30 req/min/IP.

**200**

```json
{
  "organization_name": "Classic Barber Studio",
  "alias_name": "Self",
  "current_streak": 4,
  "target_haircut_count": 5,
  "reward_banner": "¡Aviso: Este es su 5to corte, hoy toca 50% off!",
  "history": [
    {
      "completed_at": "2026-10-08T18:45:00Z",
      "barber_name": "Carlos Méndez",
      "photo_urls": ["https://media.example/cuts/uuid.webp"]
    }
  ]
}
```

Sin teléfono, sin notas técnicas, sin `subprofile_id`. Token malo, vencido o revocado → `404`. `429` si se pasa del límite.

---

## 7. QR: tres piezas distintas

| QR | Quién lo genera | Payload | Quién lo consume | Vida |
|---|---|---|---|---|
| Espejo / linktree | App del barbero, local, sin endpoint nuevo | URL `https://cliente.mi-barberia.com/b/{barber_id}?branch_id={branch_id}` | Web cliente → `GET /public/stations/...` | Mientras la station exista |
| Escaneo en silla | Teléfono del cliente (contrato actual) | `{"ver":1,"typ":"client_id","phone":"+52…","ts":1728240000}` | App barbero → `POST /clients/lookup-by-qr` | `QR_TTL` (default 5 min) |
| Bitácora | App del barbero, después de `POST .../logbook-pass` | `qr_payload` de esa respuesta (`typ: logbook`) | Web cliente → `GET /public/logbook?token=` | 90 días, o hasta revoke |

No firmar el QR de espejo. La station ya es pública por diseño. No meter el teléfono del cliente en el QR de bitácora.

---

## 8. Media

`POST /api/v1/media/presigned-url`

```json
{ "file_type": "image/webp", "category": "portfolio_photo" }
```

`category`: `haircut_photo` | `avatar` | `portfolio_photo` | `organization_logo`.

Respuesta igual a la de hoy: `upload_url`, `public_url`, `expires_in_seconds`.

Flujo que la app va a ejecutar, y que el backend no debe acortar:

1. `POST /media/presigned-url`
2. `PUT` del webp a `upload_url` con `Content-Type: image/webp`
3. Guardar `public_url` con `PATCH /barbers/me` (`avatar_url`), `PATCH /organizations/:id` (`logo_url`) o `POST /barbers/me/portfolio` (`photo_url`)

Con `R2_MOCK=true` el paso 2 sigue sin ser un upload real. No cambiar ese comportamiento.

---

## 9. Mapa

No hay servicio de geocoding, Places ni tiles en el backend.

La app, con Expo SDK 57:

- Muestra el pin con `expo-maps` (Apple Maps en iOS, Google Maps en Android) usando `latitude` / `longitude`.
- Comparte la ubicación abriendo el mapa del sistema (`expo-linking`), con la dirección como etiqueta:
  - iOS: `http://maps.apple.com/?ll={lat},{lng}&q={nombre}`
  - Android: `geo:{lat},{lng}?q={lat},{lng}({nombre})`
  - URL única para compartir por mensaje: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`

Si lat/lng vienen `null`, la app no inventa un pin a partir de `address`. El admin coloca el pin en el `PATCH` de la branch (el dispositivo puede geocodificar antes y mandar los números). El backend valida rango y par completo, nada más.

`POST /organizations` puede seguir recibiendo solo `address`. El pin de la sucursal inicial se carga después con `PATCH /branches/:id`. No hace falta ampliar el body del alta para esta entrega; si el backend quiere aceptar `latitude` y `longitude` opcionales también en el alta, que usen las mismas reglas del par.

---

## 10. Citas

No implementar `BookingService`, tablas, ni endpoints.

Único compromiso de esta entrega: `capabilities.appointments` booleano en la station pública, valor `false`. Cuando exista citas, ese flag pasa a `true` y se agregan campos. No reservar otros nombres en el JSON.

---

## 11. Errores que la app va a tratar distinto

| Caso | HTTP | `error` (texto estable, puede ir en español o inglés, pero no cambiar el código) |
|---|---|---|
| Body vacío en un PATCH que exige al menos un campo | 400 | mensaje de validación |
| Pin incompleto | 400 | decir que lat y lng van juntos |
| Horario inválido | 400 | decir el día o el rango |
| Teléfono duplicado | 409 | |
| Slug duplicado | 409 | |
| Link o pieza por encima del tope | 409 | decir el tope (12 o 24) |
| Reactivar quien no está aprobado | 409 | |
| Bajar o irse siendo el último admin | 409 | decir que es el último admin |
| Station / pase inexistente o inactivo | 404 | no filtrar si el motivo fue baja, revoke o id malo |
| Listado de clientes vacío | 200 | `clients: []` |

---

## 12. Orden de entrega sugerido

La app puede integrar en este orden, cada bloque usable solo:

1. **S5 + media avatar** — `PATCH /barbers/me` y `bio` / `phone` en el GET. Desbloquea la pantalla de perfil.
2. **S4 lectura** — address, lat/lng y horario en `/barbers/me` y `GET /branches/:id`. Desbloquea ver la barbería y compartir el mapa en cuanto haya pin.
3. **S4 escritura + logo** — CRUD de orgs/branches para admin.
4. **S3** — snake_case del staff, ficha de compañero, deactivate/reactivate, leave.
5. **S1** — listado de clientes.
6. **S6** — links, portafolio, payload público. El QR de espejo ya existe; solo cambia lo que la web muestra.
7. **S7** — pase de bitácora. Independiente del linktree.

Al cerrar cada bloque, actualizar `barber-backend/docs/02`, `03` y `04`. Este archivo se marca implementado por sección cuando eso ocurra; hasta entonces no es contrato vigente.
