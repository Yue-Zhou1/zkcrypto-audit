# Verification Gates

Use these gates to classify a suspected finding as **TRUE POSITIVE** or
**FALSE POSITIVE**.

## Phase 1: Restate the claim precisely

- What is the exact invariant the code is supposed to enforce?
- What input or state does the attacker control?
- What path reaches the vulnerable operation?
- Which property is at risk: Soundness, Privacy, Completeness, or DoS?

If the claim cannot be restated precisely, stop and downgrade confidence.

## Phase 2: Prove the trigger path

- Identify the exact file, function, and condition required to trigger the bug
- Show how untrusted data reaches the relevant check or missing check
- Rule out hidden validation, type guarantees, or protocol preconditions

If attacker control or reachability is missing, classify as **FALSE POSITIVE**.

## Phase 3: Prove impact

- Show what security property fails after the trigger path is satisfied
- Distinguish implementation weirdness from actual security break
- Use target-specific evidence, not only analogy to prior incidents

## Phase 4: Severity gate

- Apply the shared severity framework consistently
- Critical/High claims require a **compilable PoC** or an equivalently strong executable proof
- Medium/Low claims still need code evidence, but may not need a full PoC if exploitability is indirect

If the claim cannot satisfy the Critical/High PoC requirement, either lower the
severity or hold the finding as unverified.

## Final Verdict

- **TRUE POSITIVE** — trigger path, impact, and severity are all supported by evidence
- **FALSE POSITIVE** — one or more required gates failed

Record which gate failed. "Does not feel real" is not a verdict.
