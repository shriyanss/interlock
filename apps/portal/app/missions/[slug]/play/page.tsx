import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/missions";
import { PlaySession } from "@/components/PlaySession";

export default async function PlayPage({ params }: PageProps<"/missions/[slug]/play">) {
  const { slug } = await params;
  const mission = getMissionBySlug(slug);
  if (!mission) notFound();

  return (
    <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
      <h1 className="font-mono text-xl text-neutral-100">{mission.title}</h1>
      <div className="mt-6">
        <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
          <PlaySession missionId={mission.id} missionSlug={mission.slug} />
        </Suspense>
      </div>
    </main>
  );
}
