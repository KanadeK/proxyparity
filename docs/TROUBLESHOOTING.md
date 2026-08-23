# Troubleshooting and repair paths

Start with the exact command that failed. ProxyParity does not hide failures or
replace invalid values with defaults.

## `proxyparity` is not found

Confirm Node.js 22 or newer and the installed CLI:

```console
node --version
npm install --global ./proxyparity-0.1.0.tgz
proxyparity --version
```

From a checkout, bypass global installation:

```console
node ./bin/proxyparity.mjs --version
```

## Exit code 1

Exit 1 means the command, JSON, schema, file path, or output path is invalid.
Run the help first:

```console
proxyparity --help
```

For JSON syntax errors, parse the file without contacting any target:

```console
node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8'))" scenario.json
```

Then compare the file with `examples/portable.json`. Common schema repairs are:

- Set `schemaVersion` to numeric `1`.
- Keep only supported proxy keys inside `environment`.
- Use string values, including for `REQUEST_METHOD`.
- Use absolute `http:` or `https:` target URLs without credentials.
- Put DNS evidence in `resolvedIps` as literal IPv4 or IPv6 strings.

The error includes the failing JSON path, such as
`targets[0].resolvedIps[1]` or `environment.PATH`.

## Exit code 2

Exit 2 is a successful audit with a disagreement. Open the HTML report or read
the `Findings` section. Repair the named difference, then rerun the same file.

The safest cross-client starting point is:

1. Keep lowercase `http_proxy`, `https_proxy`, and `no_proxy`.
2. If uppercase copies are required, make their values identical.
3. Use comma-separated domain suffixes without leading dots.
4. Avoid wildcard and CIDR rules in a mixed client stack unless the report
   proves every target routes as intended.
5. Repeat a hostname with an explicit port only when port-specific behavior is
   intentional.

Use this only when CI should record rather than fail on findings:

```console
proxyparity audit scenario.json --fail-on never --output-dir build/audit
```

## A runtime disagrees with ProxyParity

Profiles are source snapshots and applications can override their standard
library. Capture the smallest evidence set:

1. Client or runtime name and exact version.
2. Operating system.
3. A minimized scenario with secret-free proxy hosts.
4. The observed DIRECT/PROXY/ERROR result.
5. A link to the relevant upstream implementation or test when available.

Run `proxyparity profiles --json` to include the modeled baselines. Open an
issue with that evidence; do not include live credentials or a full environment
dump.

## `npm run check` fails

Reproduce stages separately in this order:

```console
npm ci --ignore-scripts
npm run test:coverage
npm run check:syntax
npm run demo
npm run pack:check
```

- A test failure is a behavior regression; fix the implementation or update the
  source evidence and focused test together.
- A syntax failure prints the exact module Node could not parse.
- A demo failure means `examples/split-brain.json` no longer demonstrates a
  disagreement.
- A package failure means the built tarball cannot be installed or executed
  outside the checkout. Inspect the first npm or CLI command printed before the
  final error; do not replace the smoke test with a source-tree run.

If npm cannot write its user cache in a restricted environment, set a writable
cache for that command and rerun:

```console
npm_config_cache=./build/npm-cache npm run pack:check
```

PowerShell equivalent:

```powershell
$env:npm_config_cache = "$PWD\build\npm-cache"
npm run pack:check
```

## GitHub Pages fails

The Pages workflow publishes `build/demo` and requires the repository's Pages
source to be **GitHub Actions**. In repository settings, open **Pages**, select
**GitHub Actions**, then rerun the failed `pages.yml` workflow. A valid local
preview is always available at `build/demo/index.html` after `npm run demo`.

## Release workflow fails

Do not create a new version to mask the failure. From the tagged commit:

```console
npm ci --ignore-scripts
npm run check
git tag --points-at HEAD
```

The expected tag is annotated `v0.1.0`, and `dist/proxyparity-0.1.0.tgz` must
exist after the check. Fix the failed stage, move the tag only before a public
Release exists, rerun CI, and then create the Release with that tested tarball.
