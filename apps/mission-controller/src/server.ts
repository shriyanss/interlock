import { join } from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import cors from "@fastify/cors";
import {
  allSessions,
  createSession,
  deleteSession,
  extendSession,
  finalizeSession,
  getActiveSession,
  getSession,
  recordEvent,
  toggleBreaker,
  type SessionState,
} from "./sessions.js";
import { launchLab, teardownLab } from "./docker-lab.js";
import type { ScoreEventType } from "game-engine";

// Resolved relative to this file (dist/server.js), not process.cwd() —
// mission-controller can be launched from any working directory.
const MISSIONS_ROOT = join(import.meta.dirname, "..", "..", "..", "missions");

function composePathFor(missionSlug: string): string {
  return join(MISSIONS_ROOT, "russia", missionSlug, "docker-compose.yml");
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(websocketPlugin);

const sockets = new Map<string, Set<import("ws").WebSocket>>();

function statePayload(session: SessionState) {
  return {
    phase: session.phase,
    score: session.scoreState.score,
    detectionLevel: session.scoreState.detectionLevel,
    requiredEffectAchieved: session.requiredEffectAchieved,
    entrypointUrl: session.entrypointUrl,
    expiresAt: session.expiresAt,
    grid: session.grid,
  };
}

function activeSummary(session: SessionState) {
  return {
    sessionId: session.id,
    missionSlug: session.missionSlug,
    entrypointUrl: session.entrypointUrl,
    phase: session.phase,
    score: session.scoreState.score,
    detectionLevel: session.scoreState.detectionLevel,
    expiresAt: session.expiresAt,
  };
}

function broadcast(sessionId: string) {
  const session = getSession(sessionId);
  if (!session) return;
  const payload = JSON.stringify(statePayload(session));
  for (const socket of sockets.get(sessionId) ?? []) {
    socket.send(payload);
  }
}

app.post<{ Body: { missionSlug: string } }>("/sessions", async (req, reply) => {
  const { missionSlug } = req.body;

  const active = getActiveSession();
  if (active) {
    if (active.missionSlug === missionSlug) {
      // Same mission already running — resume it rather than relaunching.
      return reply.send({ sessionId: active.id, entrypointUrl: active.entrypointUrl });
    }
    return reply.status(409).send({ error: "lab-busy", active: activeSummary(active) });
  }

  const composePath = composePathFor(missionSlug);
  const sessionId = randomUUID();
  // The lab's entrypoint (e.g. employee-workstation) is published on the
  // same Docker host as mission-controller itself — so whatever hostname
  // the caller used to reach us is also the right hostname for the lab,
  // whether that's localhost, an SSH-tunneled localhost, or a LAN name.
  const entrypointHost = (req.headers.host ?? "localhost:4000").split(":")[0];
  const { entrypointUrl, isLabBacked } = await launchLab(missionSlug, composePath, sessionId, entrypointHost);
  const session = createSession(missionSlug, entrypointUrl, sessionId, isLabBacked);
  return reply.send({ sessionId: session.id, entrypointUrl: session.entrypointUrl });
});

app.get("/sessions/active", async (_req, reply) => {
  const active = getActiveSession();
  return reply.send({ session: active ? activeSummary(active) : null });
});

app.delete<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
  const session = getSession(req.params.id);
  if (!session) return reply.status(404).send({ error: "session not found" });
  await teardownLab(composePathFor(session.missionSlug));
  deleteSession(req.params.id);
  return reply.send({ ok: true });
});

app.post<{ Params: { id: string } }>("/sessions/:id/extend", async (req, reply) => {
  const session = getSession(req.params.id);
  if (!session) return reply.status(404).send({ error: "session not found" });
  if (!extendSession(session)) {
    return reply.status(400).send({ error: "too-early", expiresAt: session.expiresAt });
  }
  broadcast(session.id);
  return reply.send({ expiresAt: session.expiresAt });
});

app.get<{ Params: { id: string } }>("/sessions/:id/state", async (req, reply) => {
  const session = getSession(req.params.id);
  if (!session) return reply.status(404).send({ error: "session not found" });
  return reply.send(statePayload(session));
});

app.get<{ Params: { id: string } }>("/sessions/:id/grid", async (req, reply) => {
  const session = getSession(req.params.id);
  if (!session) return reply.status(404).send({ error: "session not found" });
  return reply.send(session.grid);
});

app.post<{ Params: { id: string }; Body: { substationId: string; breakerId: string; newState: "OPEN" | "CLOSED" } }>(
  "/sessions/:id/breaker",
  async (req, reply) => {
    const session = getSession(req.params.id);
    if (!session) return reply.status(404).send({ error: "session not found" });
    const { substationId, breakerId, newState } = req.body;
    toggleBreaker(session, substationId, breakerId, newState);
    broadcast(session.id);
    if (session.requiredEffectAchieved) {
      finalizeSession(session);
      broadcast(session.id);
    }
    return reply.send({ ok: true });
  },
);

app.post<{ Params: { id: string }; Body: { type: ScoreEventType } }>(
  "/sessions/:id/events",
  async (req, reply) => {
    const session = getSession(req.params.id);
    if (!session) return reply.status(404).send({ error: "session not found" });
    recordEvent(session, req.body.type);
    broadcast(session.id);
    return reply.send({ ok: true });
  },
);

app.register(async (instance) => {
  instance.get<{ Params: { id: string } }>("/sessions/:id/ws", { websocket: true }, (socket, req) => {
    const { id } = req.params;
    if (!sockets.has(id)) sockets.set(id, new Set());
    sockets.get(id)!.add(socket);
    socket.on("close", () => sockets.get(id)?.delete(socket));
  });
});

// Enforces the 12h session cap — a countdown shown in the UI is advisory
// only without this actually tearing the lab down server-side.
setInterval(async () => {
  const now = Date.now();
  for (const session of allSessions()) {
    if (session.expiresAt > now) continue;
    app.log.info({ sessionId: session.id }, "session expired, tearing down lab");
    try {
      await teardownLab(composePathFor(session.missionSlug));
    } catch (err) {
      app.log.error(err, "failed to tear down expired session's lab");
    }
    deleteSession(session.id);
  }
}, 60_000);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
app.listen({ port, host }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
