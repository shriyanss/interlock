# Real IEC 60870-5-104 server for Substation B's RTU (via the c104
# library, wrapping lib60870-c). Chosen over Modbus for this substation
# because Ukrainian/European utility SCADA of the 2015-incident era
# overwhelmingly used IEC 60870-5-101/104, not Modbus or DNP3 — see
# mission.yaml historical_fidelity (reconstructed, not documented: no
# source confirms the exact protocol these specific oblenergos ran).
#
# A player who reaches this network directly (via engineering-workstation)
# can bypass the HMI web UI entirely and issue real IEC 104 single
# commands with their own client. Every accepted command is forwarded to
# mission-controller's existing breaker endpoint — scoring/win-condition
# logic never has to know or care whether the command came from the HMI
# or straight IEC 104.
import os
import time
import urllib.request
import json
import c104

PORT = int(os.environ.get("IEC104_PORT", "2404"))
CONTROLLER_URL = os.environ.get("CONTROLLER_URL", "http://mission-controller:4000")
SESSION_ID = os.environ.get("SESSION_ID", "")

# io_address -> mission-controller breaker identity. Fixed for this
# mission's fixture grid (apps/mission-controller/src/grid-data.ts).
POINT_MAP = {
    1: {"substationId": "sub-b", "breakerId": "brk-b1"},
    2: {"substationId": "sub-b", "breakerId": "brk-b2"},
    3: {"substationId": "sub-b", "breakerId": "decoy-b1"},
}


def report_command(io_address: int, is_on: bool) -> None:
    target = POINT_MAP.get(io_address)
    if not target or not SESSION_ID:
        return
    body = json.dumps(
        {
            "substationId": target["substationId"],
            "breakerId": target["breakerId"],
            "newState": "OPEN" if is_on else "CLOSED",
        }
    ).encode()
    req = urllib.request.Request(
        f"{CONTROLLER_URL}/sessions/{SESSION_ID}/breaker",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def on_receive(
    point: c104.Point, previous_info: c104.Information, message: c104.IncomingMessage
) -> c104.ResponseState:
    is_on = bool(message.info.on)
    report_command(point.io_address, is_on)
    return c104.ResponseState.SUCCESS


def main() -> None:
    server = c104.Server(ip="0.0.0.0", port=PORT)
    station = server.add_station(common_address=1)
    for io_address in POINT_MAP:
        point = station.add_point(io_address=io_address, type=c104.Type.C_SC_NA_1)
        point.on_receive(on_receive)
    server.start()
    print(f"rtu-b: IEC 60870-5-104 server listening on {PORT}", flush=True)
    while True:
        time.sleep(1)


if __name__ == "__main__":
    main()
