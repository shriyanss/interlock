// Real Modbus TCP server for Substation A's RTU. Coil writes are the
// actual player-facing control surface — a player who reaches this
// network directly (via engineering-workstation) can bypass the HMI web
// UI entirely and write coils with a real Modbus client (mbtget,
// pymodbus, etc). Every coil write is forwarded to mission-controller's
// existing breaker endpoint so scoring/win-condition logic never has to
// know or care whether the command came from the HMI or straight Modbus.
const net = require("net");
const Modbus = require("jsmodbus");

const PORT = process.env.MODBUS_PORT || 502;
const CONTROLLER_URL = process.env.CONTROLLER_URL || "http://mission-controller:4000";
const SESSION_ID = process.env.SESSION_ID || "";

// Coil index -> mission-controller breaker identity. Fixed for this
// mission's fixture grid (apps/mission-controller/src/grid-data.ts).
const COIL_MAP = [
  { substationId: "sub-a", breakerId: "brk-a1" },
  { substationId: "sub-a", breakerId: "brk-a2" },
  { substationId: "sub-a", breakerId: "decoy-a1" },
];

const coils = Buffer.alloc(1);
const netServer = new net.Server();
const server = new Modbus.server.TCP(netServer, { coils });

function reportCoilWrite(coilIndex, isOn) {
  const target = COIL_MAP[coilIndex];
  if (!target || !SESSION_ID) return;
  fetch(`${CONTROLLER_URL}/sessions/${SESSION_ID}/breaker`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      substationId: target.substationId,
      breakerId: target.breakerId,
      newState: isOn ? "OPEN" : "CLOSED",
    }),
  }).catch(() => {});
}

server.on("postWriteSingleCoil", (request) => {
  reportCoilWrite(request.body.address, request.body.value === 0xff00);
});

netServer.listen(PORT, () => console.log(`rtu-a: Modbus TCP server listening on ${PORT}`));
