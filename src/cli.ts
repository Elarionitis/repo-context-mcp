import { analyzeRepo, findRepoFiles, readRepoFile, repoActivity, repoTree, searchRepoCode } from "./context.ts";
import { VERSION } from "./version.ts";

// Usage lines shared by the npm package and the skill's bundled script.
export function usage(bin: string): string {
  return `  ${bin} analyze  <repo> [--ref <branch>]
  ${bin} tree     <repo> [path] [--depth <n>] [--ref <branch>]
  ${bin} read     <repo> <path> [--start <line>] [--end <line>] [--ref <branch>]
  ${bin} find     <repo> <pattern> [--limit <n>] [--ref <branch>]
  ${bin} search   <repo> <query> [--limit <n>]
  ${bin} activity <repo> [--commits <n>] [--ref <branch>]`;
}

export function examples(bin: string): string {
  return `<repo> is owner/name or a github.com URL.
Set GITHUB_TOKEN for private repos, code search and higher rate limits.

Examples:
  ${bin} analyze vercel/next.js
  ${bin} tree facebook/react packages --depth 2
  ${bin} read https://github.com/expressjs/express/blob/master/index.js
`;
}

// Extra commands a caller can add on top of the repo commands. Returns the
// text to print, or undefined when the command isn't one of its own.
export type ExtraCommands = (command: string, flags: Record<string, string>) => Promise<string | undefined>;

export interface CliOptions {
  bin: string;
  help: string;
  extra?: ExtraCommands;
}

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

export async function runCli(args: string[], options: CliOptions): Promise<number> {
  const [command, ...rest] = args;

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(options.help);
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
    const extra = options.extra && (await options.extra(command, flags));
    if (extra !== undefined) {
      console.log(extra);
      return 0;
    }

    if (!repo) throw new Error(`Missing <repo>. Run "${options.bin} help" for usage.`);

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
        throw new Error(`Unknown command "${command}". Run "${options.bin} help" for usage.`);
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
