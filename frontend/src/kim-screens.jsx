/* ============================================================================
 * kim-screens.jsx — the five tab screens.
 * ========================================================================== */
import React from "react";
import { FloorPlan, ZoomPan } from "./kim-map.jsx";
import { PhotoSlot } from "./photo-slot.jsx";
import {
  Avatar, Button, daysBetween, durationText, fmtDate, leaderboard,
  roomLabel, unlockDate, unlockedCount,
} from "./kim-helpers.jsx";

/* ---------- HOME / STATUS ---------- */
export function HomeScreen({ state, me, active, lastFound, isHider, onFound, onOpenRound, onOpenHider, go }) {
  const days = daysBetween(active.hiddenAt, Date.now());
  const unlocked = unlockedCount(active.hiddenAt);
  const lastHint = unlocked > 0 ? active.hints[unlocked - 1] : null;
  const cmts = active.comments || [];
  return (
    <div className="screen">
      <div className="hero">
        <div className="hero-poster" style={{ height: "250px", width: "200px" }}>
          <div className="poster-tape" />
          <span className="poster-kicker">★ VERMIST ★</span>
          <PhotoSlot id="kim-photo" shape="rect" radius={0} fit="cover" placeholder="Foto van Kim" />
          <h1 className="poster-name">KIM</h1>
        </div>
        <div className="hero-count">
          <span className="muted">Kim is al</span>
          <div className="count-num">{days}<small>{days === 1 ? "dag" : "dagen"}</small></div>
          <span className="muted">zoek · verstopt door <b>{active.hiderName}</b> op {fmtDate(active.hiddenAt)}</span>
        </div>
      </div>

      <div className="stat-row">
        <button className="stat" onClick={() => go("hints")}><b>{unlocked}/{active.hints.length}</b><span>hints vrij</span></button>
        <button className="stat" onClick={() => go("rank")}><b>{state.players.length}</b><span>zoekers</span></button>
        <button className="stat" onClick={() => onOpenRound(active)}><b>{cmts.length}</b><span>reacties</span></button>
      </div>

      {isHider ?
      <div className="card hider-card">
          <div className="hider-top"><span className="hider-badge">🤫 Jij hebt Kim verstopt</span></div>
          <p className="muted">Alleen jij weet waar Kim ligt. Verplaats hem of pas de hints aan.</p>
          <div className="row-2"><Button variant="soft" full onClick={onOpenHider}>Geheim paneel</Button></div>
        </div> :

      <Button variant="primary" size="lg" full onClick={onFound} style={{ marginTop: 4 }}>🔍 Ik heb Kim gevonden!</Button>
      }

      <button className="card map-preview" onClick={() => go("map")}>
        <div className="card-head"><h3>Laatst gezien</h3><span className="link">Open kaart →</span></div>
        <FloorPlan pins={lastFound ? [{ ...lastFound, type: "found", label: "" }] : []} className="fp-mini" />
        <p className="muted small">Hier werd Kim het laatst gevonden — daarna verstopt {active.hiderName} hem opnieuw.</p>
      </button>

      <div className="card">
        <div className="card-head"><h3>Nieuwste hint</h3><span className="link" onClick={(e) => {e.stopPropagation();go("hints");}}>Alle hints →</span></div>
        {lastHint ?
        <div className="hint-bubble">“{lastHint.text}”<span className="muted small">Hint {unlocked} · vrijgekomen {fmtDate(unlockDate(active.hiddenAt, unlocked))}</span></div> :
        <p className="muted">De eerste hint komt vrij na 1 maand. Nog even puur op je speurneus vertrouwen. 🕵️</p>}
      </div>

      <button className="card" onClick={() => onOpenRound(active)}>
        <div className="card-head"><h3>Het huis zegt…</h3><span className="link">Reageer →</span></div>
        <div className="cmt-peek">
          {cmts.slice(-2).map((c) =>
          <div key={c.id} className="peek-row"><Avatar name={c.name} size={26} /><p><b>{c.name}</b> {c.text}</p></div>
          )}
          {!cmts.length && <p className="muted">Nog geen reacties.</p>}
        </div>
      </button>
    </div>);

}

/* ---------- MAP ---------- */
export function MapScreen({ active, lastFound, isHider }) {
  const unlocked = unlockedCount(active.hiddenAt);
  const pins = [];
  if (lastFound) pins.push({ ...lastFound, type: "found", label: "Laatst gezien" });
  if (isHider && active.hiddenPin) pins.push({ ...active.hiddenPin, type: "hidden", label: "Geheime plek" });
  return (
    <div className="screen">
      <div className="screen-title"><h2>Plattegrond</h2><p className="muted">2de verdieping</p></div>
      <div className="card map-card">
        <ZoomPan className="map-zoom" initialScale={1.5} maxScale={4}><FloorPlan pins={pins} className="fp-full" /></ZoomPan>
      </div>
      <p className="muted small center map-zoom-hint">Knijp, scroll of sleep om in te zoomen · dubbeltik om te resetten</p>
      <div className="legend">
        <span><i className="dot dot--found" /> Laatst gevonden (iedereen)</span>
        {isHider && <span><i className="dot dot--hidden" /> Jouw geheime plek</span>}
      </div>
      {!isHider &&
      <div className="card">
          <h3>Vrijgekomen hints</h3>
          {unlocked === 0 ?
        <p className="muted">Nog geen hints. De eerste komt vrij na 1 maand.</p> :
        active.hints.slice(0, unlocked).map((h, i) => <div key={i} className="hint-bubble sm">“{h.text}”</div>)}
        </div>
      }
      {isHider && <p className="muted center">Jij ziet de geheime plek omdat jij Kim hebt verstopt. 🤫</p>}
    </div>);

}

/* ---------- HINTS ---------- */
export function HintsScreen({ active }) {
  const days = daysBetween(active.hiddenAt, Date.now());
  const unlocked = unlockedCount(active.hiddenAt);
  const nextTs = unlocked < active.hints.length ? unlockDate(active.hiddenAt, unlocked + 1) : null;
  const daysToNext = nextTs ? Math.ceil((nextTs - Date.now()) / 86400000) : null;
  const prog = nextTs ? Math.min(1, (Date.now() - unlockDate(active.hiddenAt, unlocked)) / (nextTs - unlockDate(active.hiddenAt, unlocked))) : 1;
  return (
    <div className="screen">
      <div className="screen-title"><h2>Hints</h2><p className="muted">Elke maand komt er één vrij — verstopt door {active.hiderName}</p></div>
      <div className="card hint-prog">
        <div className="hp-top"><b>{unlocked} van {active.hints.length}</b> vrijgekomen</div>
        {nextTs ?
        <><div className="bar"><i style={{ width: prog * 100 + "%" }} /></div><span className="muted small">Volgende hint over {daysToNext} {daysToNext === 1 ? "dag" : "dagen"} · {fmtDate(nextTs)}</span></> :
        <span className="muted small">Alle hints zijn vrij — en Kim is nóg niet gevonden 😅</span>}
      </div>
      <div className="hint-list">
        {active.hints.map((h, i) => {
          const open = i < unlocked;
          const ts = unlockDate(active.hiddenAt, i + 1);
          const dleft = Math.ceil((ts - Date.now()) / 86400000);
          return (
            <div key={i} className={"hint-item" + (open ? " open" : " locked")}>
              <span className="hint-num">{i + 1}</span>
              {open ?
              <div><p>“{h.text}”</p><span className="muted small">Vrijgekomen {fmtDate(ts)}</span></div> :
              <div><p className="locked-text">🔒 Komt vrij over {dleft} {dleft === 1 ? "dag" : "dagen"}</p><span className="muted small">{fmtDate(ts)}</span></div>}
            </div>);

        })}
      </div>
    </div>);

}

/* ---------- HISTORY ---------- */
export function HistoryScreen({ state, onOpenRound }) {
  const active = state.rounds.find((r) => !r.foundAt);
  const closed = state.rounds.filter((r) => r.foundAt).sort((a, b) => b.foundAt - a.foundAt);
  return (
    <div className="screen">
      <div className="screen-title"><h2>Geschiedenis</h2><p className="muted">{closed.length} rondes gespeeld</p></div>
      {active &&
      <button className="card hist-row hist-live" onClick={() => onOpenRound(active)}>
          <span className="live-dot" />
          <div className="hist-main"><b>Nu zoekende…</b><span className="muted small">verstopt door {active.hiderName} · al {durationText(Date.now() - active.hiddenAt)}</span></div>
          <span className="chev">›</span>
        </button>
      }
      <div className="timeline">
        {closed.map((r) =>
        <button key={r.id} className="card hist-row" onClick={() => onOpenRound(r)}>
            <div className="hist-ava"><Avatar name={r.foundByName} size={38} ring /></div>
            <div className="hist-main">
              <b>{r.foundByName} vond Kim</b>
              <span className="muted small">in {roomLabel(r.foundPin)} · na {durationText(r.foundAt - r.hiddenAt)}</span>
            </div>
            <div className="hist-side"><span className="muted small">{fmtDate(r.foundAt)}</span><span className="chev">›</span></div>
          </button>
        )}
      </div>
    </div>);

}

/* ---------- LEADERBOARD ---------- */
export function LeaderboardScreen({ state }) {
  const lb = leaderboard(state.rounds, state.players);
  return (
    <div className="screen">
      <div className="screen-title"><h2>Ranglijst</h2><p className="muted">Roem voor het hele huis</p></div>
      <div className="hl-cards">
        <div className="card hl"><span className="hl-emoji">🏆</span><b>{lb.topFinder ? lb.topFinder[0] : "—"}</b><span className="muted small">meeste vondsten ({lb.topFinder ? lb.topFinder[1] : 0})</span></div>
        <div className="card hl"><span className="hl-emoji">⏳</span><b>{lb.longest ? lb.longest.name : "—"}</b><span className="muted small">langst verstopt ({lb.longest ? durationText(lb.longest.dur) : "—"})</span></div>
        <div className="card hl"><span className="hl-emoji">⚡</span><b>{lb.fastest ? lb.fastest.name : "—"}</b><span className="muted small">snelste vondst ({lb.fastest ? durationText(lb.fastest.dur) : "—"})</span></div>
      </div>
      <div className="card">
        <div className="lb-head"><span>Speler</span><span>Vondsten</span><span>Verstopt</span></div>
        {lb.perPlayer.map((p, i) =>
        <div key={p.name} className="lb-row">
            <span className="lb-name"><Avatar name={p.name} size={30} />{p.name}</span>
            <span className="lb-n">{p.finds}</span>
            <span className="lb-n muted">{p.hidden}</span>
          </div>
        )}
      </div>
    </div>);

}
