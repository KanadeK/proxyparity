# ADR 0001: model source-grounded client profiles

Status: accepted on 2026-08-23.

## Context

`NO_PROXY` has no shared specification. A single normalized interpretation
would hide the exact disagreements ProxyParity is meant to reveal. Running five
external executables would make audits dependent on installed versions, DNS,
and network state.

## Decision

Keep one pure evaluator per named compatibility baseline. Every profile records
its upstream source and scope. The analyzer receives normalized scenario data
and performs no network or process calls. DNS-sensitive Ruby behavior consumes
explicit `resolvedIps` values from the scenario.

Profiles share only mechanical primitives such as IP parsing, CIDR containment,
port parsing, and safe output redaction. Variable precedence and rule matching
remain explicit per profile even when branches currently look similar.

## Consequences

- Tests can pin intentional differences and reports are reproducible.
- Upstream behavior changes require an explicit profile review instead of
  silently changing old audit results.
- The tool describes the named baselines, not every client version or
  application-specific override.
- Adding a client requires primary-source research plus a conformance fixture;
  it is not a data-only configuration change.
