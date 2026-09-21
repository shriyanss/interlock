# INTERLOCK

INTERLOCK is an educational, historically grounded offensive OT/cyber-physical
security simulation. Each nation has a chronological mission tree built from
documented historical cyberattacks against industrial and cyber-physical
infrastructure. Missions are not CTFs — the goal is a specific simulated
physical/operational effect, achieved by understanding real OT concepts
(IT/OT boundaries, SCADA/HMI access, breakers, RTUs), inside a fully local,
synthetic, intentionally vulnerable Docker lab.

## Why

Most "hacking games" teach flag-hunting. INTERLOCK teaches the actual
distinction between IT and OT, why credentials and network segmentation
matter, and what a cyber operation's real-world physical and operational
consequences were — grounded in public reporting, not fiction.

## Historical methodology

Every mission separates:

- **Documented** — directly stated by a cited primary/near-primary source.
- **Reconstructed** — a reasonable inference stated as such by analysts, not a precisely dated/quantified fact.
- **Fictional** — introduced for gameplay (exact breaker IDs, an internal network layout, a lab-only phishing UI) and never presented as historical fact.

Separately, any claimed relationship between a cyber operation and a
military/kinetic action is labeled **CONFIRMED**, **ASSOCIATED**,
**CONTESTED**, or **UNKNOWN** — INTERLOCK never invents tactical linkage.
See `docs/historical-methodology.md` and each mission's `sources.md`.

## Safety boundary

All offensive activity happens inside Docker labs built specifically for
this project. INTERLOCK never attacks real infrastructure, scans public
ranges, targets real PLCs/HMIs/utilities, or ships real malware/malicious
documents/deployable exploits. Historical techniques are reproduced as
*concepts* against lab-original vulnerable services, never by weaponizing
the original product.

## Architecture

```
apps/
  portal/               Next.js App Router portal (nation/tech-tree UI)
  mission-controller/   Fastify service: session lifecycle, grid state,
                         scoring/detection, Docker lab orchestration
missions/
  russia/ua-2015-blackout/   mission.yaml + Docker lab for the first mission
packages/
  mission-schema/       Zod schema + YAML loader for mission.yaml
  game-engine/          grid state machine + scoring reducer
                         (shared UI lives in apps/portal/components — no
                         separate package until a second app needs it)
docs/
  research/             per-incident historical research notes
```

See `docs/architecture.md` for detail.

## Running the portal

```sh
pnpm install
pnpm --filter mission-controller build && pnpm --filter mission-controller start &
pnpm --filter portal dev
```

Portal: http://localhost:3000. mission-controller: http://localhost:4000.

## Running a mission

Missions with a `docker-compose.yml` are launched automatically by
mission-controller when you click **Start Mission** in the portal (it runs
`docker-compose up -d` for you). To run one manually for debugging:

```sh
cd missions/russia/ua-2015-blackout
SESSION_ID=debug-session docker-compose up -d --build
```

Requires a Docker host that supports either kernel WireGuard (no extra
device needed) or `/dev/net/tun` for the userspace fallback (needed by the
`wireguard` service) — see `DEVELOPMENT.md` for known gaps around this.

## Adding a mission

1. Create `missions/<country>/<slug>/mission.yaml` conforming to
   `packages/mission-schema`'s `MissionSchema`.
2. Research the incident first; write `docs/research/<slug>.md` and the
   mission's own `sources.md` before filling in `historical_summary`,
   `historical_fidelity`, and `sources` in `mission.yaml`.
3. If the mission is playable, add a `docker-compose.yml` and service
   directories alongside `mission.yaml`, following the pattern in
   `ua-2015-blackout/`.
4. Set `status: locked` with `prerequisites` pointing at the mission(s) that
   must be completed first, or `status: available` if it should be
   immediately playable.
