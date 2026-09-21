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

export interface SessionState {
  id: string;
  missionSlug: string;
  phase: MissionPhase;
  grid: GridState;
  scoreState: ScoreState;
  requiredEffectAchieved: boolean;
  entrypointUrl: string;
  createdAt: number;
}

const sessions = new Map<string, SessionState>();

export function createSession(missionSlug: string, entrypointUrl: string, id = randomUUID()): SessionState {
  const session: SessionState = {
    id,
    missionSlug,
    phase: "briefing",
    grid: initialGridState(),
    scoreState: initialScoreState(),
    requiredEffectAchieved: false,
    entrypointUrl,
    createdAt: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): SessionState | undefined {
  return sessions.get(id);
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
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

export function recordEvent(session: SessionState, type: ScoreEventType): SessionState {
  session.scoreState = applyEvent(session.scoreState, { type });
  return session;
}

export function finalizeSession(session: SessionState): SessionState {
  session.scoreState = finalizeScore(session.scoreState);
  session.phase = "debrief";
  return session;
}
