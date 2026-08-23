#!/usr/bin/env node

import { runCli } from "../src/cli.mjs";

try {
  process.exitCode = await runCli(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`proxyparity: ${error.message}\n`);
  process.exitCode = 1;
}
