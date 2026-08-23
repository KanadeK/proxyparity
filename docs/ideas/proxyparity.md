# ProxyParity idea brief

## One-line promise

Given one proxy environment and a list of URLs, show where curl, GNU Wget,
Python `urllib`, Go `net/http`, and Ruby `URI` choose different routes.

## Problem

`NO_PROXY` is not standardized. Mixed-language systems can therefore send the
same destination directly, through different proxies, or fail in CGI mode.
The configuration looks like plain text, so the mismatch usually appears only
after a deployment.

## Intended user

Platform engineers, self-hosters, CI maintainers, and developers debugging a
mixed-language stack behind a corporate proxy.

## Why this is not another proxy library

Existing proxy libraries normally implement one runtime's behavior. Existing
articles and documentation explain differences manually. ProxyParity instead
evaluates one scenario against five source-grounded behavior profiles and emits
a decision matrix plus machine-readable and standalone HTML evidence. It never
sends traffic or changes the host's proxy configuration.

## Shareable hook

> One `NO_PROXY` string. Five clients. Four answers.

The disagreement matrix is compact enough for an issue, incident report, or
README screenshot. That gives the project a plausible discovery loop, but stars
and traffic are external outcomes and cannot be guaranteed by implementation.

## Deliberate limits for v0.1.0

- HTTP and HTTPS targets only.
- Scenario files only; no implicit capture of the current process environment.
- Five pinned behavior profiles, not arbitrary executables or versions.
- Offline analysis; Ruby DNS-sensitive checks use explicit `resolvedIps` data.
- Static HTML output, not a hosted account or dashboard.

These limits keep the result reproducible and prevent secrets or network side
effects from being hidden inside an apparently harmless audit.
