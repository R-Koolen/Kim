/* ============================================================================
 * seed.js — initial document for a fresh install.
 * Used once: KimStore.init(SEED) only writes this when the server has no
 * document yet (see kim-store.js _load/_save). Real housemates, one starting
 * round with Robin as placeholder hider — no demo history (README §9).
 * ========================================================================== */

const genesisPin = { x: 0.7593, y: 0.3571 }; // woonkamer — public "start" reference

export const SEED = {
  players: ["Paul", "Koen", "Robin", "Alex", "Ole"],
  genesisPin,
  rounds: [
    {
      id: "r1",
      hiderName: "Robin",
      hiddenAt: Date.now(),
      hiddenPin: genesisPin, // placeholder — move it via "Geheim paneel" before play starts
      hints: [{ text: "Veel succes 😏" }],
      foundAt: null,
      foundByName: null,
      foundPin: null,
      comments: [],
    },
  ],
};
