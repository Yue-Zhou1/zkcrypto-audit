# Internal Report Template

## Finding Title

`[Severity] Short finding name`

## Investigation Notes

- Initial hypothesis and why it was investigated
- Relevant code paths, commits, and trust boundaries reviewed
- Alternate hypotheses ruled out

## Exploitability Qualifiers

- Preconditions and attacker capabilities required
- Environmental constraints (configuration, network, privilege, runtime assumptions)
- Reliability of exploit path (deterministic / probabilistic / bounded)

## Technical Root Cause

Specify the exact broken invariant and implementation delta.

## Verification Artifacts

- Unit/integration test references
- PoC or harness outputs (if available)
- Cross-checks performed (`crypto-fp-check`, prior-art lookups, differential checks)

## Rollout Risk Assessment

- Compatibility risk from remediation
- Performance/availability impact risk
- Migration or data-shape concerns

## Internal Next Steps

- [ ] Owner assigned
- [ ] Fix plan approved
- [ ] Backport strategy decided
- [ ] Post-fix verification queued
