---
name: NDLE
description: "Short. Sharp. Smarter. — the intelligent URL shortener with real-time analytics."
colors:
  signal-yellow: "oklch(0.86 0.17 88)"
  ink: "oklch(0.145 0 0)"
  ink-warm: "oklch(0.14 0.008 85)"
  primary-ink: "oklch(0.205 0 0)"
  surface: "oklch(0.97 0 0)"
  card: "oklch(0.985 0 0)"
  popover-white: "oklch(1 0 0)"
  muted: "oklch(0.95 0 0)"
  muted-foreground: "oklch(0.5 0 0)"
  border: "oklch(0.9 0 0)"
  success: "oklch(0.86 0.15 145)"
  success-container: "oklch(0.95 0.06 145)"
  warning: "oklch(0.93 0.12 75)"
  destructive: "oklch(0.577 0.245 27.325)"
  info: "oklch(0.96 0.07 230)"
  poster-blue: "oklch(0.52 0.22 265)"
  pulp-orange: "oklch(0.71 0.17 45)"
  pulp-yellow: "oklch(0.85 0.17 92)"
  telegram-paper: "oklch(0.93 0.07 92)"
  cork-tan: "oklch(0.62 0.09 62)"
typography:
  display:
    fontFamily: "Sigmar, Geist Mono, monospace"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  readout:
    fontFamily: "Doto, Geist Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input-field:
    backgroundColor: "{colors.popover-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  badge-status:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  card-surface:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: NDLE

## 1. Overview

**Creative North Star: "The Dispatch Desk"**

NDLE is an operator's console, not a marketing brochure. The whole product feels like a well-kept dispatch desk: monospace logs, dashed pin-board borders, hairline rules, and a single bright yellow stamp that means *pay attention here*. Information is the material; the chrome is quiet, mechanical, and exact. Every link is a record, every chart a reading off an instrument, and the interface's job is to make those records trustworthy and fast to act on. The personality is real and a little wry — *"Short. Sharp. Smarter."* is attitude carried in restraint, not noise.

Density is welcomed where it serves the task: tables run long, panels carry many labels, numbers sit close together. But density is never heaviness — the surface stays light (near-white), borders do the structural work, and the one accent is rationed. The product is light-mode by intent; depth is conveyed by borders and *subtle* lift, not by drop-shadow theatrics. The monospace body font is the signature: it makes data legible at a glance, gives URLs and slugs a native home, and quietly signals "this is a tool with a point of view."

This system explicitly rejects the **generic SaaS / Bitly-clone** look (corporate blue gradients, rounded-everything card soup), **enterprise heaviness** (mission-control cockpits, bureaucratic density-for-its-own-sake), **over-cute toy energy** (whimsy that undermines trust with real campaigns and money), and the **templated AI default** (cream backgrounds, an uppercase tracked eyebrow above every section, gradient text, identical icon-card grids). NDLE has an identity; the rule is to use it, deliberately.

> Note: NDLE ships two registers. This spec governs the **product** app. The public/marketing home (`PublicHome`, `GuestShortenerCard`) is a **brand** surface that draws on the Scene palette below (pulp-poster blue/orange, telegram sepia, cork) and runs louder — billboard flicker, 3D pulp titles, vintage signage. Keep the two register treatments distinct; don't bleed pulp theatrics into the dashboard, or dashboard restraint into the home.

**Key Characteristics:**
- Monospace-first: Geist Mono carries body, labels, data, and most headings.
- One voice of color: a single Signal Yellow accent, rationed to ≤10% of any screen.
- Border-defined structure: solid hairlines for surfaces, dashed lines for the "pin-board" framing.
- Light-mode, near-white surfaces; warm-leaning ink, never dead pure black.
- State-driven motion in 150–250ms; the only theatrics (billboard flicker) live on the brand home.

## 2. Colors

A near-monochrome, near-white workspace with one bright accent and a disciplined semantic set. The product palette is hue-free neutral; the only warmth lives in the ink and the yellow.

### Primary
- **Signal Yellow** (`oklch(0.86 0.17 88)`): The system's one voice. Used for primary action fills, the active nav item, focus rings, the current selection, and text-selection highlight. It is an *indicator*, not decoration. Because it is a light, high-chroma yellow, it is **never** used for text on white — only as a fill with dark ink on top, or as a 3px focus ring at reduced alpha.

### Secondary
- **Primary Ink** (`oklch(0.205 0 0)`): Near-black used for secondary/neutral primary buttons and high-emphasis solid fills where the yellow would be too loud. The "quiet strong" action color.

### Neutral
- **Ink** (`oklch(0.145 0 0)`): Default foreground text on light surfaces.
- **Warm Ink** (`oklch(0.14 0.008 85)`): The industrial near-black, nudged warm to avoid dead pure-black; for high-contrast display and signage moments.
- **Surface** (`oklch(0.97 0 0)`): The app background — a light gray, not white, so cards and panels read as raised.
- **Card** (`oklch(0.985 0 0)`): Card and panel surface, one step brighter than the background.
- **White** (`oklch(1 0 0)`): Pure white for inputs and popovers, the brightest layer.
- **Muted** (`oklch(0.95 0 0)`): Secondary fills, toolbars, hover backgrounds, the second neutral layer.
- **Muted Foreground** (`oklch(0.5 0 0)`): Supporting/label text. This is the contrast floor — do not go lighter for body text.
- **Border** (`oklch(0.9 0 0)`): Hairline borders and dividers. The dashed "pin-board" frame uses a warm gray (`gray-400/60`) variant.

### Tertiary — Semantic
- **Success** (`oklch(0.86 0.15 145)`) / **Success Container** (`oklch(0.95 0.06 145)`): Healthy links, uptime, positive deltas. Container + dark-on-container text for badges on light cards.
- **Warning** (`oklch(0.93 0.12 75)`): Degraded health, attention-needed states.
- **Destructive** (`oklch(0.577 0.245 27.325)`): Delete, errors, hard failures.
- **Info** (`oklch(0.96 0.07 230)`): Neutral informational callouts.

### Scene palette (brand home only)
- **Poster Blue** (`oklch(0.52 0.22 265)`), **Pulp Orange** (`oklch(0.71 0.17 45)`), **Pulp Yellow** (`oklch(0.85 0.17 92)`), **Telegram Paper** (`oklch(0.93 0.07 92)`), **Cork Tan** (`oklch(0.62 0.09 62)`): Reserved for the marketing/public home's pulp-poster and dispatch-telegram scenes. **Forbidden in the product app.**

### Named Rules
**The One Voice Rule.** Signal Yellow appears on ≤10% of any product screen. Its rarity is the entire point — primary action, active state, focus, selection, and nothing else. The moment a second thing is yellow "for emphasis," neither is special.

**The No-Yellow-Text Rule.** Signal Yellow is a fill or a ring, never a text color on white (it fails 4.5:1). Yellow surfaces always carry dark ink.

## 3. Typography

**Display Font:** Sigmar (heavy single-weight display, with Geist Mono fallback) — brand home only.
**Body Font:** Geist Mono (with `ui-monospace, monospace` fallback) — the workhorse for the entire product.
**Label / Readout Font:** Doto (variable dot-matrix / LED font) — for badges, "PRO" marks, and signage-style numeric readouts.

**Character:** Monospace-first and proud of it. Geist Mono gives the product a precise, mechanical, terminal-adjacent voice where URLs, slugs, counts, and timestamps all sit in their natural element. Display moments borrow Sigmar's blocky weight; numeric "readouts" borrow Doto's dot-matrix glow. The pairing is contrast-by-medium (signage display + monospace body), never two similar sans.

### Hierarchy
- **Display** (Sigmar 400, `clamp(2.5rem, 6vw, 4.5rem)`, line-height 1): Brand-home hero wordmarks and pulp titles. Not used in the dashboard.
- **Headline** (Geist Mono 600, 1.25rem/20px, tight tracking): Route and section titles in the app.
- **Title** (Geist Mono 600, 1rem/16px, `tracking-tight`): Card titles, panel headers (`CardTitle`).
- **Body** (Geist Mono 400, 0.875rem/14px, line-height 1.5): Default UI and prose text. Cap prose at 65–75ch; data tables may run denser to 120ch+.
- **Label** (Geist Mono 500, 0.75rem/12px): Field labels, badges, table headers, supporting metadata.
- **Readout** (Doto 900, ~0.875rem, slight positive tracking): LED-style counters, "PRO" badges, live-blip indicators — used sparingly as signage flavor.

### Named Rules
**The Monospace-Body Rule.** The product body font is Geist Mono, always. Do not introduce a proportional sans for UI text "to look cleaner" — the monospace voice is the identity. Proportional/serif type is off-limits in the app.

**The Signage-Sparingly Rule.** Sigmar and Doto are seasoning. Display in the dashboard, dot-matrix readouts everywhere — both are tells of trying too hard. Reserve Sigmar for the brand home; reserve Doto for true numeric/LED moments.

## 4. Elevation

NDLE is **flat by default, subtly lifted on purpose.** At rest, structure comes from borders — solid hairlines (`border`) separate surfaces, dashed warm-gray lines (`border-dashed border-gray-400/60`) frame the "pin-board" containers like the sidebar, and a near-white tonal step (background `0.97` → card `0.985` → input `1.0`) does the rest. Drop shadows are intentionally quiet: a hairline `shadow-xs` sits under cards, inputs, and buttons at rest, and a slightly more defined lift (≤8px blur) is permitted on key/interactive surfaces and on hover. Never the soft 16px+ "ghost-card" glow.

### Shadow Vocabulary
- **Hairline** (`box-shadow: 0 1px 2px rgba(0,0,0,0.04)` — the `shadow-xs` step): Default resting elevation for cards, inputs, buttons, badges.
- **Lift** (`box-shadow: 0 2px 8px rgba(0,0,0,0.06)` max): For raised key surfaces and hover feedback on primary buttons/cards. The ceiling is 8px blur.
- **Rim** (`var(--shadow-rim)` → `inset 0 0 0 1px rgba(255,255,255,0.02)`; reusable utility `shadow-rim`): Elevation from a 1px **inner** highlight that reads as a raised edge catching light, *instead of* a cast drop shadow. For dark / elevated surfaces (chart tooltips, dark cards, future dark mode); near-invisible on the light app surface by design. Auto-tunes to `rgba(255,255,255,0.04)` under `.dark`. Composes with a border (separate property); to pair it with a drop shadow, author both in a single `box-shadow` value (two box-shadow utilities don't stack). **In use:** the chart tooltip (`components/charts/tooltip/tooltip-box.tsx`), combined with a soft float drop.
- **Rim (soft)** (`var(--shadow-rim-soft)`; reusable utility `shadow-rim-soft`): The light-surface sibling of Rim. A top white highlight (for tinted/elevated surfaces) plus a faint dark inner hairline — the hairline is what actually reads on near-white cards — giving a gentle raised edge with no cast shadow. Use on light surfaces where the white-only Rim wouldn't read.

### Named Rules
**The Border-First Rule.** Reach for a border before a shadow. Depth in NDLE is drawn, not blurred — solid hairlines and the dashed pin-board frame carry hierarchy; shadow is a quiet supporting actor.

**The No-Ghost-Card Rule.** Never pair a 1px border with a soft wide drop shadow (≥16px blur) on the same element. Pick one. A 1px border *and* a defined ≤8px lift is the most an element gets.

**The Rim-Light Rule.** On dark / elevated surfaces, prefer the `shadow-rim` inner highlight over a cast shadow to convey lift. Light catches the top edge; the surface reads raised without dropping a shadow that fights the dark ground. Reach for `shadow-rim` first on dark cards, then Lift only if more separation is needed.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`rounded-md`, 10px). Small/large keep the same radius.
- **Primary:** Signal Yellow fill, dark ink text, `h-9` (36px), `px-4`. Hover deepens the fill (~90%) and adds the Lift shadow. `active:scale-[0.98]` for a tactile press.
- **Outline:** White/surface background, hairline border, `shadow-xs`; hover goes to white with accent-foreground text.
- **Secondary:** Muted gray fill, ink text; hover at 80% opacity.
- **Ghost:** Transparent; hover fills with the accent and switches text to accent-foreground (used heavily in the icon nav).
- **Destructive:** Destructive fill at 80%, white text.
- **Focus (all):** 3px Signal Yellow ring at reduced alpha (`focus-visible:ring-accent/50`) plus accent border. Transitions ~100–150ms ease-out.
- **Sizes:** `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (size-9), `xs` (size-5).

### Badges / Chips
- **Style:** `rounded-sm` (8px), `text-xs`, `shadow-xs`, `px-2 py-0.5`, `select-none`.
- **Status variants:** soft top-to-bottom tonal gradients with a matching ~70%-alpha border (green / yellow / red / blue) and a darker text of the same hue — for link health, status, deltas.
- **Primary variant:** Signal Yellow fill, ink text, medium weight — for "current"/featured marks.
- **`badge-pro`:** Doto dot-matrix text, pill shape, orange-tinted with an inset highlight — the signature "PRO" mark. `badge-basic` is its quiet muted-gray sibling.

### Cards / Containers
- **Corner Style:** `rounded-md` (10px). Cards never exceed `rounded-lg` (12px) — over-rounding is off-brand.
- **Background:** `card` (`0.985`) on the `surface` (`0.97`) app background.
- **Border:** Hairline `border` by default; the **dashed warm-gray frame** (`border-dashed border-gray-400/60`) is the signature "pin-board" treatment for shells and framed panels.
- **Shadow Strategy:** `shadow-xs` at rest (see Elevation); ≤8px Lift only on key/hover surfaces.
- **Internal Padding:** 20px (`p-5`); headers/footers `min-h-14` with a dividing border. An `accent` card variant nests a muted tray around a bright inner card for grouped content.
- **Nesting:** Never nest a card inside a card inside a card. The `accent` tray pattern is the one sanctioned single level of containment.

### Inputs / Fields
- **Style:** White background, hairline `border`, `rounded-md` (10px), `h-9`, `px-3`, `shadow-xs`, `text-sm`.
- **Placeholder:** `muted-foreground/55` — still must clear 4.5:1; bump toward ink if it reads faint.
- **Focus:** Accent border + 3px Signal Yellow ring at reduced alpha. No glow.
- **Error:** `aria-invalid` → destructive border + destructive ring.
- **Disabled:** `opacity-40`, no pointer events.

### Navigation
- **Style:** A narrow (w-16) icon rail in a dashed-bordered white "pin-board" aside, `90vh` tall, centered. Phosphor icons (`regular` weight default, `duotone` when active).
- **States:** Active item fills with Signal Yellow + accent-foreground; inactive is muted-foreground with a yellow-fill hover. Tooltips label each icon on the right.
- **Mobile:** The rail collapses structurally (responsive layout shift), not by shrinking type.

### Signature Components
- **Live readouts:** Doto/LED counters with `animate-live-blip` and `animate-led-flicker` for real-time click activity — the "instrument reading" moment.
- **Charts (visx/d3):** Use chart tokens (`--chart-1..5`, crosshair = accent, tooltip = ink at 90% alpha). Charts are readings, not decoration; never rely on color alone — pair with labels and direct values.
- **Billboard wordmark (brand home only):** `animate-bulb-switch` flickers the `ndle` wordmark on like vintage bulbs; has a `prefers-reduced-motion` off-state.

## 6. Do's and Don'ts

### Do:
- **Do** keep Geist Mono as the body/UI font everywhere in the product. The monospace voice is the identity.
- **Do** ration Signal Yellow to ≤10% of a screen — primary action, active state, focus, selection. Dark ink always sits on yellow fills.
- **Do** draw structure with borders first: hairline `border` for surfaces, the dashed `gray-400/60` frame for pin-board shells.
- **Do** keep card radius at `rounded-md`/`rounded-lg` (10–12px) and use full-pill only for tags/badges.
- **Do** give every interactive element its full state set — default, hover, focus-visible (3px yellow ring), active (`scale-[0.98]`), disabled, error.
- **Do** keep motion to 150–250ms state transitions in the app; use skeletons (not spinners) for loading.
- **Do** honor `prefers-reduced-motion` for every animation (flicker, fade, scan, blip).
- **Do** keep the pulp/telegram/cork Scene palette confined to the brand home.

### Don't:
- **Don't** ship the **generic SaaS / Bitly-clone** look — no corporate blue gradients, no rounded-everything card soup, no "looks like every other shortener."
- **Don't** drift into **enterprise heaviness** — no mission-control cockpit, no density-for-its-own-sake. Density is fine; heaviness is not.
- **Don't** tip into **over-cute / toy-like** territory; whimsy must never undermine trust with real campaigns and real money.
- **Don't** produce the **templated AI default** — no cream/sand backgrounds, no tiny uppercase tracked eyebrow above every section, no gradient text, no identical icon-card grids.
- **Don't** use Signal Yellow as a text color on white, or as decoration.
- **Don't** pair a 1px border with a ≥16px soft drop shadow (the ghost-card tell); cap lift at 8px blur.
- **Don't** over-round — no 24/28/32px+ radii on cards, sections, or inputs.
- **Don't** introduce a proportional sans or serif for product UI text, or scatter Doto/Sigmar where plain Geist Mono belongs.
- **Don't** nest cards more than the single sanctioned `accent`-tray level.
