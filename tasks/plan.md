# Implementation plan

## Phase 1 — contract and evidence

- Freeze the scenario schema, output contract, exit codes, client baselines,
  novelty record, and success criteria.
- Acceptance: documentation names the exact supported surface and cites primary
  behavior sources.

## Phase 2 — decision engine

- Add failing tests for IP/CIDR primitives, validation, environment precedence,
  domain rules, ports, wildcard, loopback, and CGI.
- Implement only enough pure logic to satisfy those tests.
- Acceptance: five decisions are returned per target with explainable evidence.

## Phase 3 — usable product

- Add the CLI, console table, JSON and standalone HTML output, split-brain and
  portable fixtures, plus credential redaction.
- Acceptance: the split-brain fixture exits 2 and the portable fixture exits 0.

## Phase 4 — release engineering

- Add documentation, troubleshooting, syntax checks, package installation
  smoke test, Linux/Windows CI, changelog, security and contribution guidance.
- Acceptance: `npm run check` passes and the `.tgz` works outside the checkout.

## Phase 5 — public release

- Commit with the configured user identity, publish the public repository, wait
  for CI, create annotated `v0.1.0`, attach the tested tarball to a GitHub
  Release, verify public metadata and contributors, then send a Gmail summary.
