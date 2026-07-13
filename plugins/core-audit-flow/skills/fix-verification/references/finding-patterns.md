# fix-verification Finding Patterns

Recurring ways a "fix" fails to actually remediate a verified finding. Each is a
reason to withhold a `fixed` verdict.

## Input-specific patch, root cause intact

The patch rejects the exact value the PoC used but not the class of values that
trigger the defect. Example: a length check hard-codes the one malformed length
from the report instead of validating `len == expected`. Detection: build a
variant input that exercises the same invariant via a different value; if it
still passes, verdict is `partially_fixed` or `not_fixed`.

## Reported call site fixed, sibling paths untouched

The finding named one location, but the same defect exists in parallel loaders,
another curve/parameter branch, or a second entry point. Example: MAC check
added to one keystore format loader but not the second. Detection: grep the
pattern tree-wide; any unpatched sibling downgrades to `partially_fixed`.

## PoC fails for the wrong reason

After the patch the PoC no longer demonstrates the bug — but because an
unrelated API changed, the build broke, or the harness silently errored, not
because the vulnerability is gone. Detection: read *why* it fails; require the
specific new check to be the cause.

## Guard added at the wrong layer

The check is placed where an attacker-controlled path can bypass it (e.g. a
witness-time assertion rather than an enforced constraint; a client-side check
for a server-trust boundary). Detection: confirm the guard sits on the trust
boundary the finding identified.

## Regression introduced by the fix

The patch fixes the finding but breaks correctness or introduces new surface: a
new panic on adversarial input, an overflow, changed error semantics that leak
an oracle, or a timing difference. Detection: read the added lines and run
regression tests; verdict `regressed`.

## Fix reverts or is shadowed later

The change is undone by a later commit, a rebase, or an overriding
configuration/default. Detection: verify `fix_ref` is present in the revision
actually deployed/tested, not just in an intermediate commit.

## Silent scope reduction

The patch "fixes" the finding by disabling or gating the feature rather than
correcting it, shifting the risk to a caller obligation without documenting it.
Detection: confirm whether the capability is genuinely corrected or merely
turned off; record residual risk if it is only gated.
