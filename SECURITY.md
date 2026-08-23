# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| Older or unreleased snapshots | No |

## Report a vulnerability

Use GitHub's **Report a vulnerability** link in the repository Security tab.
Do not open a public issue for credential exposure, report injection, path
handling, or package-supply-chain findings.

Include the affected version, operating system, minimal reproduction, impact,
and whether the reproduction contains synthetic or real secrets. Do not send
live proxy credentials.

## Security boundaries

ProxyParity:

- reads only the scenario path explicitly passed to `audit`;
- accepts only named proxy-related environment keys;
- rejects target URL credentials;
- redacts proxy URL userinfo from console, JSON, and HTML;
- escapes every report value in HTML;
- generates script-free HTML;
- performs no target requests, DNS lookups, or system proxy changes.

The CLI writes `report.json` and `report.html` only inside the user-supplied
output directory. That directory is trusted as an explicit command boundary.

ProxyParity is a deterministic model, not a network sandbox. Applications can
override standard-library behavior, and future client versions can change. Use
the report to inspect configuration before deployment, then validate critical
production paths with the actual pinned runtime.
