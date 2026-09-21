// Synthetic SCADA/HMI. Reachable only on the `control` network — a player
// must have pivoted through the VPN + jump host to reach it. Session
// linkage is injected by mission-controller at lab-launch time (fictional
// simplification: no in-fiction "session discovery" step for v1).
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 80;

app.use(express.static(path.join(__dirname, "public")));

app.get("/config", (req, res) => {
  res.json({
    controllerUrl: process.env.CONTROLLER_URL || "http://mission-controller:4000",
    controllerPublicUrl: process.env.CONTROLLER_PUBLIC_URL || "http://localhost:4000",
    sessionId: process.env.SESSION_ID || "",
  });
});

app.listen(PORT, () => console.log(`hmi listening on ${PORT}`));
