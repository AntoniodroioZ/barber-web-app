# 00. Contexto del proyecto — App barbero

Documento de trazabilidad para humanos y para el agente.  
**No duplica contratos de API**: apunta a las fuentes canónicas y registra decisiones de trabajo revisables.

---

## 1. Qué es este repo

| Aspecto | Valor |
|---|---|
| Repo | `Barber-app-rn` |
| Alcance actual | **Solo la app móvil del barbero** (React Native + Expo previsto) |
| Fuera de alcance (este ciclo) | Backend, web cliente, admin web |
| Estado del código | Scaffold Expo SDK 57 + flujos MVP en `src/` (auth, onboarding/join/staff, deck, scan, service, mirror) |
| Backend sibling | `/Users/antoniodroioz/Documents/BarberProjectApp/barber-backend` |

La web cliente se implementará en otro momento/repo. En este proyecto se ignora su desarrollo, salvo el **QR de espejo / deep link** que la app barbero genera (necesita `barber_id` + `branch_id`).

---

## 2. Jerarquía de verdad

Si dos documentos se contradicen, aplicar este orden:

1. **Contrato HTTP, services, auth, errores, integración frontend (estado implementado)**  
   → docs vivos del backend:  
   - Absoluto: `/Users/antoniodroioz/Documents/BarberProjectApp/barber-backend/docs/`  
   - Relativo desde este repo: `../barber-backend/docs/`

2. **UX/UI y pantallas de la app barbero**  
   → [`.cursor/docs/03_frontend_bento_ux_ui_specs.md`](03_frontend_bento_ux_ui_specs.md)  
   **Usar solo §3 (Barber Mobile App)** y tokens/design system (§1–§2).  
   Ignorar §4 (Client Web App) por ahora.

3. **Specs de producto / gaps históricos en este repo**  
   → [`01`](01_technologies_architecture_deployment.md), [`02`](02_backend_mvp_data_model_endpoints.md), [`04`](04_frontend_mvp_backend_gaps.md)  
   Son contexto de producto. Si chocan con `barber-backend/docs`, **gana el backend docs**.

4. **Este archivo (`00_project_context.md`)**  
   → mapa de fuentes + decisiones de trabajo. No es contrato de API.

---

## 3. Mapa: necesito X → leo Y

### Backend (fuente canónica de implementación)

| Necesito | Documento | Ruta absoluta |
|---|---|---|
| Índice / base URL / Postman | README | `/Users/antoniodroioz/Documents/BarberProjectApp/barber-backend/docs/README.md` |
| Arquitectura, stack, multi-tenancy | 01 — Arquitectura | `.../barber-backend/docs/01-architecture.md` |
| Responsabilidades de dominio | 02 — Servicios | `.../barber-backend/docs/02-services.md` |
| Contrato HTTP completo | 03 — API Endpoints | `.../barber-backend/docs/03-api-endpoints.md` |
| Tablas, enums, ownership | 04 — Modelo de datos | `.../barber-backend/docs/04-data-model.md` |
| JWT, rate limits, códigos de error | 05 — Auth y errores | `.../barber-backend/docs/05-auth-and-errors.md` |
| Arranque local, seed, curls | 06 — Pruebas locales | `.../barber-backend/docs/06-local-testing.md` |
| Pantalla → endpoint, flujo post-login, QR espejo | 07 — Integración frontend | `.../barber-backend/docs/07-frontend-integration.md` |

Rutas relativas equivalentes: `../barber-backend/docs/<archivo>`.

### Producto / UX en este repo

| Necesito | Documento |
|---|---|
| Stack, deploy, filosofía de costos | [`01_technologies_architecture_deployment.md`](01_technologies_architecture_deployment.md) |
| Modelo/endpoints MVP (spec producto) | [`02_backend_mvp_data_model_endpoints.md`](02_backend_mvp_data_model_endpoints.md) |
| Bento, tokens, pantallas app (A–E) | [`03_frontend_bento_ux_ui_specs.md`](03_frontend_bento_ux_ui_specs.md) §1–§3 |
| Gaps frontend→backend (histórico; marcado IMPLEMENTED) | [`04_frontend_mvp_backend_gaps.md`](04_frontend_mvp_backend_gaps.md) |
| Conectividad API / Google / devices | [`05_dev_notes_api_connectivity.md`](05_dev_notes_api_connectivity.md) |
| Crear org / join-request / aprobar silla | [`06_onboarding_join_and_staff.md`](06_onboarding_join_and_staff.md) |
| Servicios pedidos y aún no implementados (perfil, equipo, barbería, clientes, linktree, pase de bitácora) | [`07_backend_requested_services.md`](07_backend_requested_services.md) — no es `barber-backend/docs/07-frontend-integration.md` |

### Entorno local (backend)

```
Base URL:  http://localhost:8080
API:       /api/v1
Health:    GET /healthz
```

Postman (en el repo backend):

- `../barber-backend/postman/Barber_Backend_MVP.postman_collection.json`
- `../barber-backend/postman/Barber_Backend_Local.postman_environment.json`

---

## 4. Integración app (resumen operativo)

Fuente detallada: `barber-backend/docs/07-frontend-integration.md` §1 (bloque app) y §2.

Flujo post-login esperado:

```
Login (Google o LOCAL) o registro LOCAL (`POST /auth/register`)
  → GET /barbers/me
  → si memberships vacío:
        · Crear barbería (POST /organizations)  ó
        · Unirme (POST /branches/:id/join-requests) + admin aprueba en Staff
  → elegir membership (branch_id, organization_id, current_status)
  → GET .../metrics/today
  → PUT .../status  (pills)
  → POST /clients                 (alta manual: teléfono + nombre)
     ó POST /clients/lookup-by-qr
     ó GET /clients/search
  → GET /subprofiles/:id/history
  → POST /media/presigned-url (+ upload)
  → POST /haircuts/confirm-service
  → refrescar metrics/today
```

Pantallas UX (doc 03 §3 + onboarding) ↔ backend:

| UI | Endpoint |
|---|---|
| Top bar avatar + sucursal | `GET /barbers/me` |
| Sin silla → Crear barbería | `POST /organizations` |
| Sin silla → Unirme | `POST /branches/:branch_id/join-requests` (el QR de invitación es local: `branch_id` de `/barbers/me`) |
| Staff / aprobar sillas | `GET /branches/:branch_id/staff` + `PUT .../join-requests/:id` |
| Status pills | `GET /barbers/me` + `PUT /barbers/me/branches/:branch_id/status` |
| Métricas del día | `GET /barbers/me/branches/:branch_id/metrics/today` |
| Alta manual (sin dispositivo) | `POST /clients` |
| Escanear QR | `POST /clients/lookup-by-qr` |
| Buscar teléfono/nombre | `GET /clients/search?branch_id=&q=` |
| Confirmar identidad / familiares | respuesta de alta, lookup o search (`subprofiles`) |
| Otro perfil bajo el mismo teléfono | `POST /clients/:client_id/subprofiles` |
| Historial técnico | `GET /subprofiles/:id/history?branch_id=` |
| Subir fotos | `POST /media/presigned-url` |
| Confirmar servicio | `POST /haircuts/confirm-service` |
| QR espejo (Screen E) | URL local; ver doc 07 §3 |

Detalle onboarding: [`06_onboarding_join_and_staff.md`](06_onboarding_join_and_staff.md).

Deep link canónico del espejo (ambos IDs obligatorios):

```
https://cliente.mi-barberia.com/b/{barber_id}?branch_id={branch_id}
```

Reglas útiles (doc 07):

1. Solo memberships `APPROVED` en `/barbers/me`; array vacío = sin silla aprobada.
2. Search no onboarda. Cliente nuevo: alta manual (`POST /clients`) o QR. Si la búsqueda viene vacía, la app ofrece el alta manual.
3. Loyalty banner viene en cada subprofile desde lookup/search.
4. Métricas usan timezone de la branch; día vacío → ceros, no error.

---

## 5. Decisiones de trabajo actuales (revisables)

| Decisión | Estado |
|---|---|
| Scope del repo | Solo app barbero JWT (+ onboarding org/join/staff en-app) |
| Web cliente | Omitida en este ciclo (no pantallas públicas SSE/loyalty) |
| QR espejo | Sí: deep link con `barber_id` + `branch_id` (Screen E) |
| Contratos API | Seguir `barber-backend/docs`; no inventar endpoints |
| UX visual | Doc 03 §1–§3 (bento, dark default, zona ergonómica inferior) |
| Stack | **Expo SDK 57** + TypeScript + Expo Router (`src/app`) + NativeWind 4.2.7 |
| Runtime | **Development build** (`expo-dev-client`), no solo Expo Go |
| Estado | Zustand (sesión/branch) + TanStack Query (server) + Secure Store (tokens) |
| Auth | Google nativo (`@react-native-google-signin/google-signin`) + LOCAL email/password |
| API base URL | Auto LAN desde host Metro → `:8080`; override `EXPO_PUBLIC_API_URL` |
| Conectividad | Ver [`05_dev_notes_api_connectivity.md`](05_dev_notes_api_connectivity.md) |
| Bundle IDs | iOS/Android: `com.barber.barberapp` |
| Principio de trabajo | Preguntar antes de cambios grandes de arquitectura o scope |

Nada de esta sección está “escrito en piedra”; actualizar aquí cuando una decisión cambie.

---

## 6. Cómo mantener este contexto

| Cambio | Qué actualizar |
|---|---|
| Nueva decisión de scope/stack/flujo de trabajo | Este archivo §5 |
| Nuevo path de docs o fuente importante | Este archivo §3 |
| Contrato de API / auth / errores | **No copiar aquí** — editar `barber-backend/docs` y solo ajustar punteros si cambió la ruta |
| Tokens UX / pantallas app | Doc 03 (y §4 de este archivo si cambia el mapa pantalla→endpoint) |
| Regla corta para el agente | [`.cursor/rules/project-context.mdc`](../rules/project-context.mdc) — mantenerla breve; el detalle vive aquí |

La rule (`project-context.mdc`) debe seguir siendo un **puntero**, no un segundo spec largo.
