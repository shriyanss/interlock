# CLI helper: sends one IEC 60870-5-104 single command and exits.
# Invoked by server.js (Node) via child_process — Node has no maintained
# IEC 104 client library, but c104 (Python, wraps lib60870-c) is mature,
# so the HMI container runs both runtimes rather than hand-rolling the
# protocol in JS. Usage: iec104_client.py <host> <port> <common_address> <io_address> <on|off>
import socket
import sys
import time
import c104

host, port, common_address, io_address, state = sys.argv[1:6]
port = int(port)
common_address = int(common_address)
io_address = int(io_address)
is_on = state == "on"

# c104.Client.add_connection requires a literal IP — it does not resolve
# DNS itself (verified: passing the Docker service name directly raises
# "IP <name> is invalid!").
ip = socket.gethostbyname(host)

client = c104.Client()
connection = client.add_connection(ip=ip, port=port)
station = connection.add_station(common_address=common_address)
point = station.add_point(io_address=io_address, type=c104.Type.C_SC_NA_1)

client.start()
# Connection establishment (TCP handshake + APCI STARTDT) was observed to
# occasionally take longer than a 5s window under load during testing —
# give it more room rather than fail a real player's command on a slow tick.
for _ in range(150):
    if connection.is_connected:
        break
    time.sleep(0.1)
else:
    print("could not connect", file=sys.stderr)
    sys.exit(1)

point.value = is_on
ok = point.transmit(cause=c104.Cot.ACTIVATION)
time.sleep(0.3)  # let the command actually flush before the process exits
sys.exit(0 if ok else 1)
