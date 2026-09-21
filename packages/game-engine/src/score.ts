export type ScoreEventType =
  | "initial-access-achieved"
  | "enterprise-discovery-complete"
  | "ot-access-achieved"
  | "ot-topology-discovered"
  | "required-breaker-command"
  | "required-grid-state-achieved"
  | "unintended-load-affected"
  | "critical-facility-hit"
  | "excessive-destructive-action"
  | "detection-event";

export interface ScoreEvent {
  type: ScoreEventType;
}

export interface ScoreState {
  score: number;
  detectionLevel: number;
  achieved: Set<ScoreEventType>;
  criticalFacilityHit: boolean;
}

export function initialScoreState(): ScoreState {
  return { score: 0, detectionLevel: 0, achieved: new Set(), criticalFacilityHit: false };
}

/** One-time point awards — repeating the same milestone event scores nothing further. */
const ONE_TIME_AWARDS: Partial<Record<ScoreEventType, number>> = {
  "initial-access-achieved": 100,
  "enterprise-discovery-complete": 100,
  "ot-access-achieved": 150,
  "ot-topology-discovered": 150,
  "required-breaker-command": 250,
  "required-grid-state-achieved": 250,
};

const DETECTION_THRESHOLD = 100;
const PENALTIES: Partial<Record<ScoreEventType, number>> = {
  "critical-facility-hit": -200,
  "unintended-load-affected": -25,
  "excessive-destructive-action": -50,
};
const DETECTION_INCREMENT = 20;

/** Applies one event to score state. Pure — returns a new ScoreState. */
export function applyEvent(state: ScoreState, event: ScoreEvent): ScoreState {
  const achieved = new Set(state.achieved);
  let score = state.score;
  let detectionLevel = state.detectionLevel;
  let criticalFacilityHit = state.criticalFacilityHit;

  const award = ONE_TIME_AWARDS[event.type];
  if (award !== undefined) {
    if (!achieved.has(event.type)) {
      score += award;
      achieved.add(event.type);
    }
  }

  const penalty = PENALTIES[event.type];
  if (penalty !== undefined) {
    score += penalty;
    if (event.type === "critical-facility-hit") criticalFacilityHit = true;
  }

  if (event.type === "detection-event") {
    detectionLevel += DETECTION_INCREMENT;
  }

  return { score, detectionLevel, achieved, criticalFacilityHit };
}

/** Stealth bonus is only awarded once, at session end, if detection stayed under threshold. */
export function finalizeScore(state: ScoreState): ScoreState {
  if (state.detectionLevel < DETECTION_THRESHOLD) {
    return { ...state, score: state.score + 100 };
  }
  return state;
}
