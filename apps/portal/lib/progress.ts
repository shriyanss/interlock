"use client";

const KEY = "interlock:progress:v1";

interface ProgressRecord {
  missionId: string;
  score: number;
  completedAt: number;
}

interface ProgressData {
  completed: ProgressRecord[];
}

function read(): ProgressData {
  if (typeof window === "undefined") return { completed: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProgressData) : { completed: [] };
  } catch {
    return { completed: [] };
  }
}

function write(data: ProgressData): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private browsing, quota) — progress just won't persist
  }
}

/**
 * Thin wrapper around localStorage. This is the swap point for a future
 * DB/auth-backed implementation — callers only depend on this interface.
 */
export const ProgressStore = {
  getCompleted(): ProgressRecord[] {
    return read().completed;
  },
  isCompleted(missionId: string): boolean {
    return read().completed.some((r) => r.missionId === missionId);
  },
  getCompletedIds(): string[] {
    return read().completed.map((r) => r.missionId);
  },
  markCompleted(missionId: string, score: number): void {
    const data = read();
    if (data.completed.some((r) => r.missionId === missionId)) return;
    data.completed.push({ missionId, score, completedAt: Date.now() });
    write(data);
  },
  bestScore(missionId: string): number | undefined {
    return read().completed.find((r) => r.missionId === missionId)?.score;
  },
};
