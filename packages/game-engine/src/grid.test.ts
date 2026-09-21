import assert from "node:assert/strict";
import { computeImpact, setBreakerState, type GridState } from "./grid.js";

const grid: GridState = {
  substations: [
    {
      id: "sub-a",
      name: "Substation A",
      breakers: [
        { id: "brk-a1", name: "BRK-A1", state: "CLOSED", load_mw: 10, customers: 5000, criticality: "residential" },
        { id: "brk-a2", name: "BRK-A2", state: "CLOSED", load_mw: 5, customers: 1, criticality: "hospital" },
      ],
    },
  ],
};

// closed grid has no impact
assert.deepEqual(computeImpact(grid), { mwLost: 0, customersAffected: 0, criticalFacilitiesAffected: [] });

// opening a residential breaker counts its load/customers, not critical
const opened = setBreakerState(grid, "sub-a", "brk-a1", "OPEN");
assert.equal(opened.impact.mwLost, 10);
assert.equal(opened.impact.customersAffected, 5000);
assert.deepEqual(opened.impact.criticalFacilitiesAffected, []);

// opening the hospital breaker too flags it as a critical facility
const bothOpen = setBreakerState(opened.grid, "sub-a", "brk-a2", "OPEN");
assert.equal(bothOpen.impact.mwLost, 15);
assert.deepEqual(bothOpen.impact.criticalFacilitiesAffected, ["brk-a2"]);

// original grid is untouched (pure function)
assert.equal(grid.substations[0].breakers[0].state, "CLOSED");

// unknown breaker throws
assert.throws(() => setBreakerState(grid, "sub-a", "nope", "OPEN"));

console.log("game-engine grid: all checks passed");
