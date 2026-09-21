// Rule-based defender. Watches mission-controller's live event stream for
// this session and raises detection-event when breaker-toggle activity
// looks noisy — a simplified stand-in for a real log-tailing/SIEM pipeline
// (documented simplification: no real LDAP/WireGuard log ingestion in v1).
const WebSocket = require("ws");

const CONTROLLER_URL = process.env.CONTROLLER_URL || "http://mission-controller:4000";
const SESSION_ID = process.env.SESSION_ID || "";
const WS_URL = CONTROLLER_URL.replace(/^http/, "ws") + `/sessions/${SESSION_ID}/ws`;
const NOISY_TOGGLE_THRESHOLD = 3;

if (!SESSION_ID) {
  console.log("[defender] no SESSION_ID set — idling");
} else {
  let lastOpenCount = 0;
  let toggleCount = 0;

  function connect() {
    const ws = new WebSocket(WS_URL);
    ws.on("open", () => console.log("[defender] connected to mission-controller"));
    ws.on("message", (raw) => {
      const state = JSON.parse(raw.toString());
      const openCount = state.grid.substations
        .flatMap((s) => s.breakers)
        .filter((b) => b.state === "OPEN").length;
      if (openCount !== lastOpenCount) {
        toggleCount++;
        lastOpenCount = openCount;
        if (toggleCount % NOISY_TOGGLE_THRESHOLD === 0) {
          console.log(`[defender] noisy activity detected (${toggleCount} toggles) — raising alert`);
          fetch(`${CONTROLLER_URL}/sessions/${SESSION_ID}/events`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "detection-event" }),
          }).catch(() => {});
        }
      }
    });
    ws.on("close", () => setTimeout(connect, 2000));
    ws.on("error", () => ws.close());
  }
  connect();
}
