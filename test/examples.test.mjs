import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { analyzeScenario } from "../src/analyze.mjs";

async function analyzeExample(name) {
  const source = await readFile(new URL(`../examples/${name}`, import.meta.url), "utf8");
  return analyzeScenario(JSON.parse(source));
}

test("split-brain example demonstrates several real disagreement classes", async () => {
  const report = await analyzeExample("split-brain.json");

  assert.ok(report.summary.disagreementCount >= 4);
  assert.ok(report.targets.every((target) => target.decisions.length === 5));
  assert.ok(report.findings.some((finding) => finding.code === "CASE_CONFLICT"));
  assert.ok(report.findings.some((finding) => finding.code === "ROUTE_DISAGREEMENT"));
  assert.ok(
    report.findings.some((finding) => finding.code === "PROXY_ENDPOINT_DISAGREEMENT"),
  );
});

test("portable example is the lowest-common-denominator control", async () => {
  const report = await analyzeExample("portable.json");

  assert.equal(report.summary.disagreementCount, 0);
  assert.equal(report.findings.length, 0);
  assert.equal(report.summary.agreementCount, report.summary.targetCount);
});
