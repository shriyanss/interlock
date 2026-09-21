import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createSession, getActiveSession, toggleBreaker, type SessionState } from "./sessions.js";

// opening the hospital breaker is an instant fail, independent of the
// required-effect check
let session: SessionState = createSession("ua-2015-blackout", "http://x", randomUUID(), false);
toggleBreaker(session, "sub-a", "brk-a2", "OPEN");
assert.equal(session.outcome, "failed");
assert.match(session.failureReason ?? "", /hospital/i);

// a required breaker opening cleanly does NOT fail the mission
session = createSession("ua-2015-blackout", "http://x", randomUUID(), false);
toggleBreaker(session, "sub-a", "brk-a1", "OPEN");
assert.equal(session.outcome, null);

// opening all three required breakers (none hospital) achieves success
session = createSession("ua-2015-blackout", "http://x", randomUUID(), false);
toggleBreaker(session, "sub-a", "brk-a1", "OPEN");
toggleBreaker(session, "sub-b", "brk-b1", "OPEN");
toggleBreaker(session, "sub-b", "brk-b2", "OPEN");
assert.equal(session.requiredEffectAchieved, true);
assert.equal(session.outcome, null); // outcome only flips to "success" in finalizeSession

// opening a decoy breaker doesn't fail the mission (only hospital does)
session = createSession("ua-2015-blackout", "http://x", randomUUID(), false);
toggleBreaker(session, "sub-a", "decoy-a1", "OPEN");
assert.equal(session.outcome, null);

// createSession with isLabBacked=false never registers as the active session
assert.equal(getActiveSession(), undefined);

console.log("mission-controller sessions: all checks passed");
