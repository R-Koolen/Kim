/* ============================================================================
 * push.js — Web Push opt-in from the client.
 * Subscribes via the already-registered service worker (sw.js) and hands the
 * subscription to the backend (/api/push/subscribe). Permission is only ever
 * requested from a user gesture (the Meldingen button) — never on load.
 * ========================================================================== */

export function pushSupported() {
  return typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

// VAPID public key arrives base64url-encoded; PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function pushStatus() {
  if (!pushSupported()) return { supported: false, permission: "unsupported", subscribed: false };
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.ready;
    subscribed = !!(await reg.pushManager.getSubscription());
  } catch (e) { /* ignore */ }
  return { supported: true, permission: Notification.permission, subscribed };
}

// Request permission → fetch VAPID key → subscribe → register with backend.
// Returns { ok, permission, reason? }.
export async function enablePush(name) {
  if (!pushSupported()) return { ok: false, permission: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, permission };

  const keyRes = await fetch("/api/push/public-key");
  if (!keyRes.ok) return { ok: false, permission, reason: "push uitgeschakeld op de server" };
  const { key } = await keyRes.json();

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), name }),
  });
  if (!res.ok) return { ok: false, permission, reason: "aanmelden mislukt" };
  return { ok: true, permission };
}

export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch (e) { /* ignore */ }
}
