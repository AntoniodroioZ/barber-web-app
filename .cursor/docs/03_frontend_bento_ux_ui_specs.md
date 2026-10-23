# 03. Frontend Bento Box Design & UX/UI Specifications

## 1. Design System & Bento Box Philosophy

The platform's user experience is anchored around a **Modern Bento Box** visual paradigm. The layout organizes complex operational data into clean, rounded visual cells with distinct typographic hierarchies, subtle depth gradients, and tactile micro-interactions.

### 1.1 Aesthetic Principles
* **Modular Bento Grid:** Information is segmented into self-contained cards with uniform border radiuses (`rounded-2xl` / `16px–24px`), soft inner glow, and distinct priority weighting.
* **Minimalist Pastel Palette with Punchy Accents:** Soft, desaturated pastel card backgrounds are paired with high-energy, vibrant neon/punchy accents for call-to-actions, status badges, and reward triggers.
* **Ergonomic Single-Hand Navigation:** The barber mobile app is architected for single-handed use at the styling chair. Critical controls (Status Switcher, QR Scanner trigger, Confirm Service button) reside in the **Lower Ergonomic Zone** (the bottom 40% of the display).
* **Dual Theme Architecture:** Full support for both **Dark Mode** (the default for barbershop aesthetics) and **Light Mode**, with continuous contrast compliance (WCAG AA).

---

## 2. Design Tokens & Color Palettes

### 2.1 Color Tokens (Dark & Light Mode)

| Token Name | Light Mode (Hex / Class) | Dark Mode (Hex / Class) | Usage |
| :--- | :--- | :--- | :--- |
| **`bg-canvas`** | `#F8FAFC` (Slate 50) | `#0B0F17` (Deep Obsidian) | Main application backdrop |
| **`bg-surface`** | `#FFFFFF` (Pure White) | `#141A24` (Subtle Dark Slate) | Bento card backgrounds |
| **`bg-surface-elevated`**| `#F1F5F9` (Slate 100) | `#1C2433` (Elevated Slate) | Modals, bottom sheets, active cards |
| **`border-subtle`** | `rgba(226, 232, 240, 0.8)` | `rgba(255, 255, 255, 0.08)` | Bento container border lines |
| **`border-focused`** | `rgba(99, 102, 241, 0.4)` | `rgba(129, 140, 248, 0.5)` | Active / selected state outlines |
| **`text-primary`** | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Main headlines and titles |
| **`text-secondary`** | `#475569` (Slate 600) | `#94A3B8` (Slate 400) | Captions, labels, timestamps |
| **`text-muted`** | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | Placeholders, inactive icons |

### 2.2 Pastel Foundations & Punchy Accents

```
   [Pastel Canvas / Cards]                   [Vibrant Punchy Accents]
   ┌───────────────────────┐                 ┌───────────────────────┐
   │ Pastel Mint:  #E8F5E9 │                 │ Neon Emerald: #10B981 │ (Available Status)
   │ Pastel Amber: #FFF3E0 │ ──────────────► │ Electric Amber: #F59E0B│ (Busy / In Cut)
   │ Pastel Rose:  #FCE4EC │                 │ Bright Coral: #F43F5E │ (Waitlist Full / Red)
   │ Pastel Indigo:#EDE7F6 │                 │ Punchy Violet:#8B5CF6 │ (Loyalty Rewards)
   └───────────────────────┘                 └───────────────────────┘
```

* **Vibrant Status Colors:**
  * **🟢 `status-available`:** Pastel bg `#E6F4EA` / Dark `#0D2818` ➔ Accent **`#10B981`** (Emerald 500).
  * **🟡 `status-busy-open`:** Pastel bg `#FEF7E0` / Dark `#2E2005` ➔ Accent **`#F59E0B`** (Amber 500).
  * **🟠 `status-busy-full`:** Pastel bg `#FCE8E6` / Dark `#2C110C` ➔ Accent **`#F97316`** (Orange 500).
  * **🔴 `status-offline`:** Pastel bg `#F1F3F4` / Dark `#1E242B` ➔ Accent **`#EF4444`** (Red 500).
* **Loyalty Reward Gold/Violet Accent:**
  * Gradient: `linear-gradient(135deg, #8B5CF6 0%, #D946EF 50%, #F59E0B 100%)`.

### 2.3 Typography & Elevation
* **Font Family:** `Inter`, `SF Pro Display`, or system sans-serif.
* **Hierarchy:**
  * **Display Numbers (Streaks / Counts):** 36px / Bold / Tracking Tight (`font-black tracking-tight`).
  * **Card Titles:** 18px / SemiBold (`font-semibold`).
  * **Body Text:** 14px / Regular (`font-normal leading-relaxed`).
  * **Micro Labels / Badges:** 11px / Medium / Uppercase (`font-medium text-xs tracking-wider`).
* **Corner Radius:**
  * Bento Cards: `rounded-3xl` (`24px`).
  * Interactive Buttons / Pills: `rounded-2xl` (`16px`).
  * Action Chips / Badges: `rounded-full` (`9999px`).

---

## 3. Barber Mobile App (React Native + NativeWind)

### 3.1 Ergonomic Architecture (Single-Hand Layout)

```
┌───────────────────────────────────────────────┐
│ Top Bar: Branch Selector & Barber Avatar      │
├───────────────────────────────────────────────┤
│ Bento Cell 1 (Hero): Current Live Status      │
│ [🟢 DISPONIBLE / EN CORTE / FULL / OFFLINE]   │
├───────────────────────────────────────────────┤
│ Bento Cell 2: Today's Metrics & Active Roster │
│ ┌──────────────────────┐┌───────────────────┐ │
│ │ 12 Cortes Completados││ 3 Premios Dados   │ │
│ └──────────────────────┘└───────────────────┘ │
├───────────────────────────────────────────────┤
│ LOWER ERGONOMIC ZONE (Thumb Reach Zone)       │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │  [ 📷 ESCANEAR QR CLIENTE ] (Main Button) │ │
│ └───────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────┐ │
│ │  [ 🔍 Buscar por Teléfono o Nombre ]      │ │
│ └───────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────┐ │
│ │  [ 🪞 Mi QR de Estación / Espejo ]        │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

### 3.2 Screen Specifications & Wireframe Flows

#### Screen A: Status Toggle (The Command Deck)
* **Visual Structure:** A large horizontal Bento card with 4 tactile status pills.
* **Micro-interactions:**
  * Tapping a pill triggers `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`.
  * The active card radiates a subtle colored glow matching the status (e.g., Emerald shadow when `AVAILABLE`).
  * Instant local state update with optimistic UI; failure triggers a rollback alert.

#### Screen B: Client Identification (Camera & Fallback Drawer)
* **Primary Scanner:** Full-screen camera viewfinder with a rounded Bento scan frame (`overlay-mask`).
* **Fallback Search:** A floating bottom sheet expandable with a thumb swipe containing:
  * Phone number numpad input (formatted as `(55) 1234-5678`).
  * Autocomplete search bar by client name.

#### Screen C: Identity Confirmation Modal (Cross-Check Validation)
* **Problem Solved:** Prevents logging a cut on a brother/child with a shared phone number.
* **UI Structure:**
  * High-contrast bottom sheet card.
  * Prominent avatar or initials badge (80x80px).
  * Question in bold: **"¿Confirmas que atiendes a Lucas (Hijo)?"**
  * Subprofile selection pills if multiple family members are linked to the scanned phone number.
  * Two large buttons: `[ ✅ Confirmar Identidad ]` (Primary Emerald) and `[ 🔄 Cambiar Familiar ]` (Secondary Ghost).

#### Screen D: The Haircut Cycle & Technical Logbook
* **1. Early Loyalty Banner (Top of Card):**
  * If the client is on their 5th cut, a banner appears with an animated pastel-to-violet gradient:
    > **🎉 ¡Aviso de Recompensa!**  
    > Este es su 5to corte. Aplica **50% de descuento** hoy.
* **2. Reference History Sheet:**
  * Displays the previous 2 haircuts: photos of sides/back, clipper guard numbers (`#0.5 fade`, `#2 tijera`), and specific stylist notes.
* **3. New Service Entry:**
  * Fast-tag selector chips for quick entry: `[#0.5 Fade]` `[#1 Low]` `[Tijera]` `[Barba]` `[Navaja]` `[Cera Mate]`.
  * Camera button: Launches camera to snap side and back photos. Images are compressed locally before upload.
* **4. Confirm Service Action:**
  * Full-width sticky button at bottom: `[ ⭐ Confirmar Servicio y Racha (+1) ]`.
  * Confirmation triggers confetti animation and sound/haptic feedback.

#### Screen E: Static Mirror QR Generator
* Generates an acrylic-ready printable QR code card.
* Displays the barber's name, avatar, and deep link: `https://cliente.mi-barberia.com/b/{barber_id}`.
* Action button: `[ 🖨️ Compartir / Imprimir QR para el Espejo ]`.

---

## 4. Ultra-Light Client Web App (React + Vite)

### 4.1 Zero-Friction Flow & Layout

The client web app is accessed by scanning the acrylic QR on the barber's mirror or opening a saved mobile bookmark.

```
┌───────────────────────────────────────────────┐
│ Header: Barbershop Logo & Barber Name         │
├───────────────────────────────────────────────┤
│ Bento Cell 1: Live Barber Status (Real-Time)  │
│ ┌───────────────────────────────────────────┐ │
│ │ 🟢 Carlos está DISPONIBLE                 │ │
│ │ "Silla libre, listo para atenderte ahora" │ │
│ └───────────────────────────────────────────┘ │
├───────────────────────────────────────────────┤
│ Bento Cell 2: Your Digital Loyalty Card       │
│ ┌───────────────────────────────────────────┐ │
│ │ Tu Racha: ⬤ ⬤ ⬤ ⬤ ◯ (4/5 Cortes)         │ │
│ │ ¡Próximo corte con 50% de Descuento!      │ │
│ └───────────────────────────────────────────┘ │
├───────────────────────────────────────────────┤
│ Bento Cell 3: Dynamic Client QR Code          │
│ ┌───────────────────────────────────────────┐ │
│ │                 ┌───────┐                 │ │
│ │                 │  QR   │                 │ │
│ │                 │ CODE  │                 │ │
│ │                 └───────┘                 │ │
│ │  Muestra este código al barbero al llegar │ │
│ │  Teléfono: +52 55 1234 5678               │ │
│ │  [ ✏️ Cambiar número ]                    │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

### 4.2 Web Feature Specifications

#### 1. Live SSE Status Stream
* The web app initiates an `EventSource` connection to `/api/v1/public/barbers/:id/branches/:branch_id/status/stream`.
* An animated pulse indicator (`ping-dot`) reflects live connectivity.
* Status changes update smoothly with CSS transition fades without requiring a page reload.

#### 2. Frictionless Phone Onboarding & LocalStorage
* **First Visit:** The client sees an input box asking only for their 10-digit phone number.
* **Storage:** Stored in `localStorage.setItem('client_phone', phone)`.
* **Subsequent Visits:** The web loads straight into the Bento dashboard, greeting the user with their phone number and generating their QR code automatically.
* **Edit Action:** A clean `"Cambiar número"` link opens an inline popover to clear local storage and re-enter a phone number.

#### 3. Dynamic QR Code Rendering
* Uses `qrcode.react` with canvas rendering for sharpness on high-DPI displays.
* QR payload encodes the JSON structure:
  ```json
  {"typ":"client_id","phone":"+525512345678","ts":1728240000}
  ```
* High contrast (pure black `#000000` on white `#FFFFFF` background with 12px white quiet zone) ensures rapid scanning even under warm barbershop lighting.

---

## 5. Component Interaction & State Matrix

| Component | Normal State | Hover / Focus | Pressed / Active | Disabled State |
| :--- | :--- | :--- | :--- | :--- |
| **Bento Card** | Rounded 24px, subtle border, smooth backdrop-blur | Border opacity increases, scale `1.005` | Inner scale `0.995` | Opacity 50%, no shadow |
| **Status Pill** | Desaturated pastel background, dark text | Glow outline matching status color | Background transitions to punchy accent | Opacity 40%, cursor not-allowed |
| **Action Button**| High-saturation accent color, bold text | Brightness +10%, shadow elevation | Scale `0.97`, haptic tick | Background gray, text muted |
| **QR Code Container** | Clean white surface, rounded-2xl, soft shadow | Border accent glow | Interactive zoom on tap for easy scanning | — |
| **Loyalty Streak Dots**| Unfilled dots: gray border; Filled: bright emerald | — | Animated pop on increment (`scale-125`) | — |
