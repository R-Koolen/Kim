# Handoff: "Waar is Kim?" — deploy & make multiplayer

> For the developer / Claude Code session that will host this on an Ubuntu server.
> Written in English for precision; the app UI itself is Dutch and stays Dutch.

---

## 1. Overview

**"Waar is Kim?"** is a playful web app for a ~5–10 person student house. A physical
photo of "Kim" is hidden somewhere in the flat; when someone finds it they log where
they found it (public) and re-hide it somewhere new (secret). Hints unlock over time
(one per month). There's a map, a hint system, a full history of rounds, a leaderboard,
and a per-round comment feed.

**This is NOT a rough mockup — it is a complete, working front-end.** The whole UI and
all interactions already function. Your job is **not to rebuild the UI**. Your job is to:

1. **Make the game state truly shared** between players (today it's per-device only).
2. **Remove the in-browser Babel compiler** (it's a dev-only convenience).
3. **Fix two things that only work inside the design tool it was built in**
   (photo persistence, and the live "cross-tab" sync trick).
4. **Host it on the Ubuntu server.**

Everything in section 4 ("Production checklist") is the actual work. Sections 5–8 are
reference.

---

## 2. What's in this bundle

```
app/
  Waar is Kim.html   ← entry point. All CSS + the React root app live here.
  kim-store.js       ← *** THE DATA LAYER. This is where almost all your work is. ***
  kim-data.js        ← floor-plan geometry (rooms) + demo seed data
  kim-map.jsx        ← interactive SVG floor plan (rooms, furniture, pins, click-to-drop)
  kim-screens.jsx    ← the 5 tab screens (Home, Kaart, Hints, Historie, Ranglijst)
  kim-flows.jsx      ← modals: identity, found-wizard, hider panel, round detail, comments
  kim-helpers.jsx    ← date/format helpers, avatars, buttons, bottom-sheet, confetti
  tweaks-panel.jsx   ← a DESIGN-TIME theme/demo panel (see §4E — strip or repurpose)
  image-slot.js      ← drag-and-drop photo component (see §4D — persistence must change)
```

Load order matters and is already correct in `Waar is Kim.html`: React → ReactDOM →
Babel → `image-slot.js` → `kim-store.js` → `kim-data.js` → the `.jsx` files → the inline
app script. Components are shared between files via `Object.assign(window, {...})` at the
bottom of each file (because each `<script type="text/babel">` gets its own scope).

---

## 3. Architecture in one paragraph

Plain React 18 (no framework, no router — it's a single screen with a tab bar). All game
state lives in **one JSON document** managed by `window.KimStore` (in `kim-store.js`).
The React app subscribes to the store; every mutation rewrites the document and notifies
subscribers. **Identity** ("who am I") is just a name string kept in `localStorage` per
device — there is no auth. This single-document model is deliberate and makes the backend
swap easy: the backend only has to **store, serve, and stream one JSON blob.**

### The state document shape

```jsonc
{
  "players": ["Paul", "Koen", "Robin", "Alex", "Ole"],
  "genesisPin": { "x": 0.759, "y": 0.357 },   // normalised 0..1 (see §6)
  "rounds": [
    {
      "id": "r8",
      "hiderName": "Alex",
      "hiddenAt": 1715000000000,               // epoch ms — round START
      "hiddenPin": { "x": 0.907, "y": 0.125 }, // SECRET: only the hider should see it
      "hints": [ { "text": "Niet in een slaapkamer…" }, … ],
      "foundAt": null,                          // epoch ms when found, or null if active
      "foundByName": null,
      "foundPin": null,                         // PUBLIC: where it was found (round END)
      "comments": [ { "id": "c4", "name": "Robin", "text": "…", "at": 1716000000000 } ]
    }
  ]
}
```

- The **active round** is the single round with `foundAt === null` (always the last one).
- The publicly-shown "last seen here" pin for the active round is the **previous** round's
  `foundPin` (`KimStore.lastFoundPin()` derives it).
- Hints unlock client-side: hint *i* (1-based) unlocks at `hiddenAt + i months`. No backend
  logic needed for hints.

### `KimStore` public API (consumed by the React app — keep these signatures!)

```
KimStore.init(seed)                  → ensure a document exists (currently sync)
KimStore.getState()                  → current snapshot
KimStore.subscribe(fn)               → fn(state) on every change; returns unsubscribe
KimStore.getUser() / setUser(name)   → local identity (localStorage; can stay local)
KimStore.activeRound()               → derived
KimStore.lastFoundPin()              → derived
KimStore.foundAndRehide({foundPin, foundByName, hiddenPin, hiderName, hints})
KimStore.moveHiddenPin(pin)
KimStore.updateHints(hints)
KimStore.addComment(roundId, {name, text})
KimStore.resetGame(seed)
```

Every mutation already ends by calling the private `_save(next)`. **All of them return a
Promise.** That is the whole point: when you make `_save`/`_load`/`_watch` talk to a server,
the React app needs **zero** changes.

---

## 4. Production checklist (the actual work)

### A. Make state shared (REQUIRED for multiplayer) ⭐ main task

Today the "backend" is `localStorage`. Replace the **four primitives** at the top of
`kim-store.js` — they are explicitly marked `[ADAPTER]`. The single-document model maps
1:1 onto a tiny REST + Server-Sent-Events backend, which is ideal for your Ubuntu box.

**Recommended: self-hosted Node + SQLite + SSE** (no third-party accounts, all on your server).

Backend (≈60 lines, Express):

```
GET  /api/state          → returns the JSON document (create from seed on first run)
PUT  /api/state          → body = full new document; persist; push to all SSE clients
GET  /api/stream         → text/event-stream; emits the document on every change
```

Store the document as a single row/blob in SQLite (or even a single `state.json` file
with an flock). Concurrency for ~10 friends is fine with **last-write-wins**; if you want
to be safe, add an integer `version` field and reject stale PUTs (409 → client refetches).

Client side, edit ONLY `kim-store.js`:

```js
// [ADAPTER]
async function _load() {
  const r = await fetch('/api/state');
  return r.ok ? r.json() : null;
}
async function _save(next) {
  state = next;
  _emit();                                   // optimistic local update
  await fetch('/api/state', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  });
  return next;
}
function _watch() {
  const es = new EventSource('/api/stream');
  es.onmessage = (e) => { try { state = JSON.parse(e.data); _emit(); } catch {} };
}
```

`init` becomes async (`state = await _load(); if (!state) { await _save(seed); }`). Because
of that, **guard the React app for a null first state** — in `Waar is Kim.html` the App
does `useState(() => KimStore.getState())`; render a small "Laden…" splash while it's null,
and call `KimStore.init(...)` then `setState` once it resolves. That's a ~10-line change.

**Alternative with zero server code: Firebase Firestore.** One document
(`doc(db,'kim','state')`); `_load` = `getDoc`, `_save` = `setDoc`, `_watch` = `onSnapshot`.
Good if you'd rather not run a process; otherwise the Node option keeps everything on your box.

Keep `getUser`/`setUser` as-is (identity stays per-device in `localStorage`).
Note: there is **no authentication** — anyone can pick any name. That's acceptable for a
trusted house; don't expose this to the public internet without at least a shared password
/ basic-auth in nginx.

### B. Remove the in-browser Babel transformer (REQUIRED)

Right now JSX is compiled in the browser via `@babel/standalone` (`<script type="text/babel">`).
It works but is slow on first paint and logs a warning. For production, **precompile the JSX**:

- Easiest: run the `.jsx` files through **esbuild** once
  (`esbuild kim-*.jsx --bundle --outfile=app.js --loader:.jsx=jsx --jsx-factory=React.createElement`),
  output one `app.js`, then in the HTML replace all the `text/babel` script tags + the
  Babel CDN tag with a single `<script src="app.js"></script>`. Move the inline app script
  into the bundle too.
- Or migrate to **Vite** (`npm create vite`, React template) and import the files as modules.
  This also solves bundling, minification, and asset hashing in one go.

Either way: drop the `Object.assign(window, …)` exports and use real `import`/`export`
once you're bundling.

### C. Vendor the dependencies (RECOMMENDED)

React, ReactDOM, Babel, and Google Fonts currently load from CDNs (unpkg / fonts.googleapis).
For a self-hosted, offline-resilient deploy, download these and serve them locally (the
bundler in step B handles React/ReactDOM; just self-host the two font families —
Baloo 2, Plus Jakarta Sans, Space Grotesk, Bricolage Grotesque, Nunito — or pin to the
ones the chosen theme actually uses).

### D. Photo persistence — `image-slot.js` will NOT persist on your server (REQUIRED if keeping the foto feature)

The `<image-slot>` component (used for **Kim's poster photo** on Home, id `kim-photo`, and the
**bewijsfoto / proof photo** per round, id `bewijs-<roundId>`) persists dropped images by
writing a `.image-slots.state.json` sidecar **through the design tool's host bridge
(`window.omelette`)**. On a plain nginx/Node server that bridge doesn't exist, so **drops
will display in-session but won't survive a reload, and won't be shared.**

Replace its persistence with your backend:

```
POST /api/photo/:key   (multipart or base64 body)  → save image, return URL
GET  /api/photo/:key                                → serve the image
```

…where `key` is the slot id (`kim-photo` or `bewijs-<roundId>`). Then either swap
`<image-slot>` for a small custom upload component that POSTs to that endpoint and renders
`<img src="/api/photo/<key>">`, or keep `image-slot.js` but rewrite its internal
load/save to hit those endpoints instead of `window.omelette`. Storing small images as
base64 strings directly inside the per-round JSON (and thus the shared document) is also
viable for a house this size, but keep them small (resize client-side to ~800px).

### E. The Tweaks panel is a design tool — strip or repurpose (RECOMMENDED)

`tweaks-panel.jsx` + the `<TweaksPanel>` block in `Waar is Kim.html` provide a floating
panel with: **Look** (Zacht / Helder / Speels themes), **Accentkleur**, **Confetti toggle**,
a **"Speel als"** identity switcher, and **"Spel resetten"**. The panel only appears when
the design tool toggles edit mode, so it's invisible in normal use — but for production:

- The owner currently prefers **Look = "Speels", Accent = "Mos"**. Either hardcode that
  (set `data-theme="speels"` on `<html>`, drop the others) **or** keep Look/Accent as a real
  in-app setting persisted per device. Your call.
- **Remove "Speel als"** (debug identity override) and **"Spel resetten"** (wipes the game)
  from any production build, or hide them behind an admin flag — `resetGame` is destructive.

---

## 5. Screens (reference — these already work, don't rebuild)

Mobile-first, single column `max-width: 430px`, fixed top bar + bottom tab bar, scroll area
between. Five tabs:

- **Home** — "VERMIST" poster card (the photo slot) + big "Kim is al N dagen zoek" counter,
  3 stat chips (hints vrij / zoekers / reacties), the primary **"Ik heb Kim gevonden!"**
  button (hidden for the current hider, who instead sees a "Geheim paneel" card), a
  last-seen mini-map, latest unlocked hint, and a comment peek.
- **Kaart** — full interactive floor plan. Shows the public "laatst gevonden" pin; if you're
  the hider it also shows your secret pin. Lists unlocked hints.
- **Hints** — progress bar + per-hint cards; unlocked hints reveal text, locked ones show a
  countdown ("Komt vrij over N dagen").
- **Historie** — live round at top, then finished rounds (who found it, in which room, after
  how long). Tapping a round opens the **round-overzicht** sheet (map with both pins,
  **bewijsfoto**, and the comment feed).
- **Ranglijst** — three highlight cards (meeste vondsten / langst verstopt / snelste vondst)
  + a per-player table. All derived from `rounds` (see `leaderboard()` in `kim-helpers.jsx`).

**Key flow — "Ik heb Kim gevonden!"** (a 5-step bottom-sheet wizard in `kim-flows.jsx`):
Vondst (tap map = public found pin) → **Bewijs** (optional proof photo) → Verstop (tap map =
new secret pin) → Hints (write 1+ hints) → Klaar (confetti 🎉). On finish it calls
`KimStore.foundAndRehide(...)`, which closes the active round and opens a new one with the
finder as the new hider.

---

## 6. Floor plan & pins (reference)

- Geometry is in `kim-data.js` → `KIM_ROOMS`, drawn in an SVG `viewBox="0 0 1080 560"`
  (`KIM_VB`). Rooms: 5 bedrooms (each labelled with a housemate), woonkamer+keuken, badkamer,
  wc, berging, entree/gang, balkon, plus shafts. It's a friendly stylised version of the
  real "2de verdieping" plan.
- **Pins are stored normalised 0..1** relative to that viewBox, so they're resolution-independent.
  Click-to-drop converts pointer coords via `svg.getScreenCTM().inverse()` (see `FloorPlan` in
  `kim-map.jsx`). `roomAtPin(pin)` / `roomLabel(pin)` map a pin back to a room name.

---

## 7. Design tokens (reference — themes via CSS custom properties on `:root[data-theme=…]`)

Three themes live in the `<style>` block of `Waar is Kim.html`. All are "cool & calm".

| token | Zacht (soft) | Helder (clean) | Speels (playful, current pick) |
|---|---|---|---|
| `--accent` | `#2f8aa3` | `#2b6cb8` | `#13ad9e` (with Accent=Mos → `#3f9d6b`) |
| `--app` (bg) | `#eef3f6` | `#ffffff` | `#e8f4f1` |
| `--card` | `#ffffff` | `#ffffff` | `#ffffff` |
| `--ink` (text) | `#20303a` | `#102230` | `#173a44` |
| `--radius` | 20px | 14px | 26px |
| display font | Bricolage Grotesque | Space Grotesk | Baloo 2 |
| body font | Plus Jakarta Sans | Plus Jakarta Sans | Nunito |
| pin: found / hidden | `#3a7bd5` / `#e8795f` | `#2b6cb8` / `#d9694f` | `#1f93b0` / `#ef82a4` |

Accent override options ("Accentkleur" tweak): Oceaan `#2f8aa3`, Mos `#3f9d6b`,
Lavendel `#7d8ad6`. Spacing/shadows/map colours are all token-driven in the same block.

---

## 8. Suggested deploy on Ubuntu (summary)

1. **Build** the front-end (§4B): produce static files (`index.html` + bundled `app.js` +
   fonts + any images) in a `dist/` folder.
2. **Backend** (§4A): run the small Node/Express + SQLite service (e.g. on `:3000`) under a
   process manager (`systemd` unit or `pm2`).
3. **nginx**: serve `dist/` as static root; reverse-proxy `/api/` → `http://127.0.0.1:3000`;
   make sure SSE works (`proxy_buffering off;` and `proxy_http_version 1.1;` on the
   `/api/stream` location).
4. **HTTPS**: `certbot --nginx` for a Let's Encrypt cert (needed for a good mobile PWA feel
   and for `EventSource` over TLS).
5. **(Optional) lock it down**: nginx `auth_basic` with a shared house password, since the
   app has no real auth.
6. **(Optional) PWA**: add a `manifest.json` + a tiny service worker so housemates can
   "Add to Home Screen" and it feels like a native app.

A good first milestone: get the static app served + the `/api/state` + `/api/stream`
endpoints working with the adapter from §4A. At that point it's genuinely multiplayer.
Photo upload (§4D) can follow.

---

## 9. Gotchas

- **`className` on `<image-slot>`**: React forwards `className` to custom elements as a literal
  `classname` attribute (no `class`), so CSS class selectors silently don't apply. The code
  styles those slots by `id` / inline `style` instead — keep doing that if you touch them.
- **Entrance animation & captures**: the `.screen` fade animates `transform` only (not opacity)
  on purpose, so content is visible in screenshots/print/no-JS. Don't reintroduce `opacity:0`
  start states on always-visible content.
- **Times are epoch ms**; dates are formatted in Dutch in `kim-helpers.jsx` (`fmtDate`,
  `fmtDateLong`, month arrays `MND`/`MND_L`).
- **The seed in `kim-data.js` is demo content** (7 fake rounds with timestamps relative to
  "now"). For production, seed the backend once with just `players` + `genesisPin` + a single
  starting round, or import the demo if you want history to look alive on day one.
```
