"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONTROLLER_URL } from "@/lib/activeSession";

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
      if (res.status === 409) {
        const { active } = (await res.json()) as { active: { missionSlug: string } };
        throw new Error(`Another lab is already running (${active.missionSlug}) — stop it first.`);
      }
      if (!res.ok) throw new Error(`mission-controller returned ${res.status}`);
      const { sessionId } = (await res.json()) as { sessionId: string };
      router.push(`/missions/${slug}/play?session=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not reach mission-controller at ${CONTROLLER_URL}.`);
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
