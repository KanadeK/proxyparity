# ProxyParity v0.1.0 specification

## Goal

ProxyParity deterministically answers this question:

> For each supplied HTTP(S) URL, would curl, GNU Wget, Python `urllib`, Go
> `net/http`, and Ruby `URI` connect directly, use a proxy, or reject the
> configuration?

It must expose the selected environment variable, matched exclusion rule,
sanitized proxy endpoint, and a plain-language reason for every decision.

## Input contract

An audit reads one UTF-8 JSON file no larger than 1 MiB:

```json
{
  "schemaVersion": 1,
  "environment": {
    "http_proxy": "http://lower.proxy.example:8080",
    "HTTP_PROXY": "http://upper.proxy.example:8080",
    "no_proxy": ".svc.cluster.local,10.0.0.0/8",
    "NO_PROXY": "*.corp.example"
  },
  "targets": [
    {
      "url": "https://api.svc.cluster.local/health",
      "resolvedIps": ["10.42.7.18"]
    }
  ]
}
```

Allowed environment keys are `http_proxy`, `HTTP_PROXY`, `https_proxy`,
`HTTPS_PROXY`, `no_proxy`, `NO_PROXY`, `REQUEST_METHOD`, `CGI_HTTP_PROXY`, and
`SERVER_NAME`. Values are strings. A scenario contains 1 to 500 targets. Each
target has an absolute `http:` or `https:` URL and up to 16 valid IP addresses
that represent an already-known DNS result.

Credentials in target URLs are rejected. Credentials embedded in proxy URLs
are accepted for realistic auditing but redacted from every output.

## Behavior profiles

| ID | Compatibility baseline | Distinguishing behavior |
| --- | --- | --- |
| `curl` | curl 7.86+ environment behavior | lowercase `http_proxy` only; leading dot stripped; `*` and CIDR supported |
| `wget` | GNU Wget 1.x | lowercase variables only; raw suffix matching; no leading-dot normalization |
| `python` | CPython 3.14 `urllib.request` | lowercase precedence; uppercase HTTP disabled in CGI; optional ports |
| `go` | Go stdlib vendored `httpproxy` | uppercase precedence; CIDR and port matching; localhost/loopback bypass; CGI proxy error |
| `ruby` | Ruby URI 1.x `URI::Generic` | lowercase precedence; DNS-aware IP/CIDR and port matching; CGI-specific selection |

The profiles are source snapshots, not claims about every past or future
release. Source links and the exact modeled branches live in `docs/RESEARCH.md`.

## Output contract

`proxyparity audit <scenario>` prints an ASCII decision table. With
`--output-dir <dir>` it also writes:

- `report.json`: complete stable result for automation.
- `report.html`: self-contained, escaped, script-free incident artifact.

Each target contains five decisions and an `agreement` boolean. Summary counts
track agreements, disagreements, errors, and warnings. A disagreement compares
both route and sanitized proxy endpoint, so two clients selecting different
proxies are not reported as agreeing.

## Exit codes

- `0`: valid scenario and no client disagreement.
- `1`: invalid input, I/O failure, or unsupported CLI usage.
- `2`: valid analysis with at least one disagreement (default CI behavior).

`--fail-on never` converts a valid finding from exit 2 to exit 0 while keeping
the finding in all outputs.

## Non-goals

- Sending test requests or resolving DNS.
- Editing environment variables, proxy settings, certificates, or firewalls.
- Predicting application-level proxy overrides.
- Treating this model as a substitute for a runtime capture from a named client
  version.

## v0.1.0 success criteria

1. The split-brain fixture produces at least one DIRECT/PROXY disagreement.
2. The portable fixture produces five agreeing decisions for every target.
3. Unit tests cover case precedence, leading dots, wildcard, CIDR, ports,
   loopback, CGI, redaction, validation, CLI exit codes, and HTML escaping.
4. `npm run check` passes from a clean checkout on Node 22+.
5. The packed tarball installs into a temporary directory and runs the example.
6. GitHub CI passes on Linux and Windows; tag `v0.1.0` has a public Release and
   the tested `.tgz` asset.
