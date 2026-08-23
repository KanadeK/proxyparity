# Research and novelty record

Research snapshot: 2026-08-23.

## Selection process

The workspace inventory already contains many local-first developer utilities,
release checkers, structured-input reporters, security scanners, and domain
preflight tools. No existing project in the workspace models proxy environment
semantics or cross-runtime `NO_PROXY` decisions.

Two earlier candidates were rejected before implementation:

- Unicode source-code security inspection: mature Trojan Source scanners and
  language-specific linters already occupy the obvious product surface.
- iCalendar anonymization: an exact-purpose open-source project already exists.

ProxyParity survived because the underlying problem is documented and costly,
while the searched repositories were implementations for one runtime, proxy
servers, or unrelated projects—not a five-client offline decision matrix.

## GitHub collision checks

Repository-name and description searches were run for:

- `ProxyParity in:name` — zero repositories.
- `"NO_PROXY" curl wget python go ruby` — zero repositories.
- `"NO_PROXY" debugger` — no relevant cross-client debugger in the first page.
- `proxy-from-env in:name`, `no_proxy in:name`, and `noproxy in:name` — adjacent
  libraries, proxy servers, tutorials, and unrelated applications.

The closest useful adjacent project is
[`Rob--W/proxy-from-env`](https://github.com/Rob--W/proxy-from-env), which returns
a proxy for a URL according to one JavaScript library's rules. ProxyParity does
not replace it: it compares five deliberately different client profiles,
explains every branch, detects disagreement, and emits incident artifacts.

Search coverage cannot prove that no similar repository exists anywhere. It
does establish that the exact name is unused and that no highly similar mature
project appeared across exact-name, purpose, feature-combination, and adjacent
implementation queries at the research date.

## Evidence that the problem is real

GitLab documented a customer incident where conflicting lowercase and uppercase
proxy variables made Go and Ruby services choose different routes. The same
article states that no standard defines these variables and compares leading
dots, wildcard, CIDR, suffix, loopback, DNS, and case behavior:

- [GitLab: We need to talk—Can we standardize NO_PROXY?](https://about.gitlab.com/blog/we-need-to-talk-no-proxy/)

That article is the product signal, not the executable specification. Each
profile below follows the corresponding primary source, because behavior can
change after a comparison article is published.

## Primary behavior sources

### curl

- [Everything curl: proxy environment variables](https://everything.curl.dev/usingcurl/proxies/env.html)

Modeled branches: lowercase-only `http_proxy`, uppercase support for other
schemes, `NO_PROXY=*`, leading-dot domain behavior, and CIDR support introduced
in curl 7.86.0.

### GNU Wget

- [Wget `retr.c`: proxy selection and `no_proxy_match`](https://github.com/mirror/wget/blob/master/src/retr.c)
- [Wget `init.c`: lowercase `no_proxy` ingestion](https://github.com/mirror/wget/blob/master/src/init.c)

Modeled branches: lowercase-only proxy variables, lowercase-only `no_proxy`,
and suffix matching without removing a leading dot.

### CPython `urllib`

- [CPython `urllib.request`](https://github.com/python/cpython/blob/main/Lib/urllib/request.py)
- [CPython proxy tests](https://github.com/python/cpython/blob/main/Lib/test/test_urllib.py)

Modeled branches: lowercase precedence, uppercase HTTP removal in a CGI
environment, exact/subdomain and optional-port matching, and the special sole
`*` value.

### Go `net/http`

- [Go's vendored `httpproxy` implementation](https://github.com/golang/go/blob/master/src/vendor/golang.org/x/net/http/httpproxy/proxy.go)

Modeled branches: uppercase precedence, CIDR/IP/domain/port matchers,
subdomain-only leading-dot rules, `*`, localhost and loopback bypass, and the
CGI proxy error that occurs before exclusion matching.

### Ruby `URI`

- [Ruby URI `URI::Generic`](https://github.com/ruby/uri/blob/master/lib/uri/generic.rb)

Modeled branches: lowercase precedence, CGI-specific HTTP selection, optional
ports, DNS-aware IP/CIDR matching, and loopback bypass after resolution.

## Product tradeoffs

- A deterministic model is more shareable and CI-friendly than launching five
  external clients, but it must state its source snapshot and cannot predict
  application overrides.
- Ruby behavior depends on DNS. ProxyParity accepts explicit `resolvedIps`
  rather than performing a lookup, which keeps reports reproducible and avoids
  leaking target names.
- A five-client scope creates a strong comparison without pretending to cover
  Java, browsers, package managers, containers, or every historic version.
- Star potential comes from a recognizable operational failure, a copyable
  one-command demo, and a visual disagreement artifact. Popularity remains an
  external outcome rather than a release acceptance criterion.
