import { createRequire } from "node:module";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { analyzeScenario } from "./analyze.mjs";
import { PROFILES } from "./profiles.mjs";
import { renderConsole } from "./render-console.mjs";
import { renderHtml } from "./render-html.mjs";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
const MAX_SCENARIO_BYTES = 1024 * 1024;

const HELP = `ProxyParity ${version}

Explain how five clients route the same proxy environment.

Usage:
  proxyparity audit <scenario.json> [options]
  proxyparity profiles [--json]
  proxyparity --version

Audit options:
  --format <console|json>       stdout format (default: console)
  --output-dir <directory>     write report.json and report.html
  --fail-on <disagreement|never>
                                exit 2 on disagreement (default: disagreement)
  -h, --help                   show this help

Exit codes: 0 clean, 1 invalid input or I/O error, 2 valid disagreement.
`;

function takeValue(args, index, option) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new TypeError(`${option} requires a value`);
  }
  return value;
}

function parseAuditArguments(args) {
  if (args.length === 0 || args[0].startsWith("-")) {
    throw new TypeError("audit requires a scenario JSON path");
  }
  const options = {
    scenarioPath: args[0],
    format: "console",
    outputDir: null,
    failOn: "disagreement",
  };

  for (let index = 1; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--format") {
      options.format = takeValue(args, index, option);
      index += 1;
      if (options.format !== "console" && options.format !== "json") {
        throw new TypeError("--format must be console or json");
      }
    } else if (option === "--output-dir") {
      options.outputDir = takeValue(args, index, option);
      index += 1;
    } else if (option === "--fail-on") {
      options.failOn = takeValue(args, index, option);
      index += 1;
      if (options.failOn !== "disagreement" && options.failOn !== "never") {
        throw new TypeError("--fail-on must be disagreement or never");
      }
    } else {
      throw new TypeError(`Unknown option: ${option}`);
    }
  }
  return options;
}

async function readScenario(filename) {
  const metadata = await stat(filename);
  if (metadata.size > MAX_SCENARIO_BYTES) {
    throw new TypeError(`Scenario exceeds ${MAX_SCENARIO_BYTES} bytes: ${filename}`);
  }
  const source = await readFile(filename, "utf8");
  try {
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SyntaxError(`Invalid JSON in ${filename}: ${error.message}`);
    }
    throw error;
  }
}

async function writeArtifacts(report, directory, scenarioPath, stderr) {
  const resolved = path.resolve(directory);
  const jsonPath = path.join(resolved, "report.json");
  const htmlPath = path.join(resolved, "report.html");
  await mkdir(resolved, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(
    htmlPath,
    renderHtml(report, { title: `ProxyParity: ${path.basename(scenarioPath)}` }),
    "utf8",
  );
  stderr.write(`Wrote ${jsonPath}\nWrote ${htmlPath}\n`);
}

function writeProfiles(args, stdout) {
  if (args.length === 1 && args[0] === "--json") {
    stdout.write(`${JSON.stringify(PROFILES, null, 2)}\n`);
    return 0;
  }
  if (args.length > 0) {
    throw new TypeError(`Unknown option: ${args[0]}`);
  }
  stdout.write("CLIENT     BASELINE\n");
  for (const profile of PROFILES) {
    stdout.write(`${profile.id.padEnd(10)} ${profile.baseline}\n`);
  }
  return 0;
}

export async function runCli(
  args,
  { stdout = process.stdout, stderr = process.stderr } = {},
) {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    stdout.write(HELP);
    return 0;
  }
  if (args[0] === "--version") {
    if (args.length > 1) {
      throw new TypeError(`Unknown option: ${args[1]}`);
    }
    stdout.write(`${version}\n`);
    return 0;
  }
  if (args[0] === "profiles") {
    return writeProfiles(args.slice(1), stdout);
  }
  if (args[0] !== "audit") {
    throw new TypeError(`Unknown command: ${args[0]}`);
  }

  const options = parseAuditArguments(args.slice(1));
  const scenarioPath = path.resolve(options.scenarioPath);
  const report = analyzeScenario(await readScenario(scenarioPath));
  if (options.format === "json") {
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    stdout.write(renderConsole(report));
  }
  if (options.outputDir !== null) {
    await writeArtifacts(report, options.outputDir, scenarioPath, stderr);
  }

  return options.failOn === "disagreement" && report.summary.disagreementCount > 0 ? 2 : 0;
}
