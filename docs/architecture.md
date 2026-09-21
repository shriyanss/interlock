# Architecture

## Components

- **`apps/portal`** — Next.js (App Router, TypeScript, Tailwind). Reads
  mission data directly from `missions/**/mission.yaml` via
  `packages/mission-schema` at request time (no database). Player
  progression is a `localStorage`-backed `ProgressStore`
  (`apps/portal/lib/progress.ts`) — the single swap point for a future
  DB/auth-backed implementation.

- **`apps/mission-controller`** — Fastify service. Owns per-session state
  (grid, score, detection, phase) in memory, launches/tears down a
  mission's Docker lab via `docker-compose`, and pushes live state to
  both the portal's HUD and the mission's HMI over WebSocket.

- **`packages/mission-schema`** — Zod schema for the mission data model
  plus a recursive YAML loader (`loadMissions`).

- **`packages/game-engine`** — Pure functions: `setBreakerState`/
  `computeImpact` (grid state machine) and `applyEvent`/`finalizeScore`
  (scoring reducer). No I/O, no framework — imported directly by
  mission-controller.

- **`missions/<country>/<slug>/`** — One `mission.yaml` per mission, plus
  (for playable missions) a `docker-compose.yml` and service source
  directories.

## Why mission-controller is a separate service, not part of the portal

mission-controller needs to hold live session state between requests
(current grid, score, detection level) and manage Docker lifecycle. Doing
that from a Next.js API route would mean giving the web app Docker-socket
access and re-inventing a stateful process inside a stateless-by-default
framework. A small standalone service is simpler and keeps the portal a
thin, restartable web frontend.

## Why the grid engine isn't its own container

It's pure in-memory computation with no isolation requirement and no
independent scaling need — running it as a microservice would just add
network latency for a function call. It lives inside mission-controller
and is architected as a `GridState` in / `GridState` + impact out pure
function so a future rewrite (e.g. swapping in pandapower/OpenDSS for real
load-flow simulation) only has to replace that one module.

## Docker lab network model (per mission)

Five conceptual segments: `internet` (only the mission's public-facing
entrypoint, e.g. employee-workstation, is published to the host),
`enterprise`, `ot_dmz`, `control`, and `substations`. A player must pivot
enterprise → VPN → jump host → control, mirroring the historical IT/OT
boundary crossing, rather than reaching OT services directly.

**Important deviation from a "textbook" segmented design**: network
isolation here is enforced by *which service is attached to which network*
and by *never publishing a host port* on internal services — not by
Compose's `internal: true` flag. That flag additionally blocks a network
from reaching `host.docker.internal`, which every lab service needs in
order to report events back to mission-controller (a process running on
the host, not inside the compose project, since mission-controller is what
*starts* the compose project). See the comment at the top of each mission's
`docker-compose.yml`.

## Session lifecycle

1. Portal calls `POST /sessions` on mission-controller with a `missionSlug`.
2. mission-controller generates a session ID, runs
   `SESSION_ID=<id> docker-compose up -d --build` for that mission (if it
   has a compose file; otherwise returns a stub entrypoint so the
   HTTP/WS contract can be developed before the lab exists), and returns
   `{ sessionId, entrypointUrl }`.
3. The portal's play page opens a WebSocket to
   `/sessions/:id/ws` and links to `entrypointUrl`.
4. Lab containers (employee-workstation, hmi, defender) read `SESSION_ID`
   and `CONTROLLER_URL` from their environment (interpolated from the
   `docker-compose up` process's env) to report events back.
5. mission-controller applies each event through `game-engine`'s scoring
   reducer and grid state machine, and broadcasts the new state.
6. When the mission's required grid state is reached, mission-controller
   finalizes the score and transitions to `debrief`; the portal shows the
   "OPERATIONAL EFFECT ACHIEVED" → historical-result → debrief flow and
   writes completion to `ProgressStore`, unlocking the next mission.
