// Web Push — fan out small, PUBLIC notifications to subscribed players.
// Security notes (see plan): VAPID private key is env-only; payloads carry no
// secrets (never the hidden pin); sends are fire-and-forget and can never break
// a state write; dead subscriptions are pruned on 404/410.
import webpush from "web-push";
import { allSubs, removeSub, getState, getKv, setKv } from "./db.js";

let configured = false;

export function configurePush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("push: VAPID keys not set — notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:admin@kim.lpd50.uk",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  configured = true;
  console.log("push: configured");
}

export function pushConfigured() {
  return configured;
}

// Fan a payload out to every stored subscription except `exceptName` (the actor
// who caused the event). Prunes subscriptions the push service has expired.
export async function sendToAll(payload, { exceptName } = {}) {
  if (!configured) return;
  const body = JSON.stringify(payload);
  const targets = allSubs().filter((s) => !exceptName || s.name !== exceptName);
  await Promise.all(targets.map(async ({ sub }) => {
    try {
      await webpush.sendNotification(sub, body, { TTL: 86400 });
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        removeSub(sub.endpoint);
      }
      // other errors are swallowed — a bad endpoint must not break the batch
    }
  }));
}

// Monthly hint unlocks since hiddenAt (ported from frontend kim-helpers).
function unlockedCount(hiddenAt, nowTs = Date.now()) {
  let n = 0;
  for (let i = 1; i <= 24; i++) {
    const d = new Date(hiddenAt); d.setMonth(d.getMonth() + i);
    if (d.getTime() <= nowTs) n = i; else break;
  }
  return n;
}

const activeRound = (doc) => (doc && doc.rounds ? doc.rounds.find((r) => !r.foundAt) : null);

// Diff prev→next and emit found / new-comment notifications. Public info only.
export async function notifyFromDiff(prev, next) {
  if (!configured || !prev || !next) return;

  // found: a round that was open in prev is now closed in next
  const prevById = new Map((prev.rounds || []).map((r) => [r.id, r]));
  for (const r of next.rounds || []) {
    const before = prevById.get(r.id);
    if (r.foundAt && r.foundByName && before && !before.foundAt) {
      await sendToAll(
        { title: "Kim is gevonden! 🎉", body: `${r.foundByName} heeft Kim gevonden. De jacht begint opnieuw!`, url: "/", tag: "found-" + r.id },
        { exceptName: r.foundByName },
      );
    }
    // new comment(s) on any round
    const beforeN = before ? (before.comments || []).length : 0;
    const afterComments = r.comments || [];
    if (afterComments.length > beforeN) {
      const c = afterComments[afterComments.length - 1];
      if (c) {
        const text = String(c.text || "").slice(0, 120);
        await sendToAll(
          { title: `${c.name} reageerde 💬`, body: text, url: "/", tag: "cmt-" + r.id },
          { exceptName: c.name },
        );
      }
    }
  }
}

// Hourly check: notify once when a new monthly hint unlocks on the active round.
export function startHintScheduler() {
  const tick = async () => {
    try {
      if (!configured) return;
      const doc = getState();
      const active = activeRound(doc);
      if (!active) return;
      const now = unlockedCount(active.hiddenAt);
      const key = "hint:" + active.id;
      const seen = parseInt(getKv(key) || "0", 10);
      if (now > seen) {
        setKv(key, now);
        // only notify for genuinely new unlocks (not the very first bootstrap)
        if (seen > 0 || now >= 1) {
          await sendToAll({ title: "Nieuwe hint vrijgekomen! 💡", body: `Hint ${now} is nu zichtbaar voor het hele huis.`, url: "/", tag: "hint-" + active.id + "-" + now });
        }
      }
    } catch (err) {
      console.error("push hint scheduler:", err.message);
    }
  };
  // seed the baseline silently on boot, then check hourly
  const doc = getState();
  const active = activeRound(doc);
  if (active) {
    const key = "hint:" + active.id;
    if (getKv(key) == null) setKv(key, unlockedCount(active.hiddenAt));
  }
  setInterval(tick, 60 * 60 * 1000);
}
