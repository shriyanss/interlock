"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CONTROLLER_URL = process.env.NEXT_PUBLIC_MISSION_CONTROLLER_URL ?? "http://localhost:4000";

export function StartMissionButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${CONTROLLER_URL}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ missionSlug: slug }),
      });
      if (!res.ok) throw new Error(`mission-controller returned ${res.status}`);
      const { sessionId } = (await res.json()) as { sessionId: string };
      router.push(`/missions/${slug}/play?session=${sessionId}`);
    } catch {
      setError("Could not reach mission-controller. Is it running on " + CONTROLLER_URL + "?");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={pending}
        className="rounded border border-neutral-500 bg-neutral-900 px-6 py-3 font-mono text-sm uppercase tracking-wide text-neutral-100 transition hover:border-neutral-300 disabled:opacity-50"
      >
        {pending ? "Launching…" : "Start Mission"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
