import { notFound } from "next/navigation";
import Link from "next/link";
import { getMissionBySlug } from "@/lib/missions";
import { flagFor } from "@/lib/flags";
import { ActorAttributionBadge, AttributionBadge } from "@/components/Badges";
import { FidelityList } from "@/components/FidelityList";
import { MissionLaunchControl } from "@/components/MissionLaunchControl";

export default async function MissionPage({ params }: PageProps<"/missions/[slug]">) {
  const { slug } = await params;
  const mission = getMissionBySlug(slug);
  if (!mission) notFound();

  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16 text-neutral-300">
      <div className="flex flex-wrap items-center gap-2">
        <ActorAttributionBadge level={mission.attribution_confidence} />
        <AttributionBadge level={mission.military_relationship_confidence} />
      </div>
      <h1 className="mt-3 font-mono text-3xl text-neutral-100">{mission.title}</h1>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <Field label="Date" value={mission.date} />
        <Field label="Actor" value={`${flagFor(mission.actor.nation)} ${mission.actor.group ?? mission.actor.nation}`} />
        <Field label="Target" value={`${flagFor(mission.target_country)} ${mission.target_country}`} />
        <Field label="Sector" value={mission.sector} />
        <Field label="Conflict" value={mission.conflict ?? "—"} />
        <Field label="Type" value={mission.mission_type} />
      </dl>

      <Section title="Historical Briefing">{mission.historical_summary}</Section>
      {mission.military_context && <Section title="Military Context">{mission.military_context}</Section>}

      {mission.player_objectives && (
        <Section title="Mission Objectives">
          <div className="font-mono text-xs uppercase text-neutral-500">Primary</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {mission.player_objectives.primary.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
          {mission.player_objectives.secondary.length > 0 && (
            <>
              <div className="mt-4 font-mono text-xs uppercase text-neutral-500">Secondary</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {mission.player_objectives.secondary.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </>
          )}
        </Section>
      )}

      <Section title="Known Attack Chain">
        <ul className="space-y-2">
          {mission.initial_access && <li><b className="text-neutral-100">Initial access:</b> {mission.initial_access}</li>}
          {mission.enterprise_phase && <li><b className="text-neutral-100">Enterprise:</b> {mission.enterprise_phase}</li>}
          {mission.ot_phase && <li><b className="text-neutral-100">OT:</b> {mission.ot_phase}</li>}
          {mission.physical_effect && <li><b className="text-neutral-100">Physical effect:</b> {mission.physical_effect}</li>}
        </ul>
      </Section>

      <Section title="Historical Fidelity">
        <FidelityList fidelity={mission.historical_fidelity} />
      </Section>

      {mission.sources.length > 0 && (
        <Section title="Sources">
          <ul className="space-y-1 text-sm">
            {mission.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-neutral-400 underline hover:text-neutral-200">
                  {s.claim}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-12">
        {mission.status === "available" ? (
          <MissionLaunchControl slug={mission.slug} />
        ) : (
          <p className="font-mono text-sm text-neutral-500">This mission is not yet playable.</p>
        )}
        <Link href={`/nations/${mission.country.toLowerCase()}`} className="ml-4 text-sm text-neutral-500 underline">
          ← Back to campaign
        </Link>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase text-neutral-500">{label}</dt>
      <dd className="text-neutral-200">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-mono text-sm uppercase tracking-wide text-neutral-400">{title}</h2>
      <div className="mt-2 text-neutral-300">{children}</div>
    </section>
  );
}
