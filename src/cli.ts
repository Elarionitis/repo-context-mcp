import { analyzeRepo, findRepoFiles, readRepoFile, repoActivity, repoTree, searchRepoCode } from "./context.ts";
import { createInterface } from "node:readline/promises";
import { detectAgents, installSkill, uninstallSkill } from "./install.ts";
import { VERSION } from "./version.ts";

const HELP = `repo-context-mcp ${VERSION}

Run with no arguments to start the MCP server (stdio).
Or use it from the terminal:

  repo-context-mcp analyze  <repo> [--ref <branch>]
  repo-context-mcp tree     <repo> [path] [--depth <n>] [--ref <branch>]
  repo-context-mcp read     <repo> <path> [--start <line>] [--end <line>] [--ref <branch>]
  repo-context-mcp find     <repo> <pattern> [--limit <n>] [--ref <branch>]
  repo-context-mcp search   <repo> <query> [--limit <n>]
  repo-context-mcp activity <repo> [--commits <n>] [--ref <branch>]

  repo-context-mcp install-skill [--agent <name>] [--dir <folder>] [--yes]
    Installs the agent skill. If several agents are found, asks which ones.
    --agent picks agents: claude, codex, gemini, copilot, cursor or all
    --yes installs for every agent found without asking
    --dir installs into any other skills folder

  repo-context-mcp uninstall-skill [--dir <folder>]
    Removes the skill again.

<repo> is owner/name or a github.com URL.
Set GITHUB_TOKEN for private repos, code search and higher rate limits.

Examples:
  repo-context-mcp analyze vercel/next.js
  repo-context-mcp tree facebook/react packages --depth 2
  repo-context-mcp read https://github.com/expressjs/express/blob/master/index.js
`;

function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const [key, inline] = a.slice(2).split("=", 2);
      // a flag followed by another flag (or nothing) is a plain switch like --yes
      const next = args[i + 1];
      flags[key] = inline ?? (next !== undefined && !next.startsWith("--") ? args[++i] : "");
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function num(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`--${name} must be a positive whole number`);
  return n;
}

export async function runCli(args: string[]): Promise<number> {
  const [command, ...rest] = args;

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return 0;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    console.log(VERSION);
    return 0;
  }

  const { positional, flags } = parseArgs(rest);
  const [repo, arg] = positional;
  const ref = flags.ref;

  try {
    if (command === "install-skill") {
      const agent = flags.agent ?? (flags.dir || "yes" in flags ? undefined : await askAgents());
      console.log(installSkill({ agent, dir: flags.dir }));
      return 0;
    }
    if (command === "uninstall-skill") {
      console.log(uninstallSkill({ dir: flags.dir }));
      return 0;
    }

    if (!repo) throw new Error(`Missing <repo>. Run "repo-context-mcp help" for usage.`);

    let output: string;
    switch (command) {
      case "analyze":
        output = await analyzeRepo(repo, { ref });
        break;
      case "tree":
        output = await repoTree(repo, { path: arg, depth: num(flags.depth, "depth"), ref });
        break;
      case "read": {
        // allow a single blob URL that already includes the path
        const path = arg ?? parseBlobPath(repo);
        if (!path) throw new Error("Missing <path>.");
        output = await readRepoFile(repo, path, {
          ref,
          startLine: num(flags.start, "start"),
          endLine: num(flags.end, "end"),
        });
        break;
      }
      case "find":
        if (!arg) throw new Error("Missing <pattern>.");
        output = await findRepoFiles(repo, arg, { ref, limit: num(flags.limit, "limit") });
        break;
      case "search":
        if (!arg) throw new Error("Missing <query>.");
        output = await searchRepoCode(repo, positional.slice(1).join(" "), { limit: num(flags.limit, "limit") });
        break;
      case "activity":
        output = await repoActivity(repo, { ref, commits: num(flags.commits, "commits") });
        break;
      default:
        throw new Error(`Unknown command "${command}". Run "repo-context-mcp help" for usage.`);
    }

    console.log(output);
    return 0;
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
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

function parseBlobPath(input: string): string | undefined {
  const m = input.match(/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+?)(?:[?#].*)?$/);
  return m ? m[1] : undefined;
}
