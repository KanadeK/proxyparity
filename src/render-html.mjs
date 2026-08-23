function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decisionEvidence(decision) {
  if (decision.route === "PROXY") {
    return `<strong>${escapeHtml(decision.proxyVariable)}</strong><span>${escapeHtml(decision.proxyUrl)}</span>`;
  }
  if (decision.matchedRule !== null) {
    return `<strong>${escapeHtml(decision.noProxyVariable)}</strong><span>matched ${escapeHtml(JSON.stringify(decision.matchedRule))}</span>`;
  }
  return `<span>${escapeHtml(decision.reason)}</span>`;
}

function renderTarget(target, profileNames, index) {
  const rows = target.decisions
    .map(
      (decision) => `
            <tr>
              <th scope="row">
                <span class="client">${escapeHtml(profileNames.get(decision.profileId) ?? decision.profileId)}</span>
                <code>${escapeHtml(decision.profileId)}</code>
              </th>
              <td><span class="route route-${decision.route.toLowerCase()}">${escapeHtml(decision.route)}</span></td>
              <td class="evidence">${decisionEvidence(decision)}</td>
              <td class="reason">${escapeHtml(decision.reason)}</td>
            </tr>`,
    )
    .join("");

  return `
      <section class="target-card">
        <div class="target-heading">
          <div>
            <span class="eyebrow">Target ${index + 1}</span>
            <h2>${escapeHtml(target.hostname)}<span>:${escapeHtml(target.port)}</span></h2>
            <p class="target-url">${escapeHtml(target.url)}</p>
          </div>
          <span class="agreement ${target.agreement ? "is-agree" : "is-disagree"}">${target.agreement ? "AGREE" : "DISAGREE"}</span>
        </div>
        <div class="table-wrap">
          <table>
            <caption>Proxy route decisions for ${escapeHtml(target.url)}</caption>
            <thead><tr><th>Client</th><th>Route</th><th>Evidence</th><th>Why</th></tr></thead>
            <tbody>${rows}
            </tbody>
          </table>
        </div>
      </section>`;
}

export function renderHtml(report, { title = "ProxyParity report" } = {}) {
  const profileNames = new Map(report.profiles.map((profile) => [profile.id, profile.name]));
  const findings = report.findings.length
    ? report.findings
        .map(
          (finding) => `
          <li class="finding finding-${escapeHtml(finding.severity)}">
            <code>${escapeHtml(finding.code)}</code>
            <span>${escapeHtml(finding.message)}</span>
            ${finding.targetUrl ? `<small>${escapeHtml(finding.targetUrl)}</small>` : ""}
          </li>`,
        )
        .join("")
    : '<li class="finding finding-clear"><code>CLEAR</code><span>No cross-client differences detected.</span></li>';
  const profileSources = report.profiles
    .map(
      (profile) => `
        <li><a href="${escapeHtml(profile.source)}">${escapeHtml(profile.name)}</a><span>${escapeHtml(profile.baseline)}</span></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --ink:#eef7f3; --muted:#92a7a0; --panel:#111b1a; --line:#263b36; --mint:#6fffc1; --amber:#ffcc66; --red:#ff6b7d; --blue:#78a9ff; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:#08100f; font:15px/1.55 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace; }
    body::before { content:""; position:fixed; inset:0; pointer-events:none; background:radial-gradient(circle at 80% 0%,rgba(111,255,193,.10),transparent 34rem),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px); background-size:auto,32px 32px,32px 32px; }
    main { position:relative; width:min(1180px,calc(100% - 32px)); margin:0 auto; padding:64px 0 88px; }
    .eyebrow { color:var(--mint); font-size:12px; letter-spacing:.16em; text-transform:uppercase; }
    h1,h2,p { margin-top:0; }
    h1 { max-width:850px; margin-bottom:16px; font:700 clamp(40px,7vw,76px)/.98 Inter,system-ui,sans-serif; letter-spacing:-.055em; }
    .lede { max-width:760px; color:var(--muted); font:18px/1.6 Inter,system-ui,sans-serif; }
    .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:40px 0; }
    .metric { min-height:126px; padding:20px; border:1px solid var(--line); border-radius:16px; background:rgba(17,27,26,.9); box-shadow:0 18px 60px rgba(0,0,0,.18); }
    .metric strong { display:block; margin-top:10px; font:700 38px/1 Inter,system-ui,sans-serif; }
    .metric span { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.12em; }
    .metric.is-alert strong { color:var(--red); }
    .section-title { margin:48px 0 16px; font:700 22px/1.2 Inter,system-ui,sans-serif; }
    .findings { display:grid; gap:8px; padding:0; list-style:none; }
    .finding { display:grid; grid-template-columns:max-content 1fr; gap:3px 16px; padding:14px 16px; border:1px solid var(--line); border-left:3px solid var(--amber); border-radius:10px; background:rgba(17,27,26,.82); }
    .finding-error { border-left-color:var(--red); }
    .finding-clear { border-left-color:var(--mint); }
    .finding code { color:var(--amber); }
    .finding-error code { color:var(--red); }
    .finding-clear code { color:var(--mint); }
    .finding small { grid-column:2; color:var(--muted); overflow-wrap:anywhere; }
    .target-card { margin-top:18px; overflow:hidden; border:1px solid var(--line); border-radius:18px; background:rgba(17,27,26,.94); box-shadow:0 22px 70px rgba(0,0,0,.24); }
    .target-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:24px; border-bottom:1px solid var(--line); }
    .target-heading h2 { margin:6px 0 4px; font:700 24px/1.2 Inter,system-ui,sans-serif; }
    .target-heading h2 span { color:var(--muted); font-weight:500; }
    .target-url { margin:0; color:var(--muted); overflow-wrap:anywhere; }
    .agreement,.route { display:inline-flex; align-items:center; justify-content:center; border:1px solid currentColor; border-radius:999px; font-weight:700; letter-spacing:.08em; }
    .agreement { padding:7px 11px; font-size:11px; }
    .is-agree { color:var(--mint); } .is-disagree { color:var(--red); }
    .table-wrap { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; }
    caption { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
    th,td { padding:16px 18px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    thead th { color:var(--muted); font-size:11px; letter-spacing:.12em; text-transform:uppercase; }
    tbody tr:last-child th,tbody tr:last-child td { border-bottom:0; }
    tbody th { min-width:138px; }
    .client { display:block; font-weight:700; } tbody th code { color:var(--muted); font-size:11px; }
    .route { min-width:78px; padding:4px 8px; font-size:11px; }
    .route-direct { color:var(--mint); } .route-proxy { color:var(--blue); } .route-error { color:var(--red); }
    .evidence { min-width:240px; } .evidence strong,.evidence span { display:block; overflow-wrap:anywhere; } .evidence span { color:var(--muted); }
    .reason { min-width:280px; color:var(--muted); }
    .sources { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; padding:0; list-style:none; }
    .sources li { padding:14px; border:1px solid var(--line); border-radius:10px; background:rgba(17,27,26,.65); }
    .sources a { display:block; color:var(--mint); text-decoration:none; font-weight:700; }
    .sources span { color:var(--muted); font-size:11px; }
    footer { margin-top:48px; color:var(--muted); }
    @media (max-width:800px) { main { padding-top:36px; } .summary { grid-template-columns:1fr 1fr; } .sources { grid-template-columns:1fr 1fr; } .target-heading { flex-direction:column; } }
    @media (max-width:480px) { .summary,.sources { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">Offline proxy semantics audit</span>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">One environment, five client implementations. This report shows exactly where their DIRECT, PROXY, and ERROR decisions diverge.</p>
    </header>
    <section class="summary" aria-label="Summary">
      <div class="metric"><span>Targets</span><strong>${escapeHtml(report.summary.targetCount)}</strong></div>
      <div class="metric"><span>Agreements</span><strong>${escapeHtml(report.summary.agreementCount)}</strong></div>
      <div class="metric is-alert"><span>Disagreements</span><strong>${escapeHtml(report.summary.disagreementCount)}</strong></div>
      <div class="metric is-alert"><span>Client errors</span><strong>${escapeHtml(report.summary.errorCount)}</strong></div>
    </section>
    <h2 class="section-title">Findings</h2>
    <ul class="findings">${findings}
    </ul>
    <h2 class="section-title">Decision matrix</h2>
    ${report.targets.map((target, index) => renderTarget(target, profileNames, index)).join("")}
    <h2 class="section-title">Behavior sources</h2>
    <ul class="sources">${profileSources}
    </ul>
    <footer>Generated offline by ProxyParity. No target requests or DNS lookups were performed.</footer>
  </main>
</body>
</html>
`;
}
