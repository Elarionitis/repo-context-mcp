#!/usr/bin/env node
import { runCli } from "./cli.ts";
import { startServer } from "./server.ts";

const args = process.argv.slice(2);

// No arguments means an MCP client started us, so run the server.
// Anything else is a CLI command.
if (args.length === 0 || args[0] === "serve" || args[0] === "--stdio") {
  await startServer();
} else {
  process.exitCode = await runCli(args);
}
