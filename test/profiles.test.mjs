import assert from "node:assert/strict";
import { test } from "node:test";

import { PROFILE_IDS, evaluateProfile } from "../src/profiles.mjs";
import { normalizeTarget } from "../src/scenario.mjs";

function evaluateAll(environment, targetInput = { url: "http://public.example/resource" }) {
  const target = normalizeTarget(targetInput, 0);
  return Object.fromEntries(
    PROFILE_IDS.map((profileId) => [
      profileId,
      evaluateProfile(profileId, target, environment),
    ]),
  );
}

test("proxy variable precedence is client-specific", () => {
  const result = evaluateAll({
    http_proxy: "http://lower.proxy:8080",
    HTTP_PROXY: "http://upper.proxy:8080",
  });

  for (const profileId of ["curl", "wget", "python", "ruby"]) {
    assert.equal(result[profileId].proxyVariable, "http_proxy");
    assert.equal(result[profileId].proxyUrl, "http://lower.proxy:8080/");
  }
  assert.equal(result.go.proxyVariable, "HTTP_PROXY");
  assert.equal(result.go.proxyUrl, "http://upper.proxy:8080/");
});

test("uppercase HTTP_PROXY support differs outside CGI", () => {
  const result = evaluateAll({ HTTP_PROXY: "http://upper.proxy:8080" });

  assert.equal(result.curl.route, "DIRECT");
  assert.equal(result.wget.route, "DIRECT");
  for (const profileId of ["python", "go", "ruby"]) {
    assert.equal(result[profileId].route, "PROXY");
  }
});

test("leading-dot rules disagree for a root domain but agree for a subdomain", () => {
  const environment = {
    http_proxy: "http://proxy.example:8080",
    no_proxy: ".internal.example",
  };
  const root = evaluateAll(environment, { url: "http://internal.example" });
  const subdomain = evaluateAll(environment, { url: "http://api.internal.example" });

  for (const profileId of ["curl", "python"]) {
    assert.equal(root[profileId].route, "DIRECT");
  }
  for (const profileId of ["wget", "go", "ruby"]) {
    assert.equal(root[profileId].route, "PROXY");
  }
  for (const profileId of PROFILE_IDS) {
    assert.equal(subdomain[profileId].route, "DIRECT");
    assert.equal(subdomain[profileId].matchedRule, ".internal.example");
  }
});

test("wildcard handling distinguishes Python's sole-star rule", () => {
  const listed = evaluateAll({
    http_proxy: "http://proxy.example:8080",
    no_proxy: "*,internal.example",
  });

  assert.equal(listed.curl.route, "DIRECT");
  assert.equal(listed.go.route, "DIRECT");
  for (const profileId of ["wget", "python", "ruby"]) {
    assert.equal(listed[profileId].route, "PROXY");
  }

  const sole = evaluateAll({
    http_proxy: "http://proxy.example:8080",
    no_proxy: "*",
  });
  assert.equal(sole.python.route, "DIRECT");
});

test("Ruby accepts whitespace-separated no_proxy entries", () => {
  const result = evaluateAll(
    {
      http_proxy: "http://proxy.example:8080",
      no_proxy: "first.example second.example",
    },
    { url: "http://second.example" },
  );

  assert.equal(result.ruby.route, "DIRECT");
  assert.equal(result.ruby.matchedRule, "second.example");
  assert.equal(result.python.route, "PROXY");
});

test("CIDR against a hostname uses Ruby's supplied DNS result only", () => {
  const result = evaluateAll(
    {
      http_proxy: "http://proxy.example:8080",
      no_proxy: "10.0.0.0/8",
    },
    { url: "http://service.example", resolvedIps: ["10.42.7.18"] },
  );

  assert.equal(result.ruby.route, "DIRECT");
  for (const profileId of ["curl", "wget", "python", "go"]) {
    assert.equal(result[profileId].route, "PROXY");
  }
});

test("CIDR against a literal IP is supported only by current curl, Go, and Ruby", () => {
  const result = evaluateAll(
    {
      http_proxy: "http://proxy.example:8080",
      no_proxy: "10.0.0.0/8",
    },
    { url: "http://10.42.7.18" },
  );

  for (const profileId of ["curl", "go", "ruby"]) {
    assert.equal(result[profileId].route, "DIRECT");
  }
  for (const profileId of ["wget", "python"]) {
    assert.equal(result[profileId].route, "PROXY");
  }
});

test("optional-port rules are interpreted by Python, Go, and Ruby", () => {
  const result = evaluateAll(
    {
      http_proxy: "http://proxy.example:8080",
      no_proxy: "api.example:8443",
    },
    { url: "http://api.example:8443/health" },
  );

  for (const profileId of ["python", "go", "ruby"]) {
    assert.equal(result[profileId].route, "DIRECT");
  }
  assert.equal(result.curl.route, "PROXY");
  assert.equal(result.wget.route, "PROXY");
});

test("Go and Ruby bypass literal loopback without a NO_PROXY rule", () => {
  const result = evaluateAll(
    { http_proxy: "http://proxy.example:8080" },
    { url: "http://127.0.0.1:9000" },
  );

  assert.equal(result.go.route, "DIRECT");
  assert.equal(result.ruby.route, "DIRECT");
  for (const profileId of ["curl", "wget", "python"]) {
    assert.equal(result[profileId].route, "PROXY");
  }
});

test("Go returns its CGI proxy error before applying NO_PROXY", () => {
  const result = evaluateAll({
    HTTP_PROXY: "http://upper.proxy:8080",
    NO_PROXY: "*",
    REQUEST_METHOD: "GET",
  });

  assert.equal(result.go.route, "ERROR");
  assert.match(result.go.reason, /CGI/);
  assert.equal(result.ruby.route, "DIRECT");
  assert.equal(result.python.route, "DIRECT");
});

test("proxy credentials are redacted from decisions", () => {
  const result = evaluateAll({
    http_proxy: "http://alice:s3cret@proxy.example:8080",
  });

  assert.equal(result.curl.route, "PROXY");
  assert.doesNotMatch(result.curl.proxyUrl, /alice|s3cret/);
  assert.match(result.curl.proxyUrl, /\*\*\*/);
});
