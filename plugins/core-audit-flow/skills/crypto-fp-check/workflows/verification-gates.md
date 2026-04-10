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
- Critical/High claims require a **runnable, compilable PoC test written into the target project's test suite** that executes and produces output confirming the bug
- Medium/Low claims still need code evidence (file:line references); a runnable test is recommended but not required

### PoC test requirements (Critical/High)

A valid PoC is a test function that:
1. Is written in the target project's native test framework (`#[test]`/`#[tokio::test]` for Rust, `pytest` for Python, etc.)
2. Lives inside the affected crate/module, not in a standalone script
3. **Asserts the bug is present** — passes while the vulnerability exists, fails after a correct fix
4. Produces actual test runner output (e.g., `test poc_f02_... ok`) — not just a source file

Name the function `poc_<finding-id>_<short-description>` so it is filterable.

### If the target cannot compile in the audit environment

Document the exact build blocker. Then choose one:
- **Option A:** Provide a reduced reproducer in a sibling crate that can compile and run
- **Option B:** Provide exhaustive structural evidence (every referenced symbol verified via `Grep`/`Read`) and mark severity as `pending_poc` until the client runs the test

Do not claim High/Critical with only "PoC written but not executed." That is still a hypothesis.

If the claim cannot satisfy the PoC requirement through either option, lower the severity
ceiling to Medium or hold the finding as unverified.

## Final Verdict

- **TRUE POSITIVE** — trigger path, impact, severity, and PoC artifact are all supported by evidence
- **FALSE POSITIVE** — one or more required gates failed

Record which gate failed. "Does not feel real" is not a verdict. "PoC forthcoming" is not a verdict.
