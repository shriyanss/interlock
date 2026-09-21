import type { AttributionLevel, ConfidenceLevel } from "mission-schema";

const CONFIDENCE_STYLE: Record<ConfidenceLevel, string> = {
  CONFIRMED: "border-emerald-700 text-emerald-400",
  ASSOCIATED: "border-amber-700 text-amber-400",
  CONTESTED: "border-orange-700 text-orange-400",
  UNKNOWN: "border-neutral-600 text-neutral-400",
};

export function AttributionBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${CONFIDENCE_STYLE[level]}`}>
      {level}
    </span>
  );
}

const ATTRIBUTION_STYLE: Record<AttributionLevel, string> = {
  high: "border-red-800 text-red-400",
  medium: "border-amber-700 text-amber-400",
  low: "border-neutral-600 text-neutral-400",
  unattributed: "border-neutral-700 text-neutral-500",
};

export function ActorAttributionBadge({ level }: { level: AttributionLevel }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${ATTRIBUTION_STYLE[level]}`}>
      attribution: {level}
    </span>
  );
}

export function FidelityBadge({ kind }: { kind: "documented" | "reconstructed" | "fictional" }) {
  const style =
    kind === "documented"
      ? "border-emerald-700 text-emerald-400"
      : kind === "reconstructed"
        ? "border-amber-700 text-amber-400"
        : "border-neutral-500 text-neutral-400";
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${style}`}>
      {kind}
    </span>
  );
}
