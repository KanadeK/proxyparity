import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const npmCache = path.join(root, "build", "npm-cache");
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error("Run the package smoke test with npm run pack:check");
}

function run(command, args, cwd, environment = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: environment,
    windowsHide: true,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
  return result.stdout;
}

function runNpm(args, cwd) {
  return run(process.execPath, [npmCli, ...args], cwd, {
    ...process.env,
    npm_config_cache: npmCache,
  });
}

await mkdir(dist, { recursive: true });
const packOutput = runNpm(["pack", "--ignore-scripts", "--pack-destination", dist], root);
const tarballName = packOutput.trim().split(/\r?\n/).at(-1);
const tarballPath = path.join(dist, tarballName);
const temporaryProject = await mkdtemp(path.join(tmpdir(), "proxyparity-package-"));

try {
  await writeFile(
    path.join(temporaryProject, "package.json"),
    '{"name":"proxyparity-package-smoke","private":true}\n',
    "utf8",
  );
  runNpm(
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath],
    temporaryProject,
  );

  const installedBin = path.join(
    temporaryProject,
    "node_modules",
    "proxyparity",
    "bin",
    "proxyparity.mjs",
  );
  const version = run(process.execPath, [installedBin, "--version"], temporaryProject).trim();
  if (version !== "0.1.0") {
    throw new Error(`Packed CLI returned unexpected version: ${version}`);
  }

  const portable = JSON.parse(
    run(
      process.execPath,
      [installedBin, "audit", path.join(root, "examples", "portable.json"), "--format", "json"],
      temporaryProject,
    ),
  );
  if (portable.summary.disagreementCount !== 0) {
    throw new Error("Packed CLI disagreed on the portable example");
  }

  const splitBrain = JSON.parse(
    run(
      process.execPath,
      [
        installedBin,
        "audit",
        path.join(root, "examples", "split-brain.json"),
        "--format",
        "json",
        "--fail-on",
        "never",
      ],
      temporaryProject,
    ),
  );
  if (splitBrain.summary.disagreementCount === 0) {
    throw new Error("Packed CLI did not detect the split-brain example");
  }

  process.stdout.write(`Package smoke test passed: ${tarballPath}\n`);
} finally {
  const temporaryBase = `${path.resolve(tmpdir())}${path.sep}`;
  if (!path.resolve(temporaryProject).startsWith(temporaryBase)) {
    throw new Error(`Refusing to clean unexpected path: ${temporaryProject}`);
  }
  await rm(temporaryProject, { recursive: true, force: true });
}
