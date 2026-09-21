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
| `domain-auth-seed` | One-shot `ldapadd` seeding sidecar, exits after seeding | `enterprise` |
| `wireguard` | VPN boundary bridging enterprise → OT (published on host `:51820/udp` — this is the lab's internet-facing VPN endpoint) | `enterprise`, `ot_dmz` |
| `jump-host` | SSH bastion into the control network | `ot_dmz`, `control` |
| `hmi` | Synthetic SCADA HMI, one-line diagram | `control` |
| `defender` | Rule-based detection, raises `detection-event`s | `enterprise`, `ot_dmz`, `control` |

Only `employee-workstation` is published to the host — everything else must
be reached the way the historical attack pivoted.

## Known gaps

See `DEVELOPMENT.md` at the repo root — the WireGuard cross-network
routing (into `ot_dmz`) and the LDAP seed were build-verified but not
fully run-verified end-to-end.
