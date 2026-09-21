import { z } from "zod";

/**
 * How confident public evidence is about who did something, or whether a
 * cyber operation relates to a kinetic/military action. Reused for both
 * actor attribution and military-relationship claims per the spec's rule
 * that the two must never be conflated.
 */
export const ConfidenceLevel = z.enum(["CONFIRMED", "ASSOCIATED", "CONTESTED", "UNKNOWN"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const AttributionLevel = z.enum(["high", "medium", "low", "unattributed"]);
export type AttributionLevel = z.infer<typeof AttributionLevel>;

export const SourceRef = z.object({
  claim: z.string(),
  url: z.string().url(),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const FidelityBreakdown = z.object({
  documented: z.array(z.string()),
  reconstructed: z.array(z.string()),
  fictional: z.array(z.string()),
});
export type FidelityBreakdown = z.infer<typeof FidelityBreakdown>;

export const MissionPhase = z.enum([
  "briefing",
  "initial-compromise",
  "enterprise-discovery",
  "it-ot-pivot",
  "ot-recon",
  "process-control",
  "physical-effect",
  "historical-impact",
  "debrief",
]);
export type MissionPhase = z.infer<typeof MissionPhase>;

export const MissionStatus = z.enum(["available", "locked", "coming-soon"]);
export type MissionStatus = z.infer<typeof MissionStatus>;

export const MissionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  country: z.string(),
  actor: z.object({
    nation: z.string(),
    group: z.string().optional(),
    attribution: AttributionLevel,
  }),
  target_country: z.string(),
  year: z.number().int(),
  date: z.string(),
  conflict: z.string().optional(),
  sector: z.string(),
  mission_type: z.string(),
  attribution_confidence: AttributionLevel,
  historical_summary: z.string(),
  military_context: z.string().optional(),
  military_relationship_confidence: ConfidenceLevel,
  initial_access: z.string().optional(),
  enterprise_phase: z.string().optional(),
  ot_phase: z.string().optional(),
  physical_effect: z.string().optional(),
  historical_effect: z.string().optional(),
  player_objectives: z
    .object({
      primary: z.array(z.string()),
      secondary: z.array(z.string()).default([]),
    })
    .optional(),
  defender_behavior: z.array(z.string()).default([]),
  historical_fidelity: FidelityBreakdown,
  sources: z.array(SourceRef).default([]),
  prerequisites: z.array(z.string()).default([]),
  unlocks: z.array(z.string()).default([]),
  phases: z.array(MissionPhase).default([]),
  docker_services: z.array(z.string()).default([]),
  status: MissionStatus,
});
export type Mission = z.infer<typeof MissionSchema>;
