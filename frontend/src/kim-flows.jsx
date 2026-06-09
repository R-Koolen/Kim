/* ============================================================================
 * kim-flows.jsx — modals & flows: identity, found-wizard, hider panel,
 * round detail, comment feed.
 * ========================================================================== */
import React from "react";
import { FloorPlan } from "./kim-map.jsx";
import { PhotoSlot } from "./photo-slot.jsx";
import { Sheet, Button, Avatar, roomLabel, fmtDateLong, durationText, timeAgo, GUEST, isGuest } from "./kim-helpers.jsx";

/* ---------- identity ---------- */
export function IdentitySheet({ open, players, me, onPick, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} dismissable={!!me} title="Wie ben jij?">
      <p className="muted" style={{ marginTop: 2 }}>Geen wachtwoord nodig — kies je naam zodat we weten wie wat doet.</p>
      <div className="id-grid">
        {players.map((p) => (
          <button key={p} className={"id-chip" + (p === me ? " is-me" : "")} onClick={() => onPick(p)}>
            <Avatar name={p} size={40} />
            <span>{p}</span>
          </button>
        ))}
      </div>
      <button className={"id-chip id-guest" + (isGuest(me) ? " is-me" : "")} style={{ marginTop: 10, width: "100%", flexDirection: "row", gap: 10, justifyContent: "center" }} onClick={() => onPick(GUEST)}>
        <span style={{ fontSize: 26 }}>👀</span>
        <span style={{ textAlign: "left" }}>Kijk mee als gast<br /><small className="muted">alleen meekijken — niet zoeken of verstoppen</small></span>
      </button>
    </Sheet>
  );
}

/* ---------- hint editor (shared) ---------- */
export function HintEditor({ hints, setHints }) {
  const update = (i, v) => setHints(hints.map((h, j) => (j === i ? v : h)));
  return (
    <div className="hint-editor">
      <p className="muted">Schrijf hints van makkelijk → moeilijk. Elke maand komt er één vrij voor het hele huis.</p>
      {hints.map((h, i) => (
        <div key={i} className="hint-edit-row">
          <span className="hint-num">{i + 1}</span>
          <input className="field" placeholder={`Hint ${i + 1} (komt vrij na ${i + 1} ${i === 0 ? "maand" : "maanden"})`} value={h} onChange={(e) => update(i, e.target.value)} />
          {hints.length > 1 && <button className="mini-x" onClick={() => setHints(hints.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      {hints.length < 6 && <button className="add-hint" onClick={() => setHints([...hints, ""])}>＋ Hint toevoegen</button>}
    </div>
  );
}

/* ---------- FOUND wizard ---------- */
export function FoundFlow({ open, me, lastFound, proofRoundId, onClose, onDone }) {
  const [step, setStep] = React.useState(0);
  const [foundPin, setFoundPin] = React.useState(null);
  const [hiddenPin, setHiddenPin] = React.useState(null);
  const [hints, setHints] = React.useState([""]);
  React.useEffect(() => { if (open) { setStep(0); setFoundPin(null); setHiddenPin(null); setHints([""]); } }, [open]);
  const proofId = "bewijs-" + (proofRoundId || "draft");

  const steps = ["Vondst", "Bewijs", "Verstop", "Hints", "Klaar"];
  const cleanHints = hints.map((h) => h.trim()).filter(Boolean);

  function finish() {
    onDone({ foundPin, foundByName: me, hiddenPin, hiderName: me, hints: cleanHints.length ? cleanHints : ["Veel succes 😏"] });
  }

  const foot = (
    <div className="wiz-foot">
      {step > 0 && step < 4 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Terug</Button>}
      {step === 0 && <Button full onClick={() => setStep(1)} disabled={!foundPin}>Volgende</Button>}
      {step === 1 && <Button full onClick={() => setStep(2)}>Volgende</Button>}
      {step === 2 && <Button full onClick={() => setStep(3)} disabled={!hiddenPin}>Volgende</Button>}
      {step === 3 && <Button full onClick={() => setStep(4)}>Bevestig</Button>}
      {step === 4 && <Button full onClick={finish}>De jacht begint! 🎉</Button>}
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={"Kim gevonden!"} footer={foot}>
      <div className="wiz-steps">
        {steps.map((s, i) => <span key={s} className={"wiz-dot" + (i <= step ? " on" : "")}>{s}</span>)}
      </div>

      {step === 0 && (
        <div className="wiz-pane">
          <h4>Waar lag Kim? 📍</h4>
          <p className="muted">Tik op de exacte plek waar je Kim vond. Dit is zichtbaar voor iedereen.</p>
          <FloorPlan onPick={setFoundPin} pending={foundPin} pins={lastFound ? [{ ...lastFound, type: "found", label: "" }] : []} className="fp-pick" />
        </div>
      )}
      {step === 1 && (
        <div className="wiz-pane">
          <h4>Bewijsfoto 📸</h4>
          <p className="muted">Maak of sleep een foto van de plek waar Kim verstopt zat. Optioneel — maar legendarisch voor de geschiedenis.</p>
          <PhotoSlot id={proofId} shape="rounded" radius={14} fit="cover" placeholder="Sleep hier je bewijsfoto" style={{ width: "100%", height: "230px", display: "block" }} />
        </div>
      )}
      {step === 2 && (
        <div className="wiz-pane">
          <h4>Nu verstop jij Kim 🤫</h4>
          <p className="muted">Tik op een nieuwe geheime plek. Alleen jij ziet deze — de rest moet zoeken!</p>
          <FloorPlan onPick={setHiddenPin} pending={hiddenPin} className="fp-pick" />
        </div>
      )}
      {step === 3 && (
        <div className="wiz-pane">
          <h4>Laat hints achter</h4>
          <HintEditor hints={hints} setHints={setHints} />
        </div>
      )}
      {step === 4 && (
        <div className="wiz-pane wiz-done">
          <div className="big-emoji">🙈</div>
          <h4>Helemaal klaar, {me}!</h4>
          <p className="muted">Kim is opnieuw verstopt. De teller staat weer op 0 en je hints komen één per maand vrij.</p>
          <div className="done-recap">
            <div><span className="muted">Gevonden in</span><b>{roomLabel(foundPin)}</b></div>
            <div><span className="muted">Hints klaar</span><b>{cleanHints.length || 1}</b></div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- hider panel ---------- */
export function HiderPanel({ open, active, onClose, onMovePin, onSaveHints }) {
  const [tab, setTab] = React.useState("plek");
  const [pin, setPin] = React.useState(active ? active.hiddenPin : null);
  const [hints, setHints] = React.useState(active ? active.hints.map((h) => h.text) : [""]);
  React.useEffect(() => { if (open && active) { setPin(active.hiddenPin); setHints(active.hints.map((h) => h.text)); setTab("plek"); } }, [open, active]);
  if (!active) return null;

  const foot = tab === "plek"
    ? <Button full onClick={() => { onMovePin(pin); onClose(); }}>Geheime plek opslaan</Button>
    : <Button full onClick={() => { onSaveHints(hints.map((h) => h.trim()).filter(Boolean)); onClose(); }}>Hints opslaan</Button>;

  return (
    <Sheet open={open} onClose={onClose} title="Jouw geheime paneel 🤫" footer={foot}>
      <div className="seg">
        <button className={tab === "plek" ? "on" : ""} onClick={() => setTab("plek")}>Verplaats Kim</button>
        <button className={tab === "hints" ? "on" : ""} onClick={() => setTab("hints")}>Bewerk hints</button>
      </div>
      {tab === "plek" && (
        <div className="wiz-pane">
          <p className="muted">Kim verplaatst? Tik op de nieuwe plek. Niemand anders ziet dit.</p>
          <FloorPlan onPick={setPin} pending={pin} className="fp-pick" />
        </div>
      )}
      {tab === "hints" && (
        <div className="wiz-pane"><HintEditor hints={hints} setHints={setHints} /></div>
      )}
    </Sheet>
  );
}

/* ---------- comments ---------- */
export function CommentFeed({ comments }) {
  if (!comments || !comments.length) return <p className="muted" style={{ textAlign: "center", padding: "8px 0" }}>Nog geen reacties. Wees de eerste! 💬</p>;
  return (
    <div className="cmt-feed">
      {comments.slice().sort((a, b) => a.at - b.at).map((c) => (
        <div key={c.id} className="cmt">
          <Avatar name={c.name} size={30} />
          <div className="cmt-body">
            <div className="cmt-meta"><b>{c.name}</b><span className="muted">{timeAgo(c.at)}</span></div>
            <p>{c.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
export function CommentBar({ onSend, me, onNeedId }) {
  const [v, setV] = React.useState("");
  function send() { if (!v.trim()) return; if (!me) { onNeedId(); return; } onSend(v.trim()); setV(""); }
  return (
    <div className="cmt-bar">
      <input className="field" placeholder={me ? "Reageer…" : "Kies eerst je naam…"} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
      <button className="cmt-send" onClick={send} disabled={!v.trim()}>➤</button>
    </div>
  );
}

/* ---------- round detail ---------- */
export function RoundDetailSheet({ open, round, me, onClose, onComment, onNeedId, canComment = true, canDelete = false, onDelete }) {
  const [confirmDel, setConfirmDel] = React.useState(false);
  React.useEffect(() => { setConfirmDel(false); }, [round && round.id, open]);
  if (!round) return null;
  const active = !round.foundAt;
  const pins = [];
  if (round.foundPin) pins.push({ ...round.foundPin, type: "found", label: "Gevonden hier" });
  if (round.hiddenPin && (!active)) pins.push({ ...round.hiddenPin, type: "hidden", label: "Verstopt hier" });
  const dur = round.foundAt ? round.foundAt - round.hiddenAt : Date.now() - round.hiddenAt;
  return (
    <Sheet open={open} onClose={onClose} title={active ? "Lopende ronde" : "Ronde-overzicht"}>
      <div className="rd-head">
        <div className="rd-people">
          <div><Avatar name={round.hiderName} size={32} /><span>{round.hiderName}<small>verstopte</small></span></div>
          <span className="rd-arrow">→</span>
          {round.foundByName
            ? <div><Avatar name={round.foundByName} size={32} /><span>{round.foundByName}<small>vond</small></span></div>
            : <div className="rd-open"><span className="rd-q">?</span><span>nog<small>zoekende…</small></span></div>}
        </div>
        <div className="rd-dur">{active ? "al " : ""}{durationText(dur)}</div>
      </div>
      <FloorPlan pins={pins} className="fp-detail" />
      <div className="rd-meta">
        <span>Verstopt {fmtDateLong(round.hiddenAt)}</span>
        {round.foundAt && <span>Gevonden {fmtDateLong(round.foundAt)} in <b>{roomLabel(round.foundPin)}</b></span>}
      </div>
      {!active && (
        <React.Fragment>
          <h4 className="rd-sub">Bewijsfoto 📸</h4>
          <PhotoSlot id={"bewijs-" + round.id} shape="rounded" radius={14} fit="cover" placeholder="Waar zat Kim? Sleep hier de bewijsfoto" style={{ width: "100%", height: "210px", display: "block" }} />
        </React.Fragment>
      )}
      <h4 className="rd-sub">Reacties</h4>
      <CommentFeed comments={round.comments} />
      {canComment
        ? <CommentBar me={me} onNeedId={onNeedId} onSend={(t) => onComment(round.id, t)} />
        : <p className="muted" style={{ textAlign: "center", padding: "8px 0" }}>Gasten kunnen niet reageren.</p>}

      {canDelete && !active && (
        <div className="rd-danger" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          {confirmDel ? (
            <React.Fragment>
              <p className="muted" style={{ marginTop: 0 }}>Ronde definitief verwijderen?</p>
              <div className="row-2" style={{ display: "flex", gap: 8 }}>
                <Button variant="ghost" full style={{ color: "var(--accent)" }} onClick={() => onDelete && onDelete(round.id)}>Verwijder</Button>
                <Button variant="ghost" full onClick={() => setConfirmDel(false)}>Annuleer</Button>
              </div>
            </React.Fragment>
          ) : (
            <Button variant="ghost" full style={{ color: "var(--accent)" }} onClick={() => setConfirmDel(true)}>🗑 Verwijder ronde</Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
