// kim-backend — README §4A: "the backend only has to store, serve, and
// stream one JSON blob" (+ photos, §4D). Always run behind the Caddy reverse
// proxy on kim.lpd50.uk; never expose this port directly to the internet.
import express from "express";
import helmet from "helmet";
import { stateRouter } from "./routes/state.js";
import { photoRouter, bootstrapSeedPhoto } from "./routes/photo.js";
import { pushRouter } from "./routes/push.js";
import { configurePush, startHintScheduler } from "./push.js";
import { cors, rateLimit, quietLogger } from "./security.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // safe: only reachable through the Caddy reverse proxy

app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(quietLogger);
app.use(cors);
app.use(express.json({ limit: "256kb" }));

const apiLimiter = rateLimit({ windowMs: 60_000, max: 120 });
const writeLimiter = rateLimit({ windowMs: 60_000, max: 30 });

app.use("/api", apiLimiter);
app.put("/api/state", writeLimiter);
app.post("/api/photo/:key", writeLimiter);
app.post("/api/push/subscribe", writeLimiter);

app.use("/api", stateRouter);
app.use("/api", photoRouter);
app.use("/api", pushRouter);

app.use((req, res) => res.sendStatus(404));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "invalid JSON" });
  }
  console.error(`${req.method} ${req.path} -> ${err.message}`);
  res.sendStatus(500);
});

bootstrapSeedPhoto();
configurePush();
startHintScheduler();

app.listen(PORT, () => console.log(`kim-backend listening on :${PORT}`));
