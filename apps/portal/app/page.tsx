import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="font-mono text-5xl font-bold tracking-widest text-neutral-100">INTERLOCK</h1>
      <p className="mt-6 max-w-xl text-neutral-400">
        Recreate historically documented cyber-physical operations.
        <br />
        Understand the infrastructure.
        <br />
        Achieve the operational objective.
        <br />
        See how cyber effects influenced real conflicts.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/nations"
          className="rounded border border-neutral-600 bg-neutral-900 px-6 py-3 font-mono text-sm uppercase tracking-wide text-neutral-100 transition hover:border-neutral-400"
        >
          Begin Campaign
        </Link>
        <Link
          href="/archive"
          className="rounded border border-neutral-700 px-6 py-3 font-mono text-sm uppercase tracking-wide text-neutral-300 transition hover:border-neutral-500"
        >
          Mission Archive
        </Link>
        <Link
          href="/about"
          className="rounded border border-neutral-700 px-6 py-3 font-mono text-sm uppercase tracking-wide text-neutral-300 transition hover:border-neutral-500"
        >
          About
        </Link>
      </div>
    </main>
  );
}
