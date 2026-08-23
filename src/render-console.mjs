function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function evidenceFor(decision) {
  if (decision.route === "PROXY") {
    return `${decision.proxyVariable} -> ${decision.proxyUrl}`;
  }
  if (decision.matchedRule !== null) {
    return `${decision.noProxyVariable} matched ${JSON.stringify(decision.matchedRule)}`;
  }
  return decision.reason;
}

export function renderConsole(report) {
  const lines = [
    "ProxyParity",
    `${plural(report.summary.targetCount, "target")} | ${plural(report.summary.disagreementCount, "disagreement")} | ${plural(report.summary.errorCount, "client error")}`,
    "",
  ];

  for (const target of report.targets) {
    lines.push(`Target: ${target.url} [${target.agreement ? "AGREE" : "DISAGREE"}]`);
    lines.push(`${"CLIENT".padEnd(10)} ${"ROUTE".padEnd(8)} EVIDENCE`);
    for (const decision of target.decisions) {
      lines.push(
        `${decision.profileId.padEnd(10)} ${decision.route.padEnd(8)} ${evidenceFor(decision)}`,
      );
    }
    lines.push("");
  }

  if (report.findings.length > 0) {
    lines.push("Findings:");
    for (const finding of report.findings) {
      const target = finding.targetUrl ? ` (${finding.targetUrl})` : "";
      lines.push(`- ${finding.code}${target}: ${finding.message}`);
    }
  } else {
    lines.push("Findings: none");
  }

  return `${lines.join("\n")}\n`;
}
