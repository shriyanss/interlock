# DEVELOPMENT.md

Running log for the INTERLOCK vertical slice (portal + UA-2015: BLACKOUT mission).

## Completed

- pnpm workspace scaffold: `apps/portal`, `apps/mission-controller`, `packages/{mission-schema,game-engine}`.
- `mission-schema`: Zod schema + YAML loader, with a self-check (`schema.test.ts`).
- `game-engine`: pure grid state machine (`setBreakerState`/`computeImpact`) and scoring reducer (`applyEvent`/`finalizeScore`), both with self-checks.
- Research pass for the 2015 Ukraine power grid attack: `docs/research/ua-2015.md` and `missions/russia/ua-2015-blackout/sources.md`, cross-checking CISA, MITRE ATT&CK, SANS/E-ISAC, ESET, Dragos, and the DOJ 2020 GRU indictment.
- `mission.yaml` for `ua-2015-blackout` (fully populated from the research doc) plus three locked stub missions (`industroyer-2016`, `industroyer2-2022`, `microscada-2022`) that unblock the tech tree UI.
- `mission-controller` (Fastify): session lifecycle, breaker/event endpoints, WebSocket state push, scoring/detection wired to `game-engine`, and `docker-compose` launch via `execa` (with a stub-entrypoint fallback when a mission has no compose file yet).
- Portal (Next.js 16 App Router): landing, about, nations index, nation tech tree, mission detail, live play/HUD page, mission archive, `/api/missions`. Dark, grid-textured visual direction per the spec. Progression via a `localStorage`-backed `ProgressStore`.
- Full Docker lab for `ua-2015-blackout`: `employee-workstation` (fake phishing/credential-reveal portal), `domain-auth` (OpenLDAP + a one-shot `ldapadd` seed sidecar), `wireguard` (`linuxserver/wireguard`, published on host `:51820/udp`, with a custom-cont-init.d script patching NAT/forwarding into `ot_dmz` and publishing the peer config), `jump-host` (`linuxserver/openssh-server`), `hmi` (static one-line-diagram SPA driven by mission-controller's `/grid` + WS), `defender` (rule-based detection watcher). All custom-built images (`employee-workstation`, `hmi`, `defender`) build successfully.
- End-to-end HTTP smoke test (portal + mission-controller, stub-entrypoint mode): session create → breaker toggles → required-effect detection → phase transitions to `debrief` → score computed correctly.
- Deployed portal + mission-controller to a remote host (`ssh claude`) for remote access: mission-controller now binds `0.0.0.0` by default (`HOST` env, default `0.0.0.0`; override for a stricter deployment), reachable directly or via SSH port-forward.
- **Real ICS protocols**: `rtu-a` (Node, `jsmodbus`, real Modbus TCP — no auth, as real Modbus is) and `rtu-b` (Python, `c104`, real IEC 60870-5-104) on a new `substations` network. `hmi` is now a protocol gateway (Node + Modbus client, shelling out to a small Python `c104` client for IEC 104 since no maintained Node client exists) rather than a REST passthrough to mission-controller — both real end-to-end paths verified locally before deployment (see below).
- **`engineering-workstation`**: a second SSH host (same recipe as `jump-host`, reusing its credential) on `[control, substations]` — a player who reaches it gets direct L3 access to the RTUs and can bypass the HMI web UI entirely with real Modbus/IEC104 client tools.
- **Harder HMI**: breakers are shown by obfuscated tag (e.g. `FDR-7734`), not plain name; two decoy feeders added per substation; commands go through a select → inspect → confirm flow instead of one-click buttons. A discoverable `point-list.txt` (in `ops.admin`'s home on `jump-host`) maps tags to real identity/criticality — the actual "figure out which button to click" mechanic.
- **Mission failure**: opening the hospital-criticality breaker is now an instant fail (`session.outcome = "failed"`), independent of and stricter than the existing point-penalty system — mission-controller tears the lab down immediately and frees the single-lab slot; the portal shows a dedicated "MISSION FAILED" panel and does not mark progress complete.

## Architecture decisions

- **pnpm workspaces**, no turborepo/nx — too few packages to justify a build-graph tool yet.
- **Zod** for the mission schema (not hand-rolled types) — mission.yaml is hand-authored content that needs runtime validation with useful error messages.
- **mission-controller is a separate long-running service**, not something the portal shells out to — it needs to hold live session state (grid, score, detection) between requests, and keeping Docker lifecycle out of the web app avoids giving the portal Docker-socket access.
- **grid-engine runs inside mission-controller**, not as its own container — it's pure in-memory computation with no isolation need.
- **Session state is in-memory** in mission-controller (`Map<sessionId, SessionState>`) — single-player local lab, no Redis/DB. A mission-controller restart loses the running session; this is an accepted v1 limitation.
- **Docker Compose network segmentation is enforced by network membership and by never publishing ports on internal services — not by Compose's `internal: true` flag.** `internal: true` would also cut every lab container off from `host.docker.internal`, which employee-workstation/hmi/defender all need to report events back to mission-controller (a process on the host, not a container in this compose project). This is a real, documented deviation from the original plan text — see the comment at the top of `docker-compose.yml`.
- **LDAP seeding uses a one-shot `ldapadd` sidecar (`domain-auth-seed`), not osixia/openldap's built-in bootstrap-ldif mechanism.** The built-in mechanism deletes its internal bootstrap directory after first use, which is incompatible with bind-mounting a seed file directly into that path (`Device or resource busy` / silently-empty seed depending on exactly how it's mounted). Seeding after the server is actually up sidesteps the conflict entirely.
- **docker-compose (not `docker compose`)**: this dev machine has the standalone `docker-compose` v5 binary rather than the `docker compose` CLI plugin. `mission-controller`'s `docker-lab.ts` invokes `docker-compose` accordingly — if your machine has the plugin instead, adjust that one call.
- **WireGuard instead of OpenVPN for the VPN boundary.** Kernel WireGuard creates its interface via netlink (`ip link add ... type wireguard`), not `/dev/net/tun` — it works on hosts that don't expose a TUN device to containers (e.g. the sandboxed Docker daemon this session originally developed against, and the remote deployment host). It only needs `/dev/net/tun` if it has to fall back to a userspace implementation, i.e. the host kernel lacks WireGuard support entirely (unlikely on any Linux ≥5.6). Custom routing/NAT into `ot_dmz` is patched on top of the image's defaults via `ot/wireguard/custom-cont-init.d/10-lab-routing.sh`, since the image assumes a single egress interface and this container is deliberately multi-homed.
- **The VPN service is now published to the host (`51820:51820/udp`).** The original OpenVPN service had no `ports:` mapping at all — a real bug, not a deliberate design choice: without a published port, nothing outside Docker (including a player's own VPN client) could ever reach it, making the "download the VPN config, connect from your machine" flow impossible regardless of the `/dev/net/tun` issue. Fixed as part of the WireGuard swap.
- **mission-controller binds `0.0.0.0` by default** (`HOST` env var, default `0.0.0.0`) so it's reachable from outside the host it runs on — needed once the portal and mission-controller run on a different machine than the browser accessing them (e.g. a remote dev/demo host). Set `HOST=127.0.0.1` for a stricter local-only deployment.
- **IEC 60870-5-104 over Modbus/DNP3 for Substation B**, based on research, not an arbitrary default: ESET's analysis names the affected serial-to-Ethernet layer as possibly running ELTIMA/ASEM software, and Ukrainian/European utility SCADA of this era overwhelmingly used IEC 101/104 rather than Modbus (generic/US-default) or DNP3 (North-American-centric). No source confirms the exact protocol these specific oblenergos ran — recorded as `reconstructed`, not `documented`, in `mission.yaml`.
- **`c104` (Python) for IEC 104, not a hand-rolled Node implementation.** Node has no maintained IEC 104 client/server library; `c104` wraps the well-established `lib60870-c` and ships prebuilt manylinux wheels (verified: installs and imports cleanly in a `python:3.12-slim` container with zero compilation, despite failing to build from source on macOS — the target deployment is Linux, so the macOS failure doesn't matter). The `hmi` container therefore runs both Node and Python; `iec104_client.py` is invoked via `child_process.execFile` for outbound IEC 104 commands only.
- **`c104` API notes actually verified against a live server+client pair** (not assumed from docs, which are thin): `Point.on_receive` callbacks require exact type annotations on all three parameters or pybind11 rejects the registration; the command value arrives as `message.info.on` (a `SingleCmd`), not `.state`; setting `point.value` from inside a server-side `on_receive` callback raises `Information is read-only!` and isn't needed for this use case (forwarding to mission-controller doesn't require it); client-side `add_station`/`add_point` must happen *before* `client.start()`/`connection.connect()`, not after.
- **Modbus (`jsmodbus` v4, not v5)**: v5 is an early beta with a thin server-side README; v4.0.10 is documented and was verified directly against a real client (`postWriteSingleCoil` fires with `request.body.address`/`.value`, and the framework already calls the response callback itself — a handler that also calls `cb()` crashes with `ERR_STREAM_NULL_VALUES`).

## Historical assumptions (fictional/reconstructed elements)

Recorded per-mission in each `mission.yaml`'s `historical_fidelity` block. For ua-2015-blackout specifically: exact breaker IDs, feeder names, and per-feeder load/customer counts are fictional (no source gives per-feeder granularity); IEC 60870-5-104 (Substation B) is `reconstructed` (historically plausible, not confirmed for these specific oblenergos); Modbus TCP (Substation A), decoy feeders, tag obfuscation, the point-list artifact, the engineering-workstation pivot, and the hospital-feeder instant-fail rule are all `fictional` gameplay mechanics.

## Known limitations

- **WireGuard's cross-network routing/NAT (`10-lab-routing.sh`) was NOT verified end-to-end.** The interface-naming assumption (enterprise = `eth0`, ot_dmz = `eth1`, from `networks: [enterprise, ot_dmz]` list order) is standard Compose behavior but should be confirmed with `docker exec wireguard ip addr` on first real run; the iptables FORWARD/MASQUERADE rules and the patched `AllowedIPs` in the published peer config need a real end-to-end connect-and-reach-jump-host test before relying on the pivot step.
- **Bind-mount-dependent runtime testing (domain-auth's LDAP seed) was inconclusive when originally developed against a sandboxed remote Docker daemon** (different filesystem than the checkout) — the seed sidecar's *design* fixes a real, reproduced bug (osixia's bootstrap-ldif cleanup step conflicting with a bind-mounted custom directory), but re-verify the actual `ldapadd` succeeds and `phished.employee`/`ops.admin` are queryable wherever it's actually deployed.
- Session state is single-instance/in-memory (see above).
- No `packages/ui` — the portal is the only consumer of its own components right now (`apps/portal/components/`), and pulling them into a shared package would be an unrequested abstraction until a second app needs them.
- **`enterprise-discovery-complete` (the LDAP recon milestone) is not auto-detected.** The player now has a real in-game reason to enumerate LDAP (discovering `ops.admin`'s SSH password via the ACL hole added in `domain-auth-seed`), but nothing watches slapd's own access log to fire the score event automatically the way `vpn-connected`/`ot-access-achieved`/`ot-topology-discovered` are — would need a log-tailing sidecar parsing slapd's stats log for the specific search, which risks not working reliably without live log-format verification. Left unwired for now.
- **The full browser → HMI → real-protocol → mission-controller chain was verified locally (Modbus end-to-end; IEC 104 verified via raw client, and the `hmi` container's Python `child_process.execFile` invocation was NOT yet exercised against a live `rtu-b` in this session)** — confirm this specific path (button click → `iec104_client.py` spawn → real command → mission-controller receives it) on the actual remote deployment before trusting it fully.
- **`engineering-workstation` reuses `ops.admin`'s credential** rather than requiring a separate LDAP-discovery sub-step — a player who already has `jump-host` access gets this pivot "for free" once they `nmap` it on `control`. Intentional simplification; revisit if it's too easy.

## Remote/demo deployment

Both mission-controller and the portal can run on a different machine than
the browser accessing them:

- mission-controller binds `0.0.0.0:4000` by default.
- The portal's `NEXT_PUBLIC_MISSION_CONTROLLER_URL` is a Next.js public env
  var — it's inlined at **build time**, so it must be set when running
  `next build`, not just at runtime: e.g.
  `NEXT_PUBLIC_MISSION_CONTROLLER_URL=http://<host>:4000 pnpm --filter portal build`.
  Default (unset) is `http://localhost:4000`, which is correct if you're
  accessing the portal through an SSH tunnel that forwards both ports
  (`ssh -N -L 3000:localhost:3000 -L 4000:localhost:4000 <host>`) rather
  than hitting the host's address directly in the browser.
- The `hmi` service's `CONTROLLER_PUBLIC_URL` env (in each mission's
  `docker-compose.yml`) has the same build-time-vs-runtime distinction in
  spirit, except it's read at container runtime (plain env var, not a
  Next.js public var) — set it to whatever address the *player's browser*
  can reach mission-controller at once they've pivoted through to the HMI.

## Next steps

1. Verify the full Docker lab (`docker-compose up`) end to end: confirm `client1.conf` is generated and downloadable from employee-workstation, a real WireGuard client can connect on `:51820/udp` and reach `jump-host` in `ot_dmz`, the LDAP seed lands, jump-host SSH accepts `ops.admin`, and the HMI reaches mission-controller through the full pivot chain rather than directly (right now the HMI calls mission-controller's *public* host-exposed URL directly from the browser, which works for the vertical slice but skips forcing the player through the jump host at the network layer — call this out explicitly, see below).
2. **Gap to close for a "true" pivot requirement**: currently a player could reach the HMI's `/config` proxy or hit mission-controller's public API directly from their own host browser without ever using the VPN/jump-host, because mission-controller's port is published to the host for the portal's own use. For v1 this is acceptable (the portal legitimately needs that access), but if stricter pivot enforcement matters later, put mission-controller's session state behind a lab-internal-only endpoint that only the `hmi` container can reach, and give the portal a separate, narrower public API.
3. Research and build the 2016 Industroyer/CrashOverride mission — real IEC 104 fidelity now exists in this mission, so 2016 needs a different new concept (per design principle: each mission should introduce something new, not just more boxes) — e.g. IEC 61850/GOOSE, or CrashOverride's specific multi-protocol payload behavior.
4. Add automated tests around `mission-controller`'s HTTP/WS surface (currently verified manually via curl).
