export type BreakerState = "OPEN" | "CLOSED";
export type Criticality = "residential" | "hospital" | "industrial";

export interface Breaker {
  id: string;
  /** Human-readable label — shown in the portal/debrief, deliberately withheld from the HMI's own view so a player has to work out identity from the point list. */
  name: string;
  /** Obfuscated identifier a player actually sees on the HMI (e.g. a raw tag/address) — carries no hint of purpose or criticality. */
  tag: string;
  state: BreakerState;
  load_mw: number;
  customers: number;
  criticality: Criticality;
  /** Decoys exist on the diagram but aren't part of any mission objective — opening one still costs points as an unintended action. */
  decoy?: boolean;
}

export interface Substation {
  id: string;
  name: string;
  breakers: Breaker[];
}

export interface GridState {
  substations: Substation[];
}

export interface GridImpact {
  mwLost: number;
  customersAffected: number;
  criticalFacilitiesAffected: string[];
}

/** Impact totals across every currently-OPEN breaker in the grid. */
export function computeImpact(grid: GridState): GridImpact {
  let mwLost = 0;
  let customersAffected = 0;
  const criticalFacilitiesAffected: string[] = [];
  for (const substation of grid.substations) {
    for (const breaker of substation.breakers) {
      if (breaker.state !== "OPEN") continue;
      mwLost += breaker.load_mw;
      customersAffected += breaker.customers;
      if (breaker.criticality !== "residential") {
        criticalFacilitiesAffected.push(breaker.id);
      }
    }
  }
  return { mwLost, customersAffected, criticalFacilitiesAffected };
}

/**
 * Sets one breaker's state and returns the new grid plus the grid-wide
 * impact after the change. Pure — no mutation of the input grid.
 */
export function setBreakerState(
  grid: GridState,
  substationId: string,
  breakerId: string,
  newState: BreakerState,
): { grid: GridState; impact: GridImpact } {
  let found = false;
  const nextGrid: GridState = {
    substations: grid.substations.map((substation) => {
      if (substation.id !== substationId) return substation;
      return {
        ...substation,
        breakers: substation.breakers.map((breaker) => {
          if (breaker.id !== breakerId) return breaker;
          found = true;
          return { ...breaker, state: newState };
        }),
      };
    }),
  };
  if (!found) {
    throw new Error(`Breaker ${breakerId} not found in substation ${substationId}`);
  }
  return { grid: nextGrid, impact: computeImpact(nextGrid) };
}
