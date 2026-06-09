/* ============================================================================
 * photo-slot.jsx — drop/click-to-upload image slot backed by the API
 * Replaces the design-tool's <image-slot> (which relied on window.omelette).
 * Persists via POST/GET /api/photo/:id — see backend/src/routes/photo.js.
 * ========================================================================== */
import React from "react";

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const MAX_DIM = 800; // resize client-side before upload, per README guidance

// Downscale + re-encode to a JPEG blob client-side so uploads stay small over
// the wire and the server can store them as-is (no native image deps needed).
function resizeToJpeg(file, maxDim = MAX_DIM) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

const RADIUS_CSS = { rect: "0", rounded: null, circle: "50%", pill: "999px" };

export function PhotoSlot({ id, shape = "rounded", radius = 12, fit = "cover", placeholder = "Sleep hier een foto, of tik om te kiezen", className = "", style = {} }) {
  const [version, setVersion] = React.useState(0);
  const [hasPhoto, setHasPhoto] = React.useState(null); // null = still checking
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/photo/${id}`, { method: "HEAD" })
      .then((r) => { if (!cancelled) setHasPhoto(r.ok); })
      .catch(() => { if (!cancelled) setHasPhoto(false); });
    return () => { cancelled = true; };
  }, [id, version]);

  async function upload(file) {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) { setError("Alleen PNG, JPEG of WebP."); return; }
    setError(""); setBusy(true);
    try {
      const blob = await resizeToJpeg(file);
      const body = new FormData();
      body.append("photo", blob, "photo.jpg");
      const r = await fetch(`/api/photo/${id}`, { method: "POST", body });
      if (!r.ok) throw new Error("upload failed");
      setVersion((v) => v + 1);
    } catch (e) {
      setError("Upload mislukt — probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  const radiusCss = radius != null && shape === "rounded" ? radius + "px" : RADIUS_CSS[shape];

  return (
    <div
      className={"photo-slot" + (dragOver ? " is-drag" : "") + (className ? " " + className : "")}
      style={{ ...style, borderRadius: radiusCss != null ? radiusCss : style.borderRadius }}
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) upload(f);
      }}
    >
      <input
        ref={inputRef} type="file" accept={ACCEPT.join(",")} style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) upload(f); e.target.value = ""; }}
      />
      {hasPhoto ? (
        <img src={`/api/photo/${id}?v=${version}`} alt="" className="photo-slot-img"
          style={{ objectFit: fit }} onError={() => setHasPhoto(false)} />
      ) : (
        <div className="photo-slot-empty">
          <span>{busy ? "Bezig met uploaden…" : placeholder}</span>
          {error && <span className="photo-slot-error">{error}</span>}
        </div>
      )}
    </div>
  );
}
