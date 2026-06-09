// Defense-in-depth for a small, open (no-auth), friends-only deployment:
// lock cross-origin access to the production domain, rate-limit writes
// against runaway clients/bots, and never log anything that could identify
// a player — the shared document and photos carry names, the logs shouldn't.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://kim.lpd50.uk";

export function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin === ALLOWED_ORIGIN) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET, PUT, POST, HEAD, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

// In-memory sliding-window limiter keyed by IP. Resets on restart and isn't
// shared across replicas — both fine trade-offs for a single-instance app
// used by a handful of housemates, and it keeps the dependency tree small.
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (hits.get(key) || []).filter((t) => t > windowStart);
    if (timestamps.length >= max) return res.sendStatus(429);
    timestamps.push(now);
    hits.set(key, timestamps);
    next();
  };
}

// Shape only, never substance: method, path, status, duration. No IPs, no
// bodies, no player names — those live inside the JSON document and photos.
export function quietLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
