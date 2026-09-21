import assert from "node:assert/strict";
import { applyEvent, finalizeScore, initialScoreState } from "./score.js";

let state = initialScoreState();
state = applyEvent(state, { type: "initial-access-achieved" });
assert.equal(state.score, 100);

// repeating the same milestone doesn't double-award
state = applyEvent(state, { type: "initial-access-achieved" });
assert.equal(state.score, 100);

state = applyEvent(state, { type: "ot-access-achieved" });
assert.equal(state.score, 250);

// hitting a critical facility penalizes and flags it
state = applyEvent(state, { type: "critical-facility-hit" });
assert.equal(state.score, 50);
assert.equal(state.criticalFacilityHit, true);

// detection events raise detection level; low detection earns the stealth bonus
let clean = initialScoreState();
clean = applyEvent(clean, { type: "initial-access-achieved" });
clean = finalizeScore(clean);
assert.equal(clean.score, 200); // 100 + 100 stealth bonus

let detected = initialScoreState();
for (let i = 0; i < 6; i++) detected = applyEvent(detected, { type: "detection-event" });
detected = finalizeScore(detected);
assert.equal(detected.score, 0); // no stealth bonus once threshold crossed

console.log("game-engine score: all checks passed");
