# Contributing

## Adding a mission

See the "Adding a mission" section of the root `README.md`. In short:
research first, write `docs/research/<slug>.md` and the mission's own
`sources.md`, then author `mission.yaml`, then (if playable) the Docker
lab.

## Historical claims

- Never state a historical fact in `mission.yaml`, a mission's briefing
  copy, or its debrief without a corresponding entry in that mission's
  `sources.md`.
- Use "not established in available sources" rather than guessing when a
  detail is genuinely unknown.
- Run new/changed `military_relationship_confidence` claims past
  `docs/historical-methodology.md`'s CONFIRMED/ASSOCIATED/CONTESTED/UNKNOWN
  rule before merging.

## Code

- `packages/mission-schema` and `packages/game-engine` are plain
  TypeScript with a small `assert`-based self-check per module
  (`*.test.ts`, run via `pnpm --filter <pkg> test`) — keep that pattern
  for new pure-logic modules rather than introducing a test framework.
- Don't add a new Docker service to a mission's lab unless it represents a
  distinct historical role (enterprise host, OT boundary, control system,
  detection) — see the safety boundary in the root README before adding
  anything that could be mistaken for a real exploit or malicious artifact.
