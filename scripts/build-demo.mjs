import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeScenario } from "../src/analyze.mjs";
import { renderConsole } from "../src/render-console.mjs";
import { renderHtml } from "../src/render-html.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scenarioPath = path.join(root, "examples", "split-brain.json");
const outputDirectory = path.join(root, "build", "demo");
const scenario = JSON.parse(await readFile(scenarioPath, "utf8"));
const report = analyzeScenario(scenario);

if (report.summary.disagreementCount === 0) {
  throw new Error("The split-brain demo must contain at least one disagreement");
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
await writeFile(path.join(outputDirectory, "report.txt"), renderConsole(report), "utf8");
await writeFile(
  path.join(outputDirectory, "index.html"),
  renderHtml(report, { title: "One NO_PROXY. Five clients. Different answers." }),
  "utf8",
);

process.stdout.write(
  `Built demo with ${report.summary.disagreementCount} disagreements in ${outputDirectory}\n`,
);
