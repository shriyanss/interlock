"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProgressStore } from "@/lib/progress";

const CONTROLLER_URL = process.env.NEXT_PUBLIC_MISSION_CONTROLLER_URL ?? "http://localhost:4000";
const CONTROLLER_WS_URL = CONTROLLER_URL.replace(/^http/, "ws");

interface LiveState {
  phase: string;
  score: number;
  detectionLevel: number;
  requiredEffectAchieved: boolean;
  entrypointUrl: string;
  grid: {
    substations: { id: string; name: string; breakers: { id: string; name: string; state: string }[] }[];
  };
}

export function PlaySession({ missionId, missionSlug }: { missionId: string; missionSlug: string }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [state, setState] = useState<LiveState | null>(null);
  const markedComplete = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`${CONTROLLER_URL}/sessions/${sessionId}/state`)
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});

    const ws = new WebSocket(`${CONTROLLER_WS_URL}/sessions/${sessionId}/ws`);
    ws.onmessage = (event) => setState(JSON.parse(event.data));
    return () => ws.close();
  }, [sessionId]);

  useEffect(() => {
    if (state?.phase === "debrief" && !markedComplete.current) {
      markedComplete.current = true;
      ProgressStore.markCompleted(missionId, state.score);
    }
  }, [state?.phase, state?.score, missionId]);

  if (!sessionId) {
    return <p className="text-red-400">Missing session — start the mission from its briefing page.</p>;
  }
  if (!state) {
    return <p className="text-neutral-500">Connecting to mission-controller…</p>;
  }

  if (state.phase === "debrief") {
    return <DebriefView missionSlug={missionSlug} score={state.score} detectionLevel={state.detectionLevel} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded border border-neutral-700 bg-neutral-900 p-4">
        <p className="font-mono text-xs uppercase text-neutral-500">Lab entrypoint</p>
        <a href={state.entrypointUrl} target="_blank" rel="noreferrer" className="text-neutral-200 underline">
          {state.entrypointUrl}
        </a>
        <p className="mt-4 text-sm text-neutral-500">
          Open the entrypoint above in a new tab to begin the enterprise pivot. Live mission state
          updates here as you act.
        </p>
      </div>
      <div className="rounded border border-neutral-700 bg-neutral-900 p-4">
        <HudRow label="Phase" value={state.phase} />
        <HudRow label="Score" value={String(state.score)} />
        <HudRow label="Detection" value={`${state.detectionLevel}`} />
        <div className="mt-4">
          <p className="font-mono text-xs uppercase text-neutral-500">Grid</p>
          {state.grid.substations.map((sub) => (
            <div key={sub.id} className="mt-2">
              <div className="text-xs text-neutral-400">{sub.name}</div>
              {sub.breakers.map((b) => (
                <div key={b.id} className="flex justify-between font-mono text-xs">
                  <span>{b.name}</span>
                  <span className={b.state === "OPEN" ? "text-red-400" : "text-emerald-400"}>{b.state}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HudRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-800 py-1 font-mono text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-200">{value}</span>
    </div>
  );
}

function DebriefView({ missionSlug, score, detectionLevel }: { missionSlug: string; score: number; detectionLevel: number }) {
  return (
    <div className="rounded border border-neutral-700 bg-neutral-900 p-6">
      <h2 className="font-mono text-xl text-emerald-400">OPERATIONAL EFFECT ACHIEVED</h2>
      <p className="mt-4 font-mono text-sm text-neutral-400">Score: {score} · Detection: {detectionLevel}</p>
      <p className="mt-6 font-mono text-xs uppercase text-neutral-500">Historical Result</p>
      <p className="mt-2 text-neutral-300">
        On December 23, 2015, coordinated cyberattacks caused outages at three Ukrainian
        distribution companies, affecting approximately 225,000-230,000 customers. Operators
        transitioned to manual control and restored power within 1-6 hours; full remote-control
        capability took longer to recover.
      </p>
      <h2 className="mt-8 font-mono text-lg text-neutral-100">MISSION COMPLETE</h2>
      <p className="mt-2 text-sm text-neutral-400">2016 — Industroyer / CrashOverride: UNLOCKED</p>
      <Link href={`/missions/${missionSlug}`} className="mt-6 inline-block text-sm text-neutral-500 underline">
        ← Back to mission briefing
      </Link>
    </div>
  );
}
