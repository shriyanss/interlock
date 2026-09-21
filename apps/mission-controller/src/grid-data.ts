import type { GridState } from "game-engine";

/**
 * Fixture grid for ua-2015-blackout, modeled after the three affected
 * oblenergo distribution areas (see docs/research/ua-2015.md). Breaker
 * load/customer counts are FICTIONAL — no source gives exact per-feeder
 * numbers, only aggregate customer-impact totals. `name` is withheld from
 * the HMI's own view (players only see `tag`) — decoy breakers and the
 * tag/name split are gameplay mechanics, not documented incident detail.
 */
export function initialGridState(): GridState {
  return {
    substations: [
      {
        id: "sub-a",
        name: "Substation A — Ivano-Frankivsk District",
        breakers: [
          { id: "brk-a1", name: "BRK-A1 (Residential Feeder)", tag: "FDR-7734", state: "CLOSED", load_mw: 12, customers: 40000, criticality: "residential" },
          { id: "brk-a2", name: "BRK-A2 (Hospital Feeder)", tag: "FDR-2201", state: "CLOSED", load_mw: 3, customers: 1, criticality: "hospital" },
          { id: "decoy-a1", name: "Decoy Feeder A", tag: "FDR-5510", state: "CLOSED", load_mw: 4, customers: 900, criticality: "residential", decoy: true },
        ],
      },
      {
        id: "sub-b",
        name: "Substation B — Regional Industrial Zone",
        breakers: [
          { id: "brk-b1", name: "BRK-B1 (Industrial Feeder)", tag: "FDR-8842", state: "CLOSED", load_mw: 20, customers: 15, criticality: "industrial" },
          { id: "brk-b2", name: "BRK-B2 (Residential Feeder)", tag: "FDR-3319", state: "CLOSED", load_mw: 8, customers: 22000, criticality: "residential" },
          { id: "decoy-b1", name: "Decoy Feeder B", tag: "FDR-6675", state: "CLOSED", load_mw: 6, customers: 1200, criticality: "industrial", decoy: true },
        ],
      },
    ],
  };
}

/** Breakers the mission requires opened to count as the operational effect achieved. */
export const REQUIRED_OUTAGE_BREAKERS = ["brk-a1", "brk-b1", "brk-b2"];
