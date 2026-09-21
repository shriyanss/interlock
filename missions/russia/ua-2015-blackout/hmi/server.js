// Synthetic SCADA/HMI. Reachable only on the `control` network — a player
// must have pivoted through the VPN + jump host to reach it. Session
// linkage is injected by mission-controller at lab-launch time (fictional
// simplification: no in-fiction "session discovery" step for v1).
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 80;
const CONTROLLER_URL = process.env.CONTROLLER_URL || "http://mission-controller:4000";
const SESSION_ID = process.env.SESSION_ID || "";

app.use(express.static(path.join(__dirname, "public")));

// Guided-mode hook: reaching the HMI at all means the player pivoted all
// the way to the control network — reported once, the first time /config
// is fetched, rather than a human describing "I'm adjacent to OT" over chat.
let topologyReported = false;
app.get("/config", (req, res) => {
  if (!topologyReported && SESSION_ID) {
    topologyReported = true;
    fetch(`${CONTROLLER_URL}/sessions/${SESSION_ID}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "ot-topology-discovered" }),
    }).catch(() => {});
  }

  res.json({
    controllerUrl: CONTROLLER_URL,
    controllerPublicUrl: process.env.CONTROLLER_PUBLIC_URL || "http://localhost:4000",
    sessionId: SESSION_ID,
  });
});

app.listen(PORT, () => console.log(`hmi listening on ${PORT}`));
