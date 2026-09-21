import Link from "next/link";

const NATIONS = [
  { slug: "russia", name: "Russia", status: "available" as const },
  { slug: "ukraine", name: "Ukraine", status: "coming-soon" as const },
  { slug: "iran", name: "Iran", status: "coming-soon" as const },
  { slug: "china", name: "China", status: "coming-soon" as const },
  { slug: "other", name: "Other / Unattributed", status: "coming-soon" as const },
];

export default function NationsPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
      <h1 className="font-mono text-2xl text-neutral-100">Select Campaign</h1>
      <p className="mt-2 text-sm text-neutral-500">
        A nation label describes the campaign&apos;s historical setting, not a claim that every
        listed operation was officially conducted by that government — see each mission&apos;s
        attribution confidence.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NATIONS.map((nation) =>
          nation.status === "available" ? (
            <Link
              key={nation.slug}
              href={`/nations/${nation.slug}`}
              className="rounded-lg border border-neutral-700 bg-neutral-900 p-6 transition hover:border-neutral-500"
            >
              <div className="font-mono text-lg text-neutral-100">{nation.name}</div>
              <div className="mt-1 text-xs font-mono uppercase text-emerald-400">Available</div>
            </Link>
          ) : (
            <div
              key={nation.slug}
              className="cursor-not-allowed rounded-lg border border-neutral-800 bg-neutral-950 p-6 opacity-50"
            >
              <div className="font-mono text-lg text-neutral-300">{nation.name}</div>
              <div className="mt-1 text-xs font-mono uppercase text-neutral-500">Coming Soon</div>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
