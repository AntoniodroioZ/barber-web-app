# 05. Notas de desarrollo — Conectividad API + auth

Cómo apuntar la app al backend local y cómo alternar modos sin tocar código de negocio.

## Resumen rápido

| Modo | Variable | Cuándo |
|---|---|---|
| **Auto (recomendado)** | `EXPO_PUBLIC_API_URL` vacía / sin definir | Device físico + Mac en misma Wi‑Fi; también suele servir en sim |
| **localhost** | `EXPO_PUBLIC_API_URL=http://localhost:8080` | Solo iOS Simulator |
| **Emulador Android** | `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` | Android Emulator (AVD) |
| **Túnel** | `EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app` | Redes distintas / firewall / hotspot complicado |

La app resuelve el origin en `src/api/base-url.ts`:

1. Si hay override → úsalo.
2. Si no → host LAN de Metro + puerto `8080`.
3. Fallback: `10.0.2.2` (Android) o `localhost` (iOS).

Prefijo API: `/api/v1` (lo añade el client).

---

## Checklist backend

1. Backend arriba en `http://0.0.0.0:8080` (no solo loopback).
2. Seed: `make seed` en `barber-backend`.
3. Credenciales LOCAL seed:
   - `barber@demo.barber` / `Password123!`
   - `admin@demo.barber` / `Password123!`
4. Firewall macOS: permitir puerto **8080** si el device no conecta.

---

## Modo Auto (LAN) — día a día en físicos

1. Mac y teléfono (S25 / iPhone / iPad) en la **misma Wi‑Fi** (o hotspot del teléfono).
2. Copia `.env.example` → `.env` y deja `EXPO_PUBLIC_API_URL=` vacío.
3. Arranca Metro: `npm start` (dev client).
4. Instala development build una vez: `npm run ios` / `npm run android` (con device conectado).
5. En login, revisa el pie: `API (auto): http://<tu-ip>:8080`.

Si la IP de la Mac cambia, reinicia Metro; el auto-detect se actualiza.

---

## Switch a localhost / emulador / túnel

Edita `.env`:

```bash
# iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:8080

# Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080

# Túnel (ejemplo ngrok)
EXPO_PUBLIC_API_URL=https://abcd1234.ngrok-free.app
```

Reinicia Metro (`r` o mata y `npm start`). No hace falta rebuild nativo solo por cambiar la URL.

Volver a Auto: borra el valor o coméntalo y reinicia Metro.

### Túnel rápido (ngrok)

```bash
ngrok http 8080
# pega la https://… en EXPO_PUBLIC_API_URL
```

Si el backend valida Host/CORS de forma estricta, añade el origen del túnel en `ALLOWED_ORIGINS` del backend.

---

## Google Sign-In (device builds)

Google **no** corre en Expo Go para este setup. Usa **development build**.

Si `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (o el web id) está vacío, la app **no** llama a `GoogleSignin.configure()` — login LOCAL sigue OK. Si se llamaba configure sin `iosClientId`, iOS crasheaba con RedBox (`GoogleService-Info.plist was not found`).

### Variables app (`.env`)

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

- **Web client ID**: audience del ID token; debe estar en `GOOGLE_CLIENT_IDS` del backend.
- **iOS client ID**: OAuth client tipo iOS (bundle `com.barber.barberapp`). Obligatorio en iOS (alternativa: `GoogleService-Info.plist` nativo).
- **Android**: OAuth client tipo Android con package `com.barber.barberapp` + **SHA-1** del keystore de debug.

Tras pegar IDs reales: reinicia Metro. No hace falta plist si pasas `iosClientId` por env.

### Backend

```bash
GOOGLE_CLIENT_IDS=<web>,<ios>,<android-opcional>
```

Sin esto, `/auth/google` responde `400 google auth is not configured`. Login LOCAL sigue funcionando.

### SHA-1 debug (Android)

```bash
cd android && ./gradlew signingReport
# o keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
```

Tras cambiar client IDs / package / plugins nativos → rebuild: `npx expo run:ios --device` / `run:android --device`.

---

## iOS + Xcode 26.2 (SDK 57)

Si `npm run ios` falla con:

```
SWIFT_RETURNS_RETAINED RuntimeScheduler ... is not returning a SWIFT_SHARED_REFERENCE type
```

es un bug conocido de `expo-modules-jsi` en Xcode 26.2. Este repo ya incluye el parche en `patches/expo-modules-jsi+57.1.1.patch` (se aplica con `postinstall` / patch-package).

Tras aplicar el parche:

```bash
rm -rf node_modules/expo-modules-jsi/apple/Products node_modules/expo-modules-jsi/apple/.DerivedData
npm run ios
```

## Development builds (iOS + Android)

```bash
# Primera vez / tras libs nativas
npx expo run:android --device
npx expo run:ios --device

# Día a día (JS)
npm start
```

Requisitos: Xcode (iPhone/iPad), Android Studio + USB debugging (S25), Apple Developer para device iOS físico si aplica.

---

## Smoke checklist

- [ ] Login LOCAL seed en device físico
- [ ] Login Google (con client IDs + backend `GOOGLE_CLIENT_IDS`)
- [ ] `GET /barbers/me` carga sucursales
- [ ] Si `memberships` vacío: Crear barbería **o** Unirme + Staff aprobar (doc 06)
- [ ] Status pills + métricas del día
- [ ] Scan QR / search
- [ ] Confirm service
- [ ] Mirror QR incluye `barber_id` y `branch_id`
- [ ] Staff: compartir `branch_id` + aprobar PENDING
