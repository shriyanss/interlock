# Historical Methodology

INTERLOCK missions are built from public reporting, not invented from
scratch. This document describes how that reporting becomes gameplay.

## Source priority

1. CISA / US-CERT
2. NCSC / government attribution statements
3. CERT-UA
4. MITRE ATT&CK / ATT&CK for ICS
5. ESET
6. Mandiant / Google Threat Intelligence
7. Dragos
8. SANS
9. Microsoft
10. Reputable academic papers and investigative reporting

Every significant historical claim in a mission is tied to a specific
source URL in that mission's `sources.md`.

## The three-way fidelity split

Every mission's `mission.yaml` has a `historical_fidelity` block:

```yaml
historical_fidelity:
  documented: []      # directly stated by a cited source
  reconstructed: []   # analyst inference from evidence, stated as such
  fictional: []       # introduced for gameplay, never presented as fact
```

**Documented** means a cited source states the fact directly — e.g. "attackers
used stolen VPN credentials to reach the SCADA environment" (CISA
IR-ALERT-H-16-056-01).

**Reconstructed** means analysts infer it from forensic evidence and say so
qualitatively, but no source pins it to an exact figure — e.g. "reconnaissance
dwell time was several months" is reconstructed; a specific day count would
require a source that doesn't exist.

**Fictional** means INTERLOCK invented it because gameplay requires a
concrete value the historical record doesn't provide at that granularity —
e.g. exact breaker IDs, per-feeder load/customer counts, or a specific
internal network layout. Fictional elements must always be labeled as such,
never blended into the documented narrative.

Where a detail is simply unknown rather than fictionalized, mission research
docs (`docs/research/*.md`) say so explicitly ("not established in
available sources") rather than guessing.

## The military-relationship rule

A cyberattack occurring during a war is not automatically evidence that it
enabled a specific military operation. Every mission's
`military_relationship_confidence` field uses:

- **CONFIRMED** — a credible source explicitly states the cyber operation
  directly supported a named military/kinetic action.
- **ASSOCIATED** — the operation occurred during an active conflict and is
  broadly consistent with a pattern of related activity, but no source ties
  it to a specific battlefield event.
- **CONTESTED** — sources disagree about the relationship.
- **UNKNOWN** — no credible public evidence establishes any relationship.

INTERLOCK defaults to the *lower* confidence when sources are ambiguous,
and never infers a tactical linkage from general wartime context alone.

## Reproducing techniques without reproducing malware

Where a historical exploit or malicious artifact is known (e.g. a
macro-laden phishing document, a specific malware family), INTERLOCK
reproduces the *concept* — the operational effect of opening a malicious
attachment, the fact that it delivers a credential-stealing implant —
through a lab-original, narrative UI. It never generates or ships a real
malicious document, a real exploit against a real product, or destructive
code with any effect outside the simulation.
