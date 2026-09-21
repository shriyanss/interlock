import type { FidelityBreakdown } from "mission-schema";
import { FidelityBadge } from "./Badges";

export function FidelityList({ fidelity }: { fidelity: FidelityBreakdown }) {
  const groups: { key: keyof FidelityBreakdown; label: "documented" | "reconstructed" | "fictional" }[] = [
    { key: "documented", label: "documented" },
    { key: "reconstructed", label: "reconstructed" },
    { key: "fictional", label: "fictional" },
  ];
  return (
    <div className="space-y-4">
      {groups.map(({ key, label }) => (
        <div key={key}>
          <FidelityBadge kind={label} />
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-300">
            {fidelity[key].length === 0 && <li className="text-neutral-500 italic list-none pl-0">none recorded</li>}
            {fidelity[key].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
