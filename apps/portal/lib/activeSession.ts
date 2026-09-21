export const CONTROLLER_URL = process.env.NEXT_PUBLIC_MISSION_CONTROLLER_URL ?? "http://localhost:4000";

export interface ActiveSession {
  sessionId: string;
  missionSlug: string;
  entrypointUrl: string;
  phase: string;
  score: number;
  detectionLevel: number;
  expiresAt: number;
}

/** Only one lab runs at a time — this is the single source of truth for "is a lab running, and which one". */
export async function fetchActiveSession(): Promise<ActiveSession | null> {
  try {
    const res = await fetch(`${CONTROLLER_URL}/sessions/active`, { cache: "no-store" });
    if (!res.ok) return null;
    const { session } = (await res.json()) as { session: ActiveSession | null };
    return session;
  } catch {
    return null;
  }
}

export async function stopSession(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${CONTROLLER_URL}/sessions/${sessionId}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
