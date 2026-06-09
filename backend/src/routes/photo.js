// POST/GET/HEAD /api/photo/:key — README §4D. `key` is either `kim-photo`
// (Kim's poster on Home) or `bewijs-<roundId>` (per-round proof photo).
// The client already resizes to ~800px JPEG before upload, so the server
// just validates and stores the bytes as-is — no native image libs needed.
import { Router } from "express";
import multer from "multer";
import { existsSync, copyFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTO_DIR = resolve(process.env.PHOTO_DIR || "./data/photos");
mkdirSync(PHOTO_DIR, { recursive: true });

const KEY_RE = /^(kim-photo|bewijs-[a-zA-Z0-9_-]{1,40})$/;

function photoPath(key) {
  return KEY_RE.test(key) ? join(PHOTO_DIR, `${key}.jpg`) : null;
}

// Verify actual file bytes, not just the client-declared Content-Type header.
// A client can lie about mimetype; magic bytes cannot be faked without also
// making the file a valid image.
const MAGIC = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png":  [[0x89, 0x50, 0x4e, 0x47]],
  // WebP: "RIFF" at 0 + "WEBP" at 8
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};
function hasValidMagic(buffer, mimetype) {
  const seqs = MAGIC[mimetype];
  if (!seqs) return false;
  if (mimetype === "image/webp") {
    return seqs[0].every((b, i) => buffer[i] === b) &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  }
  return seqs[0].every((b, i) => buffer[i] === b);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

export const photoRouter = Router();

function servePhoto(req, res) {
  const filePath = photoPath(req.params.key);
  if (!filePath || !existsSync(filePath)) return res.sendStatus(404);
  res.set("Content-Type", "image/jpeg");
  res.set("Cache-Control", "no-cache");
  if (req.method === "HEAD") return res.end();
  res.sendFile(filePath);
}

photoRouter.get("/photo/:key", servePhoto);
photoRouter.head("/photo/:key", servePhoto);

photoRouter.post("/photo/:key", (req, res) => {
  const filePath = photoPath(req.params.key);
  if (!filePath) return res.status(400).json({ error: "invalid key" });

  upload.single("photo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: "upload rejected" });
    if (!req.file) return res.status(400).json({ error: "no photo" });
    if (!hasValidMagic(req.file.buffer, req.file.mimetype))
      return res.status(400).json({ error: "invalid image" });
    writeFileSync(filePath, req.file.buffer);
    res.json({ ok: true, url: `/api/photo/${req.params.key}` });
  });
});

// First-run bootstrap: seed Kim's "VERMIST" poster so the joke lands on a
// fresh deploy instead of showing an empty placeholder slot.
export function bootstrapSeedPhoto() {
  const target = photoPath("kim-photo");
  const seed = join(__dirname, "..", "..", "seed-assets", "kim-photo.jpg");
  if (target && !existsSync(target) && existsSync(seed)) {
    copyFileSync(seed, target);
  }
}
