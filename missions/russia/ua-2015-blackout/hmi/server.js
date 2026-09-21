// Synthetic SCADA/HMI. Reachable only on the `control` network — a player
// must have pivoted through the VPN + jump host to reach it. Session
// linkage is injected by mission-controller at lab-launch time (fictional
// simplification: no in-fiction "session discovery" step for v1).
//
// This is now a real protocol GATEWAY, not a REST passthrough: button
// clicks are translated into real Modbus TCP (rtu-a) or IEC 60870-5-104
// (rtu-b) commands. A player who reaches `substations` directly (via
// engineering-workstation) can bypass this web UI entirely and speak
// those protocols themselves — this gateway is the *intended* path, not
// the *only* path, matching real OT architecture.
const express = require("express");
const path = require("path");
const net = require("net");
const { execFile } = require("child_process");
const Modbus = require("jsmodbus");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 80;
const CONTROLLER_URL = process.env.CONTROLLER_URL || "http://mission-controller:4000";
const SESSION_ID = process.env.SESSION_ID || "";
const RTU_A_HOST = process.env.RTU_A_HOST || "rtu-a";
const RTU_A_PORT = Number(process.env.RTU_A_PORT || 502);
const RTU_B_HOST = process.env.RTU_B_HOST || "rtu-b";
const RTU_B_PORT = process.env.RTU_B_PORT || "2404";

// tag -> which RTU/protocol/address actually carries that point. The HMI
// never exposes this mapping to the browser — only mission-controller's
// substationId/breakerId/state, keyed by the same obfuscated tag.
const COMMAND_MAP = {
  "FDR-7734": { protocol: "modbus", address: 0 },
  "FDR-2201": { protocol: "modbus", address: 1 },
  "FDR-5510": { protocol: "modbus", address: 2 },
  "FDR-8842": { protocol: "iec104", address: 1 },
  "FDR-3319": { protocol: "iec104", address: 2 },
  "FDR-6675": { protocol: "iec104", address: 3 },
};

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

  res.json({ sessionId: SESSION_ID });
});

// The obfuscated point list a player actually sees — name/criticality/decoy
// are stripped server-side so they can't just read the network response
// and skip the point-list artifact entirely.
app.get("/points", async (req, res) => {
  try {
    const gridRes = await fetch(`${CONTROLLER_URL}/sessions/${SESSION_ID}/grid`);
    if (!gridRes.ok) return res.status(502).json({ error: "grid unavailable" });
    const grid = await gridRes.json();
    const points = grid.substations.flatMap((s) =>
      s.breakers.map((b) => ({ substationId: s.id, breakerId: b.id, tag: b.tag, state: b.state })),
    );
    res.json({ points });
  } catch {
    res.status(502).json({ error: "grid unavailable" });
  }
});

function sendModbusCommand(address, turnOn) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, 1);
    socket.on("connect", () => {
      client
        .writeSingleCoil(address, turnOn)
        .then(() => {
          socket.end();
          resolve();
        })
        .catch((err) => {
          socket.destroy();
          reject(err);
        });
    });
    socket.on("error", reject);
    socket.connect({ host: RTU_A_HOST, port: RTU_A_PORT });
  });
}

function sendIec104Command(address, turnOn) {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      [path.join(__dirname, "iec104_client.py"), RTU_B_HOST, RTU_B_PORT, "1", String(address), turnOn ? "on" : "off"],
      { timeout: 10_000 },
      (err) => (err ? reject(err) : resolve()),
    );
  });
}

// The actual control action. Real protocol write goes out here — this is
// the "execute" step of the HMI's select -> inspect -> confirm flow, not
// a one-click toggle.
app.post("/command", async (req, res) => {
  const { tag, newState } = req.body ?? {};
  const target = COMMAND_MAP[tag];
  if (!target) return res.status(400).json({ error: "unknown point" });
  const turnOn = newState === "OPEN";

  try {
    if (target.protocol === "modbus") {
      await sendModbusCommand(target.address, turnOn);
    } else {
      await sendIec104Command(target.address, turnOn);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: "command failed", detail: String(err) });
  }
});

app.listen(PORT, () => console.log(`hmi listening on ${PORT}`));
