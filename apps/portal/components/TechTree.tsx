"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mission } from "mission-schema";
import { ProgressStore } from "@/lib/progress";
import { ActorAttributionBadge } from "./Badges";

export function TechTree({ missions }: { missions: Mission[] }) {
  const [completedIds, setCompletedIds] = useState<string[] | null>(null);

  useEffect(() => {
    setCompletedIds(ProgressStore.getCompletedIds());
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {missions.map((mission, i) => {
        const unlocked =
          mission.status === "available" &&
          (completedIds === null || mission.prerequisites.every((id) => completedIds.includes(id)));
        const comingSoon = mission.status === "coming-soon";
        const done = completedIds?.includes(mission.id) ?? false;

        return (
          <div key={mission.id} className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="font-mono text-sm text-neutral-500">{mission.year}</span>
              {i < missions.length - 1 && <span className="mt-1 h-8 w-px bg-neutral-700" />}
            </div>

            {unlocked ? (
              <Link
                href={`/missions/${mission.slug}`}
                className="group flex-1 rounded-lg border border-neutral-700 bg-neutral-900 p-4 transition hover:border-neutral-500"
              >
                <MissionTileContent mission={mission} done={done} />
              </Link>
            ) : (
              <div
                className="flex-1 cursor-not-allowed rounded-lg border border-neutral-800 bg-neutral-950 p-4 opacity-60"
                title={
                  comingSoon
                    ? "Coming soon"
                    : `Prerequisite: complete ${mission.prerequisites.join(", ") || "earlier missions"}`
                }
              >
                <MissionTileContent mission={mission} done={false} locked />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MissionTileContent({ mission, done, locked }: { mission: Mission; done: boolean; locked?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-semibold text-neutral-100">{mission.title}</div>
        <div className="mt-1 text-sm text-neutral-400">
          {mission.actor.group ?? mission.actor.nation} → {mission.target_country} · {mission.sector}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {done && <span className="rounded bg-emerald-900 px-2 py-0.5 text-xs font-mono text-emerald-300">COMPLETE</span>}
        {locked && <span className="font-mono text-xs text-neutral-500">LOCKED</span>}
        <ActorAttributionBadge level={mission.attribution_confidence} />
      </div>
    </div>
  );
}
