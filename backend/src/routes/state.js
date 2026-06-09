// GET/PUT /api/state + GET /api/stream — the entire game lives in one JSON
// document (README §3); the backend's job is to store, serve, and stream it.
import { Router } from "express";
import { getState, setState } from "../db.js";
import { subscribe, publish } from "../bus.js";

export const stateRouter = Router();

const MAX_PLAYERS = 50;
const MAX_ROUNDS = 5000;

// Shape check, not a full schema validation — guards against garbage
// overwriting the shared document, while leaving room shapes flexible.
function isValidDoc(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return false;
  const { players, genesisPin, rounds } = doc;
  if (!Array.isArray(players) || players.length > MAX_PLAYERS) return false;
  if (!players.every((p) => typeof p === "string" && p.length > 0 && p.length <= 60)) return false;
  if (!genesisPin || typeof genesisPin.x !== "number" || typeof genesisPin.y !== "number") return false;
  if (!Array.isArray(rounds) || rounds.length > MAX_ROUNDS) return false;
  return true;
}

stateRouter.get("/state", (req, res) => {
  const doc = getState();
  if (!doc) return res.sendStatus(404);
  res.json(doc);
});

stateRouter.put("/state", (req, res) => {
  if (!isValidDoc(req.body)) return res.status(400).json({ error: "invalid document" });
  const doc = setState(req.body);
  publish(doc);
  res.json(doc);
});

stateRouter.get("/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("\n");

  const send = (doc) => res.write(`data: ${JSON.stringify(doc)}\n\n`);

  const current = getState();
  if (current) send(current);

  const unsubscribe = subscribe(send);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});
