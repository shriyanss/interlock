# UA-2015: BLACKOUT

Recreates the historical attack chain of Sandworm's December 23, 2015
attack on Ukrainian power distribution companies. See
`../../../docs/research/ua-2015.md` for the full research writeup and
`sources.md` for per-claim sourcing.

## Running

```sh
SESSION_ID=<any-string> docker-compose up -d --build
```

Requires a Docker host with kernel WireGuard support (preferred — no extra
device needed) or `/dev/net/tun` for WireGuard's userspace fallback.
Normally launched automatically by mission-controller when a player clicks
Start Mission in the portal — see the root README.

## Services

| Service | Role | Network(s) |
|---|---|---|
| `employee-workstation` | Fake internal portal; lab-only phishing/credential-reveal step | `internet`, `enterprise` (published on host `:8080`) |
| `domain-auth` | OpenLDAP directory (phished + operator accounts) | `enterprise` |
| `domain-auth-seed` | One-shot `ldapadd` seeding sidecar; also punches a narrow ACL hole so a phished-employee bind can read `ops.admin`'s password (see below) | `enterprise` |
| `wireguard` | VPN boundary bridging enterprise → OT (published on host `:51820/udp` — this is the lab's internet-facing VPN endpoint) | `enterprise`, `ot_dmz` |
| `jump-host` | SSH bastion into the control network | `ot_dmz`, `control` |
| `engineering-workstation` | Second SSH host (same credential as `jump-host`) — a player who reaches it can bypass the HMI entirely and speak Modbus/IEC 104 directly with their own tools | `control`, `substations` |
| `hmi` | Synthetic SCADA HMI — protocol gateway speaking real Modbus (`rtu-a`) / IEC 104 (`rtu-b`) on the player's behalf; obfuscated tags, decoy points, select→confirm command flow | `control`, `substations` |
| `rtu-a` | Real Modbus TCP server (Substation A) — no auth, as real Modbus is | `substations` |
| `rtu-b` | Real IEC 60870-5-104 server (Substation B, via Python `c104`) | `substations` |
| `defender` | Rule-based detection, raises `detection-event`s | `enterprise`, `ot_dmz`, `control` |

Only `employee-workstation` is published to the host — everything else must
be reached the way the historical attack pivoted.

## Bypassing the HMI directly

`rtu-a`/`rtu-b` have no authentication — real Modbus/IEC 104 don't either.
A player who lands on `engineering-workstation` (same credential as
`jump-host`, found the same way via `nmap` on `control`) has direct
network access to `substations` and can issue real protocol commands with
their own tools instead of using the HMI web UI:

```sh
# Modbus (Substation A) — via a local port-forward through engineering-workstation
ssh -L 15020:rtu-a:502 ops.admin@<engineering-workstation-ip> -p 2222
mbtget -w -a 0 -1 -p 15020 127.0.0.1   # example: write coil 0 ON

# IEC 104 (Substation B)
ssh -L 15024:rtu-b:2404 ops.admin@<engineering-workstation-ip> -p 2222
# then point any IEC 104 client (e.g. a c104-based script) at 127.0.0.1:15024
```

Either way, cross-reference the point-list on `jump-host` first — every
point/coil address maps to a real breaker, including the hospital feeder,
which auto-fails the mission if opened, HMI or not.

## Discovering the jump-host credential

Once the VPN tunnel is up, `domain-auth` is reachable on the `enterprise`
subnet like any other host in it — there's no DNS for it from outside
Docker, so find its address the same way you'd find `jump-host` on
`ot_dmz`:

```sh
nmap -p 389 <enterprise-subnet>/24 --open
```

(The `enterprise` and `ot_dmz` CIDRs are both listed in the WireGuard
config's own `AllowedIPs` line — `10.13.13.0/24, <enterprise-cidr>,
<ot_dmz-cidr>` — so you don't have to guess which ranges are routed.)

The phished LDAP account (revealed via the employee-workstation attachment
page) can't read other accounts' passwords by default — except `ops.admin`'s,
via a deliberately narrow ACL hole (see `domain-auth-seed` above). A player
finds it by enumerating LDAP with the phished credentials, e.g.:

```sh
ldapsearch -x -H ldap://<domain-auth-ip-found-above> \
  -D "uid=phished.employee,ou=people,dc=oblenergo,dc=lab" \
  -w "Summer2015!" -b dc=oblenergo,dc=lab "(uid=ops.admin)" userPassword
```

This is a fictional gameplay mechanic, not a documented part of the 2015
incident — see `mission.yaml`'s `historical_fidelity.fictional`.

## Known gaps

See `DEVELOPMENT.md` at the repo root — the WireGuard cross-network
routing (into `ot_dmz`) and the LDAP seed were build-verified but not
fully run-verified end-to-end. Modbus was verified end-to-end locally
(browser → `hmi` → `rtu-a` → mission-controller); IEC 104 was verified
with a real client/server pair, but the specific `hmi` → `iec104_client.py`
→ `rtu-b` path (as it runs inside the actual container) needs its own
confirmation on the real deployment.
