# Skill Evaluation Fixtures

Each file in this directory is a JSON evaluation fixture for one audit skill
or one existing-skill extension. Fixtures are validated by
`scripts/validate_skill_evals.py` against `schema.json`.

## Naming

- New skill: `<skill-name>.json` (e.g. `onchain-verifier-auditor.json`)
- Extension of an existing skill: `<skill-name>-<extension>.json`
  (e.g. `zk-circuit-auditor-stark-air.json`)

## Contract

Every fixture must contain:

- `skill_name` — the registry `skill_name` this fixture evaluates. For an
  extension fixture, this is the extended skill's name, not a new name.
- `positive_prompts` — at least two prompts that should select this skill.
  Each entry has a `prompt` and an `expected_route` (a registry skill name).
- `negative_prompts` — at least two nearby prompts that should route
  elsewhere. Each entry has a `prompt` and an `expected_route` naming the
  neighboring skill.
- `required_sources` — at least one authoritative standard or paper that must
  appear in the skill's `references/spec-sources.md` (or the extension's
  reference file, for extension fixtures).
- `required_output_fields` — the output-contract field names that must appear
  in the skill's `## Output Contract` section.
- `forward_test_notes` (optional) — isolated forward-test observations,
  recorded after running a fixture prompt in a fresh agent context. Each note
  has a `prompt_kind` (`positive` or `negative`), the `observed_route`, and
  the `output_fields_present` that were actually produced.

## Routing reachability

- For `router_auto` skills, every `expected_route` in `positive_prompts` must
  be reachable in `plugins/_meta/router-matrix.yaml` (a rule `route_to`
  target or a `phase_flow.default_skill`).
- For `user_triggered_only` skills, the fixture's positive prompts must
  explicitly invoke the skill, and the validator confirms the skill is
  absent from all automatic routes and phase defaults instead of checking
  machine reachability.
- Every `expected_route` (positive or negative) must resolve to a real
  registry skill.
