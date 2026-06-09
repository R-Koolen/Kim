/* ============================================================================
 * app.jsx — entry point. Mounts <App>, owns tab/sheet navigation and the
 * KimStore subscription. Production build: theme is fixed to "propaganda",
 * no design-time Tweaks panel, no "Speel als" identity override, no in-app reset.
 * ========================================================================== */
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { KimStore } from "./kim-store.js";
import { SEED } from "./seed.js";
import { Avatar, fireConfetti, GUEST, isGuest, ADMIN } from "./kim-helpers.jsx";
import { IdentitySheet, FoundFlow, HiderPanel, RoundDetailSheet } from "./kim-flows.jsx";
import { HomeScreen, MapScreen, HintsScreen, HistoryScreen, LeaderboardScreen } from "./kim-screens.jsx";

const { useState, useEffect } = React;

const TABS = [
  { id: "home", ic: "🏠", label: "LPD" },
  { id: "map", ic: "🗺️", label: "Kaart" },
  { id: "hints", ic: "💡", label: "Hints" },
  { id: "history", ic: "🕘", label: "Historie" },
  { id: "rank", ic: "🏆", label: "Ranglijst" },
];

function App() {
  const [state, setState] = useState(() => KimStore.getState());
  const [me, setMe] = useState(() => KimStore.getUser());
  const [tab, setTab] = useState("home");
  const [idOpen, setIdOpen] = useState(false);
  const [foundOpen, setFoundOpen] = useState(false);
  const [hiderOpen, setHiderOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    const un = KimStore.subscribe((s) => { setState({ ...s }); setMe(KimStore.getUser()); });
    if (!KimStore.getUser()) setIdOpen(true);
    return un;
  }, []);

  if (!state) return <div className="boot-splash">Laden…</div>;

  const active = state.rounds.find((r) => !r.foundAt) || state.rounds[state.rounds.length - 1];
  const lastFound = KimStore.lastFoundPin();
  const guest = isGuest(me);
  const isHider = !!(me && active && me === active.hiderName);
  const detailRound = detailId ? state.rounds.find((r) => r.id === detailId) : null;

  function pickIdentity(name) { KimStore.setUser(name).then(() => { setMe(name); setIdOpen(false); }); }
  function startFound() { if (guest) return; if (!me) { setIdOpen(true); return; } setFoundOpen(true); }
  function completeFound(payload) {
    KimStore.foundAndRehide(payload).then(() => {
      setFoundOpen(false); setTab("home");
      fireConfetti();
    });
  }
  const go = (id) => setTab(id);

  function renderScreen() {
    switch (tab) {
      case "map": return <MapScreen active={active} lastFound={lastFound} isHider={isHider} />;
      case "hints": return <HintsScreen active={active} />;
      case "history": return <HistoryScreen state={state} onOpenRound={(r) => setDetailId(r.id)} />;
      case "rank": return <LeaderboardScreen state={state} />;
      default: return <HomeScreen state={state} me={me} active={active} lastFound={lastFound} isHider={isHider} isGuest={guest}
        onFound={startFound} onOpenRound={(r) => setDetailId(r.id)} onOpenHider={() => setHiderOpen(true)} go={go} />;
    }
  }

  return (
    <React.Fragment>
      <div className="phone" id="phone">
        <header className="topbar">
          <h1>Waar is Kim?</h1>
          <button className="idchip" onClick={() => setIdOpen(true)}>
            {me ? (guest ? <React.Fragment><span style={{ fontSize: 20 }}>👀</span>Gast</React.Fragment> : <React.Fragment><Avatar name={me} size={26} />{me}</React.Fragment>) : "Kies je naam"}
          </button>
        </header>
        <div className="scroll" key={tab}>{renderScreen()}</div>
        <nav className="tabbar">
          {TABS.map((tb) => (
            <button key={tb.id} className={"tab" + (tab === tb.id ? " on" : "")} onClick={() => setTab(tb.id)}>
              <span className="ic">{tb.ic}</span>{tb.label}
            </button>
          ))}
        </nav>
      </div>

      <IdentitySheet open={idOpen} players={state.players} me={me} onPick={pickIdentity} onClose={() => me && setIdOpen(false)} />
      <FoundFlow open={foundOpen} me={me} lastFound={lastFound} proofRoundId={active && active.id} onClose={() => setFoundOpen(false)} onDone={completeFound} />
      <HiderPanel open={hiderOpen} active={active} onClose={() => setHiderOpen(false)}
        onMovePin={(p) => KimStore.moveHiddenPin(p)} onSaveHints={(h) => KimStore.updateHints(h)} />
      <RoundDetailSheet open={!!detailRound} round={detailRound} me={me} onClose={() => setDetailId(null)}
        onComment={(rid, text) => KimStore.addComment(rid, { name: me, text })} onNeedId={() => setIdOpen(true)}
        canComment={!!me && !guest} canDelete={me === ADMIN}
        onDelete={(rid) => KimStore.removeRound(rid).then(() => setDetailId(null))} />
    </React.Fragment>
  );
}

function Boot() {
  const [ready, setReady] = useState(false);
  useEffect(() => { KimStore.init(SEED).then(() => setReady(true)); }, []);
  return ready ? <App /> : <div className="boot-splash">Laden…</div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Boot />);

// Register the service worker (install/A2HS + offline shell). Done from the
// bundle rather than an inline <script> so it isn't blocked by the CSP.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
