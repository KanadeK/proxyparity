# Contributing

ProxyParity welcomes focused fixes and well-evidenced client behavior updates.

## Set up

```console
git clone https://github.com/KanadeK/proxyparity.git
cd proxyparity
npm ci --ignore-scripts
npm run check
```

Node.js 22 or newer is required. The package has no runtime dependencies.

## Change a behavior profile

A profile change must include all three:

1. A primary upstream source link to implementation, official documentation,
   or the client's own conformance test.
2. One focused test that fails before the implementation change.
3. An update to `docs/RESEARCH.md` when the modeled baseline or branch changes.

Comparison articles are useful context but do not override a current upstream
source. Keep behavior branches explicit in `src/profiles.mjs` or
`src/matchers.mjs`; do not normalize differences into a fictional standard.

## Change the scenario or report contract

Update `docs/SPEC.md`, tests, examples, and the README in the same pull request.
The JSON report is a public interface, so incompatible changes require a report
version and package-version decision.

## Before opening a pull request

```console
npm test
npm run check
git status --short
```

Do not commit `build/`, `dist/`, npm caches, real proxy credentials, or full
environment dumps. Keep the patch limited to the problem being solved and state
the exact acceptance command in the pull request.
