#!/usr/bin/env node
// Entry point of the skill's bundled script (skills/repo-context/scripts/repo-context.mjs).
// It only reads public GitHub data: no MCP server, no installer, no other dependencies.
import { examples, runCli, usage } from "./cli.ts";
import { VERSION } from "./version.ts";

const BIN = "node repo-context.mjs";

const HELP = `repo-context ${VERSION}

${usage(BIN)}

${examples(BIN)}
For native MCP tools, see https://github.com/Elarionitis/repo-context-mcp#install`;

const args = process.argv.slice(2);
process.exitCode = await runCli(args.length ? args : ["help"], { bin: BIN, help: HELP });
