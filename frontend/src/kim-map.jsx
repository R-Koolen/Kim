/* ============================================================================
 * kim-map.jsx — stylised, interactive top-down floor plan
 * Renders rooms + furniture + pins. Click-to-drop returns a normalised {x,y}.
 * ========================================================================== */
import React from "react";
import { KIM_VB as VB, KIM_ROOMS as ROOMS } from "./kim-rooms.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ---- furniture: simple shapes only, drawn in a muted "ink" line ---------- */
function Furniture({ r }) {
  const ink = "var(--map-ink)";
  const fill = "var(--map-furn)";
  const els = [];
  const k = r.kind;
  if (k === "bed") {
    // bed against the far wall, headboard varies a little by room
    const bw = 96, bh = 60;
    const bx = r.x + r.w - bw - 16;
    const by = r.y + 18;
    els.push(<rect key="bd" x={bx} y={by} width={bw} height={bh} rx="8" fill={fill} stroke={ink} strokeWidth="2" />);
    els.push(<rect key="pl" x={bx + 8} y={by + 8} width={bw - 16} height={18} rx="5" fill="none" stroke={ink} strokeWidth="2" />);
    // desk
    els.push(<rect key="dk" x={r.x + 14} y={r.y + r.h - 40} width={70} height={24} rx="4" fill={fill} stroke={ink} strokeWidth="2" />);
  } else if (k === "living") {
    // kitchen counter strip (top) with hobs
    els.push(<rect key="kc" x={r.x + 14} y={r.y + 12} width={r.w - 28} height={36} rx="6" fill={fill} stroke={ink} strokeWidth="2" />);
    for (let i = 0; i < 4; i++)
      els.push(<circle key={"hob" + i} cx={r.x + 40 + i * 22} cy={r.y + 30} r="6" fill="none" stroke={ink} strokeWidth="1.6" />);
    els.push(<text key="kk" x={r.x + r.w - 24} y={r.y + 36} textAnchor="end" className="map-sub">keuken</text>);
    // couch
    els.push(<rect key="cf" x={r.x + 22} y={r.y + r.h - 78} width={130} height={48} rx="12" fill={fill} stroke={ink} strokeWidth="2" />);
    els.push(<line key="cf2" x1={r.x + 22} y1={r.y + r.h - 56} x2={r.x + 152} y2={r.y + r.h - 56} stroke={ink} strokeWidth="1.6" />);
    // table
    els.push(<circle key="tb" x={0} cx={r.x + 250} cy={r.y + r.h - 64} r="34" fill={fill} stroke={ink} strokeWidth="2" />);
  } else if (k === "bath") {
    els.push(<rect key="tub" x={r.x + 12} y={r.y + 12} width={42} height={r.h - 24} rx="10" fill={fill} stroke={ink} strokeWidth="2" />);
    els.push(<rect key="sk" x={r.x + r.w - 40} y={r.y + 14} width={28} height={22} rx="5" fill={fill} stroke={ink} strokeWidth="2" />);
  } else if (k === "wc") {
    els.push(<rect key="t1" x={r.x + r.w / 2 - 14} y={r.y + 18} width={28} height={20} rx="6" fill={fill} stroke={ink} strokeWidth="2" />);
    els.push(<rect key="t2" x={r.x + r.w / 2 - 18} y={r.y + 36} width={36} height={30} rx="12" fill={fill} stroke={ink} strokeWidth="2" />);
  } else if (k === "balcony") {
    for (let i = 1; i < 5; i++)
      els.push(<line key={"rl" + i} x1={r.x + (r.w * i) / 5} y1={r.y + 6} x2={r.x + (r.w * i) / 5} y2={r.y + r.h - 6} stroke={ink} strokeWidth="1.4" opacity="0.6" />);
    els.push(<circle key="plant" cx={r.x + r.w / 2} cy={r.y + r.h - 22} r="10" fill="none" stroke={ink} strokeWidth="2" />);
  } else if (k === "shaft") {
    els.push(<line key="x1" x1={r.x} y1={r.y} x2={r.x + r.w} y2={r.y + r.h} stroke={ink} strokeWidth="1.4" opacity="0.5" />);
    els.push(<line key="x2" x1={r.x + r.w} y1={r.y} x2={r.x} y2={r.y + r.h} stroke={ink} strokeWidth="1.4" opacity="0.5" />);
  }
  return <g>{els}</g>;
}

function RoomShape({ r, dim }) {
  const labelable = r.name && r.kind !== "shaft" && r.kind !== "hall";
  const cx = r.x + r.w / 2;
  const big = r.kind === "bed" || r.kind === "living";
  return (
    <g className={"room room--" + r.kind} opacity={dim ? 0.45 : 1}>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.kind === "hall" ? 8 : 14} />
      <Furniture r={r} />
      {labelable && (
        <g style={{ pointerEvents: "none" }}>
          <text x={cx} y={r.kind === "bed" ? r.y + r.h - 64 : r.y + r.h / 2 - (r.area ? 9 : 0)} textAnchor="middle" className={big ? "map-name map-name--lg" : "map-name"}>
            {r.name}
          </text>
          {r.area && (
            <text x={cx} y={r.kind === "bed" ? r.y + r.h - 44 : r.y + r.h / 2 + 12} textAnchor="middle" className="map-sub">
              {r.code ? r.code + " · " + r.area : r.area}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

function Pin({ pin, type }) {
  const x = pin.x * VB.w, y = pin.y * VB.h;
  const colors = {
    found:  { c: "var(--pin-found)", label: pin.label || "Laatst gezien hier" },
    hidden: { c: "var(--pin-hidden)", label: pin.label || "Geheime plek 🤫" },
    pending:{ c: "var(--pin-pending)", label: pin.label || "Hier" },
  }[type] || { c: "var(--pin-found)", label: pin.label };
  const showLabel = pin.label !== "";
  const lw = Math.max(70, (colors.label || "").length * 8.4 + 22);
  return (
    <g className={"pin pin--" + type} style={{ pointerEvents: "none" }}>
      {type === "hidden" && <circle cx={x} cy={y} r="26" fill={colors.c} opacity="0.16" />}
      {type === "pending" && <circle className="pin-pulse" cx={x} cy={y} r="20" fill={colors.c} opacity="0.25" />}
      {showLabel && (
        <g transform={`translate(${x}, ${y - 30})`}>
          <rect x={-lw / 2} y={-21} width={lw} height={24} rx="12" fill="var(--chip-bg)" stroke={colors.c} strokeWidth="2" />
          <text x="0" y="-4" textAnchor="middle" className="pin-label" fill="var(--chip-fg)">{colors.label}</text>
        </g>
      )}
      <circle cx={x} cy={y + 2} rx="0" r="4" fill="rgba(0,0,0,.18)" />
      <circle cx={x} cy={y} r="11" fill={colors.c} stroke="#fff" strokeWidth="3"
        strokeDasharray={type === "hidden" ? "4 3" : "0"} />
      <circle cx={x} cy={y} r="3.5" fill="#fff" />
    </g>
  );
}

export function FloorPlan({ pins = [], onPick = null, pending = null, dimUnpicked = false, className = "" }) {
  const svgRef = React.useRef(null);
  const interactive = !!onPick;

  function pick(e) {
    if (!interactive) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    const touch = e.touches && e.touches[0];
    pt.x = touch ? touch.clientX : e.clientX;
    pt.y = touch ? touch.clientY : e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    onPick({ x: clamp01(loc.x / VB.w), y: clamp01(loc.y / VB.h) });
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className={"floorplan " + (interactive ? "floorplan--pick " : "") + className}
      preserveAspectRatio="xMidYMid meet"
      onClick={pick}
    >
      {/* outer shell */}
      <rect x="18" y="18" width={VB.w - 36} height={VB.h - 36} rx="20" className="map-shell" />
      {ROOMS.map((r) => <RoomShape key={r.id} r={r} dim={false} />)}
      {/* doorway hint between entree and corridor */}
      <line x1="474" y1="256" x2="474" y2="268" stroke="var(--map-bg)" strokeWidth="10" />
      {pins.map((p, i) => <Pin key={i} pin={p} type={p.type} />)}
      {pending && <Pin pin={pending} type="pending" />}
    </svg>
  );
}

/* ---- pinch / scroll / drag zoom wrapper (keeps labels upright) ----------- */
export function ZoomPan({ children, minScale = 1, maxScale = 4, initialScale = 1, className = "" }) {
  const wrapRef = React.useRef(null);
  const [tf, setTf] = React.useState({ s: initialScale, x: 0, y: 0 });
  const tfRef = React.useRef(tf); tfRef.current = tf;
  const pts = React.useRef(new Map());
  const last = React.useRef(null);

  function clampT(s, x, y) {
    s = Math.max(minScale, Math.min(maxScale, s));
    const el = wrapRef.current;
    const w = el ? el.clientWidth : 0, h = el ? el.clientHeight : 0;
    const mx = ((s - 1) * w) / 2, my = ((s - 1) * h) / 2;
    return { s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }
  function relCenter(cx, cy) {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) };
  }
  function zoomAt(factor, ox, oy) {
    const cur = tfRef.current;
    const ns = Math.max(minScale, Math.min(maxScale, cur.s * factor));
    const k = ns / cur.s;
    setTf(clampT(ns, ox - (ox - cur.x) * k, oy - (oy - cur.y) * k));
  }
  const reset = () => setTf({ s: 1, x: 0, y: 0 });

  const onPointerDown = (e) => {
    wrapRef.current.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 1) last.current = { mode: "pan", x: e.clientX, y: e.clientY };
    else if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      last.current = { mode: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  };
  const onPointerMove = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size >= 2 && last.current && last.current.mode === "pinch") {
      const [a, b] = [...pts.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = relCenter((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(dist / (last.current.dist || dist), mid.x, mid.y);
      last.current.dist = dist;
    } else if (pts.current.size === 1 && last.current && last.current.mode === "pan") {
      const cur = tfRef.current;
      if (cur.s > 1) {
        setTf(clampT(cur.s, cur.x + (e.clientX - last.current.x), cur.y + (e.clientY - last.current.y)));
      }
      last.current.x = e.clientX; last.current.y = e.clientY;
    }
  };
  const onPointerUp = (e) => {
    pts.current.delete(e.pointerId);
    const left = [...pts.current.values()];
    last.current = left.length === 1 ? { mode: "pan", x: left[0].x, y: left[0].y } : null;
  };

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (ev) => {
      ev.preventDefault();
      const c = relCenter(ev.clientX, ev.clientY);
      zoomAt(ev.deltaY < 0 ? 1.14 : 1 / 1.14, c.x, c.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div ref={wrapRef} className={"zoompan " + className}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onDoubleClick={reset}>
      <div className="zoompan-inner" style={{ transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.s})` }}>
        {children}
      </div>
      {tf.s > 1.02 &&
        <button className="zoom-reset" onClick={(e) => { e.stopPropagation(); reset(); }}>Uitzoomen</button>}
    </div>
  );
}
