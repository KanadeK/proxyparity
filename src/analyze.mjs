import { PROFILES, PROFILE_IDS, evaluateProfile } from "./profiles.mjs";
import { validateScenario } from "./scenario.mjs";

function findCaseConflicts(environment) {
  const findings = [];
  for (const [lower, upper] of [
    ["http_proxy", "HTTP_PROXY"],
    ["https_proxy", "HTTPS_PROXY"],
    ["no_proxy", "NO_PROXY"],
  ]) {
    if (
      Object.hasOwn(environment, lower) &&
      Object.hasOwn(environment, upper) &&
      environment[lower] !== environment[upper]
    ) {
      findings.push({
        code: "CASE_CONFLICT",
        severity: "warning",
        variables: [lower, upper],
        message: `${lower} and ${upper} are both set to different values.`,
      });
    }
  }
  return findings;
}

function decisionFingerprint(decision) {
  return decision.route === "PROXY" ? `PROXY:${decision.proxyUrl}` : decision.route;
}

export function analyzeScenario(input) {
  const scenario = validateScenario(input);
  const findings = findCaseConflicts(scenario.environment);
  const targets = scenario.targets.map((target) => {
    const decisions = PROFILE_IDS.map((profileId) =>
      evaluateProfile(profileId, target, scenario.environment),
    );
    const fingerprints = new Set(decisions.map(decisionFingerprint));
    const routes = new Set(decisions.map((decision) => decision.route));
    const proxyUrls = new Set(
      decisions
        .filter((decision) => decision.route === "PROXY")
        .map((decision) => decision.proxyUrl),
    );

    if (routes.size > 1) {
      findings.push({
        code: "ROUTE_DISAGREEMENT",
        severity: "error",
        targetUrl: target.url,
        message: "Clients disagree between DIRECT, PROXY, or ERROR routes.",
      });
    }
    if (proxyUrls.size > 1) {
      findings.push({
        code: "PROXY_ENDPOINT_DISAGREEMENT",
        severity: "error",
        targetUrl: target.url,
        message: "Clients select different proxy endpoints.",
      });
    }

    return {
      url: target.url,
      hostname: target.hostname,
      port: target.port,
      resolvedIps: target.resolvedIps,
      agreement: fingerprints.size === 1,
      decisions,
    };
  });

  const disagreementCount = targets.filter((target) => !target.agreement).length;
  const errorCount = targets.reduce(
    (total, target) =>
      total + target.decisions.filter((decision) => decision.route === "ERROR").length,
    0,
  );

  return {
    reportVersion: 1,
    profiles: PROFILES.map((profile) => ({ ...profile })),
    targets,
    findings,
    summary: {
      targetCount: targets.length,
      agreementCount: targets.length - disagreementCount,
      disagreementCount,
      errorCount,
      warningCount: findings.filter((finding) => finding.severity === "warning").length,
    },
  };
}
