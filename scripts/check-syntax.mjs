import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectories = ["bin", "src", "scripts", "test"];

async function collectModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const modules = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      modules.push(...(await collectModules(absolute)));
    } else if (entry.name.endsWith(".mjs")) {
      modules.push(absolute);
    }
  }
  return modules;
}

const modules = (
  await Promise.all(sourceDirectories.map((directory) => collectModules(path.join(root, directory))))
)
  .flat()
  .sort();

for (const modulePath of modules) {
  const result = spawnSync(process.execPath, ["--check", modulePath], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (process.exitCode === undefined) {
  process.stdout.write(`Syntax checked ${modules.length} modules\n`);
}
