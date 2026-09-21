import { join } from "node:path";
import { loadMissions, type Mission } from "mission-schema";

const MISSIONS_DIR = join(process.cwd(), "..", "..", "missions");

export function getAllMissions(): Mission[] {
  return loadMissions(MISSIONS_DIR);
}

export function getMissionsByCountry(country: string): Mission[] {
  return getAllMissions()
    .filter((m) => m.country.toLowerCase() === country.toLowerCase())
    .sort((a, b) => a.year - b.year);
}

export function getMissionBySlug(slug: string): Mission | undefined {
  return getAllMissions().find((m) => m.slug === slug);
}

export function isMissionUnlocked(mission: Mission, completedIds: string[]): boolean {
  if (mission.status === "coming-soon") return false;
  return mission.prerequisites.every((id) => completedIds.includes(id));
}
