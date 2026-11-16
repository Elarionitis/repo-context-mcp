#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { examples, runCli, usage } from "./cli.ts";
import { detectAgents, installSkill, uninstallSkill } from "./install.ts";
import { startServer } from "./server.ts";
import { VERSION } from "./version.ts";

const BIN = "repo-context-mcp";

const HELP = `${BIN} ${VERSION}

Run with no arguments to start the MCP server (stdio).
Or use it from the terminal:

${usage(BIN)}

  ${BIN} install-skill [--agent <name>] [--dir <folder>] [--yes]
    Installs the agent skill. If several agents are found, asks which ones.
    --agent picks agents: claude, codex, gemini, copilot, cursor or all
    --yes installs for every agent found without asking
    --dir installs into any other skills folder

  ${BIN} uninstall-skill [--dir <folder>]
    Removes the skill again.

${examples(BIN)}`;

async function installCommands(command: string, flags: Record<string, string>): Promise<string | undefined> {
  if (command === "install-skill") {
    const agent = flags.agent ?? (flags.dir || "yes" in flags ? undefined : await askAgents());
    return installSkill({ agent, dir: flags.dir });
  }
  if (command === "uninstall-skill") return uninstallSkill({ dir: flags.dir });
  return undefined;
}

// When several agents are found and someone is at the keyboard, let them
// choose. Returns a comma separated list of agent ids, or undefined for all.
async function askAgents(): Promise<string | undefined> {
  const found = detectAgents();
  if (found.length < 2 || !process.stdin.isTTY) return undefined;

  console.log("Found these AI agents on your computer:");
  found.forEach((a, i) => console.log(`  ${i + 1}. ${a.name}`));
  console.log("");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) =>
    rl.question(q).catch(() => {
      // Ctrl+C or Ctrl+D
      throw new Error("Cancelled, nothing was installed.");
    });
  try {
    while (true) {
      const answer = (await ask("Press Enter to install for all, or type numbers (e.g. 1,3): ")).trim();
      if (!answer) return undefined;

      const picks = answer.split(/[\s,]+/).map(Number);
      if (picks.every((n) => Number.isInteger(n) && n >= 1 && n <= found.length)) {
        console.log("");
        return [...new Set(picks)].map((n) => found[n - 1].id).join(",");
      }
      console.log(`Please type numbers between 1 and ${found.length}, separated by commas.`);
    }
  } finally {
    rl.close();
  }
}

const args = process.argv.slice(2);

// No arguments means an MCP client started us, so run the server.
// Anything else is a CLI command.
if (args.length === 0 || args[0] === "serve" || args[0] === "--stdio") {
  await startServer();
} else {
  process.exitCode = await runCli(args, { bin: BIN, help: HELP, extra: installCommands });
}
