"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Mission } from "mission-schema";
import { flagFor } from "@/lib/flags";
import { ProgressStore } from "@/lib/progress";
import { fetchActiveSession, stopSession, type ActiveSession } from "@/lib/activeSession";

const ACTIVE_POLL_MS = 10_000;

export function Navbar() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [active, setActive] = useState<ActiveSession | null>(null);

  useEffect(() => {
    fetch("/api/missions")
      .then((r) => r.json())
      .then(setMissions)
      .catch(() => {});
    setCompletedIds(ProgressStore.getCompletedIds());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = () => fetchActiveSession().then((s) => !cancelled && setActive(s));
    poll();
    const interval = setInterval(poll, ACTIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const nations = new Map<string, Mission[]>();
  for (const mission of missions) {
    if (!nations.has(mission.country)) nations.set(mission.country, []);
    nations.get(mission.country)!.push(mission);
  }
  const availableNations = [...nations.entries()].filter(([, ms]) => ms.some((m) => m.status === "available"));

  const activeMission = active ? missions.find((m) => m.slug === active.missionSlug) : undefined;

  async function handleStop() {
    if (!active) return;
    if (await stopSession(active.sessionId)) setActive(null);
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-6 py-3 font-mono text-sm">
      <div className="flex items-center gap-5">
        <Link href="/" className="font-bold uppercase tracking-widest text-neutral-100">
          INTERLOCK
        </Link>
        <Link href="/nations" className="text-neutral-400 hover:text-neutral-200">
          Nations
        </Link>
        <Link href="/archive" className="text-neutral-400 hover:text-neutral-200">
          Archive
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {availableNations.map(([country, ms]) => {
          const total = ms.length;
          const completed = ms.filter((m) => completedIds.includes(m.id)).length;
          return (
            <span key={country} title={country} className="text-neutral-400">
              {flagFor(country)} {completed}/{total}
            </span>
          );
        })}

        {active && (
          <div className="flex items-center gap-2 rounded border border-emerald-800 bg-emerald-950/40 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-300">
              {activeMission ? `${flagFor(activeMission.country)} ${activeMission.title}` : active.missionSlug}
            </span>
            <span className="text-neutral-500">· {active.phase} · {active.score}pts</span>
            <Link href={`/missions/${active.missionSlug}/play?session=${active.sessionId}`} className="underline text-emerald-300 hover:text-emerald-200">
              Go to lab
            </Link>
            <button onClick={handleStop} className="text-red-400 hover:text-red-300">
              Stop
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
