import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "bin", "proxyparity.mjs");

function run(args, cwd = root) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

async function writeScenario(directory, name, scenario) {
  const filename = path.join(directory, name);
  await writeFile(filename, JSON.stringify(scenario), "utf8");
  return filename;
}

test("audit exits 2 when clients disagree", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "proxyparity-cli-"));
  const scenario = await writeScenario(directory, "split.json", {
    schemaVersion: 1,
    environment: {
      http_proxy: "http://lower.proxy:8080",
      HTTP_PROXY: "http://upper.proxy:8080",
    },
    targets: [{ url: "http://public.example" }],
  });

  const result = run(["audit", scenario]);

  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /DISAGREE/);
  assert.match(result.stdout, /PROXY_ENDPOINT_DISAGREEMENT/);
});

test("audit writes redacted JSON and standalone HTML artifacts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "proxyparity-output-"));
  const output = path.join(directory, "report");
  const scenario = await writeScenario(directory, "credentials.json", {
    schemaVersion: 1,
    environment: {
      https_proxy: "http://alice:s3cret@proxy.example:8080",
    },
    targets: [{ url: "https://public.example" }],
  });

  const result = run([
    "audit",
    scenario,
    "--output-dir",
    output,
    "--fail-on",
    "never",
  ]);
  const json = await readFile(path.join(output, "report.json"), "utf8");
  const html = await readFile(path.join(output, "report.html"), "utf8");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Wrote .*report\.json/);
  assert.doesNotMatch(json, /alice|s3cret/);
  assert.doesNotMatch(html, /alice|s3cret/);
  assert.match(html, /^<!doctype html>/i);
});

test("portable audit exits 0 and JSON output stays machine-readable", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "proxyparity-clean-"));
  const scenario = await writeScenario(directory, "portable.json", {
    schemaVersion: 1,
    environment: {
      https_proxy: "http://proxy.example:8080",
      no_proxy: "internal.example",
    },
    targets: [
      { url: "https://api.internal.example" },
      { url: "https://public.example" },
    ],
  });

  const result = run(["audit", scenario, "--format", "json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.summary.agreementCount, 2);
  assert.equal(report.summary.disagreementCount, 0);
});

test("profiles and version commands expose pinned release metadata", () => {
  const profiles = run(["profiles", "--json"]);
  const version = run(["--version"]);

  assert.equal(profiles.status, 0, profiles.stderr);
  assert.equal(JSON.parse(profiles.stdout).length, 5);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), "0.1.0");
});

test("invalid JSON and unsupported options exit 1 with actionable errors", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "proxyparity-invalid-"));
  const invalid = path.join(directory, "invalid.json");
  await writeFile(invalid, "{ definitely not json", "utf8");

  const jsonResult = run(["audit", invalid]);
  const optionResult = run(["audit", invalid, "--mystery"]);

  assert.equal(jsonResult.status, 1);
  assert.match(jsonResult.stderr, /Invalid JSON/);
  assert.equal(optionResult.status, 1);
  assert.match(optionResult.stderr, /Unknown option: --mystery/);
});
