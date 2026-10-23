# 06. Onboarding — crear barbería, join-request y staff

Pantallas que desbloquean el Command Deck cuando `GET /barbers/me` devuelve `memberships: []`.

Contratos HTTP: `barber-backend/docs/03-api-endpoints.md` (Organizations & Staff).  
No inventar listados públicos de sucursales: la API actual exige `branch_id` (UUID).

---

## 1. Por qué existen

Solo memberships `APPROVED` + `is_active` habilitan scan, search, métricas, status y QR espejo.  
Sin UI de onboarding, la app quedó en un callejón: login → banner “Sin silla” → nada más.

Estas pantallas cierran el circuito **dentro de la app barbero** (sin admin web).

---

## 2. Pantallas

| Ruta Expo Router | Rol UX | Endpoint |
|---|---|---|
| `/(app)/create-shop` | Alta de tenant | `POST /organizations` |
| `/(app)/join` | Pedir silla | `POST /branches/:branch_id/join-requests` |
| `/(app)/staff` | Roster + aprobar/rechazar | `GET .../staff` + `PUT .../join-requests/:id` |

Entrada desde Command Deck (`/(app)`):

- Sin silla → CTAs a **Unirme** / **Crear barbería** / refrescar.
- Con silla → **Staff / aprobar sillas**.

---

## 3. Flujos

### A) Admin crea barbería (cuenta nueva o sin membership)

```
Login (role libre; cualquier JWT puede crear org)
  → Crear barbería
  → POST /organizations
  → response: organization_id + branch_id
  → actor queda APPROVED en la branch inicial
  → refrescar /barbers/me → Command Deck usable
  → compartir branch_id con barberos
```

Campos UI → body API:

| UI | JSON |
|---|---|
| Nombre | `name` |
| Slug | `slug` (lowercase + guiones) |
| Sucursal inicial | `initial_branch_name` |
| Dirección | `address` |
| (fijo) | `timezone: America/Mexico_City` |

### B) Barbero pide unirse

```
Login
  → Unirme con branch_id (UUID del admin)
  → POST /branches/:branch_id/join-requests
  → status PENDING (o APPROVED/REJECTED si ya existía)
  → Admin abre Staff → Aprobar
  → Barbero: “Ya me aprobaron — refrescar”
  → /barbers/me trae membership → deck desbloqueado
```

Notas:

- Idempotente: si ya había membership, la API regresa el estado actual.
- `/barbers/me` **no** lista PENDING; por eso el join muestra el status de la respuesta y el CTA de refrescar.

### C) Admin aprueba silla

```
Admin con membership APPROVED
  → Staff
  → GET /branches/:branch_id/staff
  → fila PENDING → Aprobar | Rechazar
  → PUT .../join-requests/:request_id { "action": "APPROVE"|"REJECT" }
```

Solo **organization admin** de la org dueña puede decidir (`403` si no).  
Miembros APPROVED sí pueden **listar** staff.

El listado staff del backend serializa campos Go en **PascalCase**; el client los normaliza a snake_case en `src/api/endpoints/orgs.ts`.

---

## 4. Seed local vs onboarding

| Situación | Qué hacer |
|---|---|
| `make seed` OK | `barber@demo.barber` y `admin@demo.barber` ya vienen APPROVED — no hace falta join |
| Seed roto / DB vacía de memberships | Admin: **Crear barbería** o reset seed; barbero: **Unirme** con `branch_id` |
| Recuperar `branch_id` seed | SQL en `barber-backend/docs/06-local-testing.md` o Staff → Compartir branch_id |

Credenciales seed: ver [`05_dev_notes_api_connectivity.md`](05_dev_notes_api_connectivity.md).

---

## 5. Fuera de alcance (sigue sin API)

- Buscar sucursal por slug/nombre (no hay endpoint).
- Deep link mágico de invite (se podría añadir después con `branch_id` en query).
- Panel admin web separado.
