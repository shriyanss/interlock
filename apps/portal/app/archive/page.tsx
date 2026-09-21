import Link from "next/link";
import { getAllMissions } from "@/lib/missions";
import { ActorAttributionBadge } from "@/components/Badges";

export default function ArchivePage() {
  const missions = getAllMissions().sort((a, b) => a.year - b.year);

  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
      <h1 className="font-mono text-2xl text-neutral-100">Mission Archive</h1>
      <div className="mt-8 space-y-3">
        {missions.map((mission) => (
          <Link
            key={mission.id}
            href={`/missions/${mission.slug}`}
            className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
          >
            <div>
              <div className="text-neutral-100">{mission.title}</div>
              <div className="text-xs text-neutral-500">
                {mission.year} · {mission.country} · {mission.target_country}
              </div>
            </div>
            <ActorAttributionBadge level={mission.attribution_confidence} />
          </Link>
        ))}
      </div>
    </main>
  );
}
