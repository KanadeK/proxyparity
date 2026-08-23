import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeScenario } from "../src/analyze.mjs";
import { validateScenario } from "../src/scenario.mjs";

test("validation rejects unsupported boundaries with a precise path", () => {
  assert.throws(
    () =>
      validateScenario({
        schemaVersion: 1,
        environment: { PATH: "not accepted" },
        targets: [{ url: "https://example.com" }],
      }),
    /environment\.PATH is not supported/,
  );

  assert.throws(
    () =>
      validateScenario({
        schemaVersion: 1,
        environment: {},
        targets: [{ url: "ftp://example.com" }],
      }),
    /targets\[0\]\.url must use http or https/,
  );

  assert.throws(
    () =>
      validateScenario({
        schemaVersion: 1,
        environment: {},
        targets: [{ url: "https://alice:secret@example.com" }],
      }),
    /must not contain credentials/,
  );
});

test("validation rejects invalid resolved IPs", () => {
  assert.throws(
    () =>
      validateScenario({
        schemaVersion: 1,
        environment: {},
        targets: [{ url: "https://example.com", resolvedIps: ["not-an-ip"] }],
      }),
    /resolvedIps\[0\] must be an IPv4 or IPv6 address/,
  );
});

test("validation rejects malformed proxy endpoints at the environment boundary", () => {
  assert.throws(
    () =>
      validateScenario({
        schemaVersion: 1,
        environment: { https_proxy: "http://" },
        targets: [{ url: "https://example.com" }],
      }),
    /environment\.https_proxy must be a proxy URL or host:port/,
  );
});

test("analysis counts endpoint and route disagreements", () => {
  const report = analyzeScenario({
    schemaVersion: 1,
    environment: {
      http_proxy: "http://lower.proxy:8080",
      HTTP_PROXY: "http://upper.proxy:8080",
      no_proxy: ".internal.example",
      NO_PROXY: "other.example",
    },
    targets: [
      { url: "http://internal.example" },
      { url: "http://public.example" },
    ],
  });

  assert.equal(report.targets.length, 2);
  assert.equal(report.targets[0].decisions.length, 5);
  assert.equal(report.targets[0].agreement, false);
  assert.equal(report.targets[1].agreement, false);
  assert.equal(report.summary.targetCount, 2);
  assert.equal(report.summary.disagreementCount, 2);
  assert.equal(report.summary.agreementCount, 0);
  assert.ok(report.findings.some((finding) => finding.code === "CASE_CONFLICT"));
  assert.ok(report.findings.some((finding) => finding.code === "ROUTE_DISAGREEMENT"));
  assert.ok(
    report.findings.some((finding) => finding.code === "PROXY_ENDPOINT_DISAGREEMENT"),
  );
});

test("a portable scenario reports complete agreement", () => {
  const report = analyzeScenario({
    schemaVersion: 1,
    environment: {
      http_proxy: "http://proxy.example:8080",
      https_proxy: "http://proxy.example:8080",
      no_proxy: "localhost,internal.example",
    },
    targets: [
      { url: "https://api.internal.example" },
      { url: "https://public.example" },
    ],
  });

  assert.equal(report.summary.agreementCount, 2);
  assert.equal(report.summary.disagreementCount, 0);
  assert.equal(report.findings.length, 0);
});
