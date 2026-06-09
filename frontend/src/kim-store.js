/* ============================================================================
 * kim-store.js — game state layer for "Waar is Kim?"
 * ----------------------------------------------------------------------------
 * Shared single-document state, persisted on the server and pushed to every
 * client over SSE. The whole app talks to it through a small async API + a
 * subscribe() pub/sub — see README §3 for the full contract.
 *
 *   _load()  → GET  /api/state    (current document, or null on first run)
 *   _save()  → PUT  /api/state    (full document; optimistic local update)
 *   _watch() → GET  /api/stream   (EventSource; pushes the document on change)
 *
 * Every mutation clones the current document, edits it, and hands the result
 * to _save — so the server only ever needs to store/serve/stream one blob.
 * Concurrency for a house this size is last-write-wins (see README §4A).
 * ========================================================================== */

const USER_KEY = "waar-is-kim/me/v1"; // local identity, per-device (not shared)

let state = null;
const subs = new Set();
let stream = null;

/* ---- persistence primitives --------------------------------------------- */
async function _load() {
  const r = await fetch("/api/state");
  return r.ok ? r.json() : null;
}
async function _save(next) {
  state = next;
  _emit(); // optimistic local update — the SSE push will confirm/reconcile
  await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  });
  return next;
}
function _watch() {
  if (stream) return;
  stream = new EventSource("/api/stream");
  stream.onmessage = (e) => {
    try { state = JSON.parse(e.data); _emit(); } catch (err) {}
  };
}
/* ------------------------------------------------------------------------ */

function _emit() { subs.forEach((fn) => { try { fn(state); } catch (e) {} }); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export const KimStore = {
  async init(seed) {
    if (!state) state = await _load();
    if (!state) { state = seed; await _save(state); }
    _watch();
    return state;
  },
  getState() { return state; },
  subscribe(fn) { subs.add(fn); if (state) fn(state); return () => subs.delete(fn); },

  /* identity (local to this device) */
  getUser() { try { return localStorage.getItem(USER_KEY) || null; } catch (e) { return null; } },
  setUser(name) { try { name ? localStorage.setItem(USER_KEY, name) : localStorage.removeItem(USER_KEY); } catch (e) {} _emit(); return Promise.resolve(name); },

  /* derived helpers */
  activeRound() { return state.rounds.find((r) => !r.foundAt) || null; },
  lastFoundPin() {
    // public "laatst gezien" reference for the active round = previous round's found pin
    const closed = state.rounds.filter((r) => r.foundAt).sort((a, b) => a.foundAt - b.foundAt);
    if (closed.length) return closed[closed.length - 1].foundPin;
    return state.genesisPin || null;
  },

  /* MUTATION: someone found Kim, then re-hid it (atomic) */
  foundAndRehide({ foundPin, foundByName, hiddenPin, hiderName, hints }) {
    const next = clone(state);
    const active = next.rounds.find((r) => !r.foundAt);
    const now = Date.now();
    if (active) {
      active.foundAt = now;
      active.foundByName = foundByName;
      active.foundPin = foundPin;
    }
    next.rounds.push({
      id: uid(),
      hiderName,
      hiddenAt: now,
      hiddenPin,
      hints: (hints || []).map((t) => ({ text: t })),
      foundAt: null, foundByName: null, foundPin: null,
      comments: [],
    });
    return _save(next);
  },

  /* hider tweaks the active round */
  moveHiddenPin(pin) {
    const next = clone(state);
    const active = next.rounds.find((r) => !r.foundAt);
    if (active) active.hiddenPin = pin;
    return _save(next);
  },
  updateHints(hints) {
    const next = clone(state);
    const active = next.rounds.find((r) => !r.foundAt);
    if (active) active.hints = hints.map((t) => (typeof t === "string" ? { text: t } : t));
    return _save(next);
  },

  addComment(roundId, { name, text }) {
    const next = clone(state);
    const r = next.rounds.find((x) => x.id === roundId);
    if (r) { r.comments = r.comments || []; r.comments.push({ id: uid(), name, text, at: Date.now() }); }
    return _save(next);
  },

  resetGame(seed) { return _save(clone(seed)); },
};
