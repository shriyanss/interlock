import { randomUUID } from "node:crypto";
import {
  applyEvent,
  finalizeScore,
  initialScoreState,
  setBreakerState,
  type GridState,
  type ScoreEventType,
  type ScoreState,
} from "game-engine";
import { initialGridState, REQUIRED_OUTAGE_BREAKERS } from "./grid-data.js";

export type MissionPhase =
  | "briefing"
  | "initial-compromise"
  | "enterprise-discovery"
  | "it-ot-pivot"
  | "ot-recon"
  | "process-control"
  | "physical-effect"
  | "historical-impact"
  | "debrief";

export const ONE_HOUR_MS = 60 * 60 * 1000;
export const TWELVE_HOURS_MS = 12 * ONE_HOUR_MS;

export interface SessionState {
  id: string;
  missionSlug: string;
  phase: MissionPhase;
  grid: GridState;
  scoreState: ScoreState;
  requiredEffectAchieved: boolean;
  entrypointUrl: string;
  createdAt: number;
  expiresAt: number;
  /** Whether this session actually launched a Docker lab (vs. the no-compose stub) — only lab-backed sessions count against the single-active-lab limit. */
  isLabBacked: boolean;
}

const sessions = new Map<string, SessionState>();
let activeSessionId: string | null = null;

export function createSession(
  missionSlug: string,
  entrypointUrl: string,
  id = randomUUID(),
  isLabBacked = true,
): SessionState {
  const now = Date.now();
  const session: SessionState = {
    id,
    missionSlug,
    phase: "briefing",
    grid: initialGridState(),
    scoreState: initialScoreState(),
    requiredEffectAchieved: false,
    entrypointUrl,
    createdAt: now,
    expiresAt: now + TWELVE_HOURS_MS,
    isLabBacked,
  };
  sessions.set(session.id, session);
  if (isLabBacked) activeSessionId = id;
  return session;
}

export function getSession(id: string): SessionState | undefined {
  return sessions.get(id);
}

export function deleteSession(id: string): boolean {
  if (activeSessionId === id) activeSessionId = null;
  return sessions.delete(id);
}

/** The one lab-backed session currently running, if any — enforces "one lab at a time". */
export function getActiveSession(): SessionState | undefined {
  if (!activeSessionId) return undefined;
  const session = sessions.get(activeSessionId);
  if (!session) {
    activeSessionId = null;
    return undefined;
  }
  return session;
}

export function allSessions(): SessionState[] {
  return [...sessions.values()];
}

/** Extends expiresAt by another 12h, but only once inside the last hour before it lapses — prevents indefinite renewal. */
export function extendSession(session: SessionState): boolean {
  if (session.expiresAt - Date.now() >= ONE_HOUR_MS) return false;
  session.expiresAt = Date.now() + TWELVE_HOURS_MS;
  return true;
}

/** Recomputes requiredEffectAchieved after a breaker change: every required breaker must be OPEN, and the hospital feeder must stay CLOSED. */
function checkRequiredEffect(grid: GridState): boolean {
  const allBreakers = grid.substations.flatMap((s) => s.breakers);
  const requiredOpen = REQUIRED_OUTAGE_BREAKERS.every(
    (id) => allBreakers.find((b) => b.id === id)?.state === "OPEN",
  );
  const hospitalUntouched = allBreakers
    .filter((b) => b.criticality === "hospital")
    .every((b) => b.state === "CLOSED");
  return requiredOpen && hospitalUntouched;
}

export function toggleBreaker(
  session: SessionState,
  substationId: string,
  breakerId: string,
  newState: "OPEN" | "CLOSED",
): SessionState {
  const { grid, impact } = setBreakerState(session.grid, substationId, breakerId, newState);
  session.grid = grid;

  const isRequired = REQUIRED_OUTAGE_BREAKERS.includes(breakerId);
  if (newState === "OPEN") {
    if (isRequired) {
      session.scoreState = applyEvent(session.scoreState, { type: "required-breaker-command" });
      if (session.phase === "ot-recon" || session.phase === "it-ot-pivot") {
        session.phase = "process-control";
      }
    } else {
      session.scoreState = applyEvent(session.scoreState, { type: "unintended-load-affected" });
    }
    if (impact.criticalFacilitiesAffected.length > 0) {
      session.scoreState = applyEvent(session.scoreState, { type: "critical-facility-hit" });
    }
  }

  const achievedNow = checkRequiredEffect(session.grid);
  if (achievedNow && !session.requiredEffectAchieved) {
    session.requiredEffectAchieved = true;
    session.scoreState = applyEvent(session.scoreState, { type: "required-grid-state-achieved" });
    session.phase = "physical-effect";
  }

  return session;
}

/** Milestone events also advance the guided-mode phase — generic across missions as long as their lab reports this same event vocabulary. */
const PHASE_ON_EVENT: Partial<Record<ScoreEventType, MissionPhase>> = {
  "initial-access-achieved": "initial-compromise",
  "vpn-connected": "it-ot-pivot",
  "ot-access-achieved": "ot-recon",
};

export function recordEvent(session: SessionState, type: ScoreEventType): SessionState {
  session.scoreState = applyEvent(session.scoreState, { type });
  const nextPhase = PHASE_ON_EVENT[type];
  if (nextPhase) session.phase = nextPhase;
  return session;
}

export function finalizeSession(session: SessionState): SessionState {
  session.scoreState = finalizeScore(session.scoreState);
  session.phase = "debrief";
  return session;
}
