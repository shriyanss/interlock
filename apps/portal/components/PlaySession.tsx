"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProgressStore } from "@/lib/progress";
import { CONTROLLER_URL, stopSession } from "@/lib/activeSession";

const CONTROLLER_WS_URL = CONTROLLER_URL.replace(/^http/, "ws");
const ONE_HOUR_MS = 60 * 60 * 1000;

interface LiveState {
  phase: string;
  score: number;
  detectionLevel: number;
  requiredEffectAchieved: boolean;
  entrypointUrl: string;
  expiresAt: number;
  outcome: "success" | "failed" | null;
  failureReason: string | null;
  grid: {
    substations: { id: string; name: string; breakers: { id: string; name: string; state: string }[] }[];
  };
}

export function PlaySession({ missionId, missionSlug }: { missionId: string; missionSlug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [state, setState] = useState<LiveState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const markedComplete = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  async function extend() {
    if (!sessionId) return;
    const res = await fetch(`${CONTROLLER_URL}/sessions/${sessionId}/extend`, { method: "POST" });
    if (res.ok) {
      const { expiresAt } = (await res.json()) as { expiresAt: number };
      setState((s) => (s ? { ...s, expiresAt } : s));
    }
  }

  async function stop() {
    if (!sessionId) return;
    if (await stopSession(sessionId)) router.push(`/missions/${missionSlug}`);
  }

  if (!sessionId) {
    return <p className="text-red-400">Missing session — start the mission from its briefing page.</p>;
  }
  if (!state) {
    return <p className="text-neutral-500">Connecting to mission-controller…</p>;
  }

  if (state.outcome === "failed") {
    return <FailureView missionSlug={missionSlug} reason={state.failureReason} />;
  }

  if (state.phase === "debrief") {
    return <DebriefView missionSlug={missionSlug} score={state.score} detectionLevel={state.detectionLevel} />;
  }

  const remainingMs = state.expiresAt - now;
  const remainingLabel = formatRemaining(remainingMs);
  const canExtend = remainingMs < ONE_HOUR_MS;

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
        <HudRow label="Time left" value={remainingLabel} />
        <div className="mt-4 flex gap-2">
          {canExtend && (
            <button
              onClick={extend}
              className="rounded border border-amber-700 bg-amber-950/40 px-3 py-1 font-mono text-xs uppercase text-amber-300 hover:border-amber-500"
            >
              Extend +12h
            </button>
          )}
          <button
            onClick={stop}
            className="rounded border border-red-800 bg-red-950/40 px-3 py-1 font-mono text-xs uppercase text-red-400 hover:border-red-500"
          >
            Stop Lab
          </button>
        </div>
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

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function HudRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-800 py-1 font-mono text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-200">{value}</span>
    </div>
  );
}

function FailureView({ missionSlug, reason }: { missionSlug: string; reason: string | null }) {
  return (
    <div className="rounded border border-red-800 bg-red-950/20 p-6">
      <h2 className="font-mono text-xl text-red-400">MISSION FAILED</h2>
      <p className="mt-4 text-neutral-300">{reason ?? "An unrecoverable action ended the mission."}</p>
      <p className="mt-4 text-sm text-neutral-500">The lab has been shut down.</p>
      <Link href={`/missions/${missionSlug}`} className="mt-6 inline-block text-sm text-neutral-400 underline">
        ← Try Again
      </Link>
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
