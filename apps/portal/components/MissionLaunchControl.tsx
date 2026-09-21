"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Mission } from "mission-schema";
import { fetchActiveSession, type ActiveSession } from "@/lib/activeSession";
import { flagFor } from "@/lib/flags";
import { StartMissionButton } from "./StartMissionButton";

export function MissionLaunchControl({ slug }: { slug: string }) {
  const [active, setActive] = useState<ActiveSession | null | "loading">("loading");
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    fetchActiveSession().then(setActive);
    fetch("/api/missions")
      .then((r) => r.json())
      .then(setMissions)
      .catch(() => {});
  }, []);

  if (active === "loading") {
    return <p className="font-mono text-sm text-neutral-500">Checking lab status…</p>;
  }

  if (active && active.missionSlug === slug) {
    return (
      <Link
        href={`/missions/${slug}/play?session=${active.sessionId}`}
        className="inline-block rounded border border-emerald-700 bg-emerald-950/40 px-6 py-3 font-mono text-sm uppercase tracking-wide text-emerald-300 transition hover:border-emerald-500"
      >
        Go to Play — {active.phase}, {active.score}pts
      </Link>
    );
  }

  if (active) {
    const busyMission = missions.find((m) => m.slug === active.missionSlug);
    return (
      <div>
        <button
          disabled
          className="rounded border border-neutral-700 bg-neutral-900 px-6 py-3 font-mono text-sm uppercase tracking-wide text-neutral-500 opacity-50"
        >
          Start Mission
        </button>
        <p className="mt-2 text-sm text-neutral-400">
          Another lab is running
          {busyMission ? (
            <> ({flagFor(busyMission.country)} {busyMission.title})</>
          ) : (
            <> ({active.missionSlug})</>
          )}{" "}
          — <Link href={`/missions/${active.missionSlug}/play?session=${active.sessionId}`} className="underline">
            go stop it
          </Link>{" "}
          before starting a new one.
        </p>
      </div>
    );
  }

  return <StartMissionButton slug={slug} />;
}
