import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadMissions } from "./load.js";
import { MissionSchema } from "./schema.js";

const validMission = {
  id: "RU-UA-2015",
  slug: "ua-2015-blackout",
  title: "Ukraine Electric Power Attack",
  country: "Russia",
  actor: { nation: "Russia", group: "Sandworm", attribution: "high" },
  target_country: "Ukraine",
  year: 2015,
  date: "2015-12-23",
  sector: "electric-power-distribution",
  mission_type: "ot-disruption",
  attribution_confidence: "high",
  historical_summary: "test",
  military_relationship_confidence: "ASSOCIATED",
  historical_fidelity: { documented: ["x"], reconstructed: [], fictional: [] },
  status: "available",
};

// valid mission parses
assert.doesNotThrow(() => MissionSchema.parse(validMission));

// missing required field is rejected
const { historical_summary, ...missingField } = validMission;
assert.throws(() => MissionSchema.parse(missingField));

// loader finds mission.yaml recursively and throws with file path on bad data
const dir = mkdtempSync(join(tmpdir(), "mission-schema-test-"));
writeFileSync(join(dir, "mission.yaml"), "id: bad\nstatus: available\n");
assert.throws(() => loadMissions(dir), /Invalid mission\.yaml/);

console.log("mission-schema: all checks passed");
