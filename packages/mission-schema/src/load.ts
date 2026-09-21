import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { MissionSchema, type Mission } from "./schema.js";

/**
 * Recursively finds every mission.yaml under missionsDir, validates it, and
 * throws with the offending file path on the first invalid one — mission
 * content is authored by hand, so failing loudly beats silently dropping it.
 */
export function loadMissions(missionsDir: string): Mission[] {
  const missions: Mission[] = [];
  for (const path of findMissionFiles(missionsDir)) {
    const raw = yaml.load(readFileSync(path, "utf8"));
    const result = MissionSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Invalid mission.yaml at ${path}: ${result.error.message}`);
    }
    missions.push(result.data);
  }
  return missions;
}

function findMissionFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findMissionFiles(path));
    } else if (entry.name === "mission.yaml") {
      found.push(path);
    }
  }
  return found;
}
