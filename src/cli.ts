import { analyzeRepo, findRepoFiles, readRepoFile, repoActivity, repoTree, searchRepoCode } from "./context.ts";
import { installSkill } from "./install.ts";
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

  repo-context-mcp install-skill [--dir <skills folder>]
    Installs the agent skill. Default folder: ~/.claude/skills (Claude Code)

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
      flags[key] = inline ?? args[++i] ?? "";
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
      console.log(installSkill(flags.dir));
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

function parseBlobPath(input: string): string | undefined {
  const m = input.match(/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+?)(?:[?#].*)?$/);
  return m ? m[1] : undefined;
}
