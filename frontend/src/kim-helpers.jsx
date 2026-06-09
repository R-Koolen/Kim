/* ============================================================================
 * kim-helpers.jsx — formatting, derived selectors, UI atoms, confetti
 * ========================================================================== */
import React from "react";
import { KIM_VB, KIM_ROOMS } from "./kim-rooms.js";

/* ---------- identity ---------- */
export const GUEST = "__gast__";              // reserved sentinel for observer mode
export const isGuest = (me) => me === GUEST;
export const ADMIN = "Robin";                 // honor-system admin (client-side gate)

const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MND_L = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAY = 86400000;

export const fmtDate = (ts) => { const d = new Date(ts); return `${d.getDate()} ${MND[d.getMonth()]}`; };
export const fmtDateLong = (ts) => { const d = new Date(ts); return `${d.getDate()} ${MND_L[d.getMonth()]} ${d.getFullYear()}`; };

export function daysBetween(a, b) { return Math.max(0, Math.round((b - a) / DAY)); }
export function durationText(ms) {
  const d = Math.round(ms / DAY);
  if (d <= 0) return "minder dan een dag";
  if (d === 1) return "1 dag";
  return d + " dagen";
}
export function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "zojuist";
  if (s < 3600) return Math.floor(s / 60) + " min geleden";
  if (s < 86400) return Math.floor(s / 3600) + " uur geleden";
  const d = Math.floor(s / 86400);
  return d === 1 ? "gisteren" : d + " dagen geleden";
}

// how many monthly hints have unlocked since hiddenAt
export function unlockedCount(hiddenAt, nowTs = Date.now()) {
  let n = 0;
  for (let i = 1; i <= 24; i++) {
    const d = new Date(hiddenAt); d.setMonth(d.getMonth() + i);
    if (d.getTime() <= nowTs) n = i; else break;
  }
  return n;
}
export function unlockDate(hiddenAt, oneBasedIndex) {
  const d = new Date(hiddenAt); d.setMonth(d.getMonth() + oneBasedIndex); return d.getTime();
}

// which room contains a normalised pin
export function roomAtPin(pin) {
  if (!pin) return null;
  const x = pin.x * KIM_VB.w, y = pin.y * KIM_VB.h;
  const hit = KIM_ROOMS.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h && r.kind !== "shaft" && r.kind !== "hall");
  return hit || null;
}
export function roomLabel(pin) {
  const r = roomAtPin(pin);
  if (!r) return "het huis";
  if (r.kind === "bed") return "kamer van " + r.name;
  return r.name.toLowerCase() === r.name ? r.name : r.name;
}

// leaderboard from closed rounds
export function leaderboard(rounds, players) {
  const closed = rounds.filter((r) => r.foundAt);
  const finds = {};
  closed.forEach((r) => { finds[r.foundByName] = (finds[r.foundByName] || 0) + 1; });
  const topFinder = Object.entries(finds).sort((a, b) => b[1] - a[1])[0] || null;
  let longest = null, fastest = null;
  closed.forEach((r) => {
    const dur = r.foundAt - r.hiddenAt;
    if (!longest || dur > longest.dur) longest = { name: r.hiderName, dur };
    if (!fastest || dur < fastest.dur) fastest = { name: r.foundByName, dur };
  });
  const perPlayer = {};
  (players || []).forEach((p) => { perPlayer[p] = { name: p, finds: finds[p] || 0, hidden: 0 }; });
  closed.forEach((r) => { if (perPlayer[r.hiderName]) perPlayer[r.hiderName].hidden++; });
  return { topFinder, longest, fastest, perPlayer: Object.values(perPlayer).sort((a, b) => b.finds - a.finds) };
}

/* ---------- avatars ---------- */
const AV_COLORS = ["#4f8cc9", "#3aa39a", "#6f8fd6", "#3f9d6b", "#7d8ad6", "#4aa3bd"];
export function avatarColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
export function Avatar({ name, size = 34, ring = false }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.42, boxShadow: ring ? "0 0 0 3px var(--card)" : "none" }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------- buttons ---------- */
export function Button({ children, onClick, variant = "primary", size = "md", full = false, disabled = false, style = {} }) {
  return (
    <button className={`btn btn--${variant} btn--${size}` + (full ? " btn--full" : "")} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

/* ---------- bottom sheet ---------- */
export function Sheet({ open, onClose, title, children, footer, dismissable = true }) {
  const [show, setShow] = React.useState(open);
  React.useEffect(() => { if (open) setShow(true); }, [open]);
  if (!show && !open) return null;
  return (
    <div className={"sheet-scrim" + (open ? " is-open" : "")} onClick={() => dismissable && onClose && onClose()} onTransitionEnd={() => { if (!open) setShow(false); }}>
      <div className={"sheet" + (open ? " is-open" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        {title && (
          <div className="sheet-head">
            <h3>{title}</h3>
            {dismissable && <button className="sheet-x" onClick={onClose} aria-label="Sluiten">✕</button>}
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- confetti ---------- */
export function fireConfetti() {
  const cv = document.createElement("canvas");
  cv.className = "confetti-canvas";
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  function size() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  size();
  const colors = document.documentElement.getAttribute("data-theme") === "propaganda"
    ? ["#c1121f", "#f2c14a", "#241d12", "#f7eed4", "#8a1015"]
    : ["#4f8cc9", "#3aa39a", "#3f9d6b", "#7d8ad6", "#ffd166", "#ef8aa8"];
  const N = 140;
  const parts = Array.from({ length: N }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 16,
    vy: Math.random() * -16 - 6,
    g: 0.5 + Math.random() * 0.3,
    s: 6 + Math.random() * 8,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    c: colors[(Math.random() * colors.length) | 0],
    life: 0,
  }));
  let t0 = null;
  function frame(t) {
    if (!t0) t0 = t;
    const el = t - t0;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.scale(dpr, dpr);
    parts.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr; p.life++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - el / 2600);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    ctx.restore();
    if (el < 2600) requestAnimationFrame(frame); else cv.remove();
  }
  requestAnimationFrame(frame);
}
