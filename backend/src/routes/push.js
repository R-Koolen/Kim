// GET /push/public-key, POST /push/subscribe, POST /push/unsubscribe.
// Security: players-only (name must be in the doc's players list), strict shape
// validation, size + total-count caps, and graceful 503 when push is unset.
import { Router } from "express";
import { addSub, removeSub, countSubs, getState } from "../db.js";
import { pushConfigured } from "../push.js";

export const pushRouter = Router();

const MAX_SUBS = 500;          // cap stored subscriptions (anti-bloat)
const MAX_SUB_BYTES = 2048;    // cap a single subscription's JSON size

const GUEST = "__gast__";      // mirror of the frontend guest sentinel

function isValidSubscription(sub) {
  if (!sub || typeof sub !== "object") return false;
  if (typeof sub.endpoint !== "string") return false;
  if (!sub.endpoint.startsWith("https://")) return false;
  if (!sub.keys || typeof sub.keys.p256dh !== "string" || typeof sub.keys.auth !== "string") return false;
  if (JSON.stringify(sub).length > MAX_SUB_BYTES) return false;
  return true;
}

function isPlayer(name) {
  if (!name || typeof name !== "string" || name === GUEST) return false;
  const doc = getState();
  return !!(doc && Array.isArray(doc.players) && doc.players.includes(name));
}

pushRouter.get("/push/public-key", (req, res) => {
  if (!pushConfigured()) return res.sendStatus(503);
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

pushRouter.post("/push/subscribe", (req, res) => {
  if (!pushConfigured()) return res.sendStatus(503);
  const { subscription, name } = req.body || {};
  if (!isValidSubscription(subscription)) return res.status(400).json({ error: "invalid subscription" });
  if (!isPlayer(name)) return res.status(400).json({ error: "not a player" });
  if (countSubs() >= MAX_SUBS) return res.status(429).json({ error: "subscription limit reached" });
  addSub(subscription.endpoint, JSON.stringify(subscription), name);
  res.sendStatus(201);
});

pushRouter.post("/push/unsubscribe", (req, res) => {
  const { endpoint } = req.body || {};
  if (typeof endpoint === "string") removeSub(endpoint);
  res.sendStatus(204);
});
