import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { analyzeRepo, findRepoFiles, readRepoFile, repoActivity, repoTree, searchRepoCode } from "./context.ts";
import { getToken } from "./github.ts";
import { VERSION } from "./version.ts";

const INSTRUCTIONS = `Tools for understanding GitHub repositories without cloning them.
Start with analyze_github_repo to get the stack, layout, run commands and README summary.
Then go deeper with get_repo_tree (folders), find_repo_files (by name), read_repo_file (contents)
and search_repo_code (full-text, needs GITHUB_TOKEN). get_repo_activity shows recent commits and releases.
Repos can be given as owner/name or any github.com URL.`;

const repo = z.string().min(1).describe('GitHub repository as "owner/name" or a github.com URL');
const ref = z.string().optional().describe("Branch, tag or commit SHA. Defaults to the default branch");

const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

type Result = { content: { type: "text"; text: string }[]; isError?: boolean };

async function run(work: () => Promise<string>): Promise<Result> {
  try {
    return { content: [{ type: "text", text: await work() }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "repo-context-mcp", version: VERSION }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "analyze_github_repo",
    {
      title: "Analyze GitHub repository",
      description:
        "Get a structured overview of a GitHub repository: description, languages, detected frameworks and tooling " +
        "(from package.json, pyproject.toml, go.mod, Cargo.toml and more), folder layout, entry points, " +
        "AI agent instruction files, install and run commands, and a README summary. Use this first when a repo is mentioned.",
      inputSchema: { repo, ref },
      annotations: readOnly,
    },
    ({ repo, ref }) => run(() => analyzeRepo(repo, { ref })),
  );

  server.registerTool(
    "get_repo_tree",
    {
      title: "Get repository file tree",
      description:
        "Show the folder and file tree of a repository or one of its subfolders. " +
        "Folders deeper than the depth limit are shown with a file count.",
      inputSchema: {
        repo,
        path: z.string().optional().describe('Subfolder to show, e.g. "src/components". Defaults to the root'),
        depth: z.number().int().min(1).max(10).optional().describe("How many folder levels to expand (default 3)"),
        ref,
      },
      annotations: readOnly,
    },
    ({ repo, path, depth, ref }) => run(() => repoTree(repo, { path, depth, ref })),
  );

  server.registerTool(
    "read_repo_file",
    {
      title: "Read a file from a repository",
      description:
        "Read a file's contents with line numbers. Long files are returned 400 lines at a time; " +
        "use start_line and end_line to read other parts.",
      inputSchema: {
        repo,
        path: z.string().min(1).describe('File path in the repository, e.g. "src/index.ts"'),
        start_line: z.number().int().min(1).optional().describe("First line to return (1-based)"),
        end_line: z.number().int().min(1).optional().describe("Last line to return"),
        ref,
      },
      annotations: readOnly,
    },
    ({ repo, path, start_line, end_line, ref }) =>
      run(() => readRepoFile(repo, path, { ref, startLine: start_line, endLine: end_line })),
  );

  server.registerTool(
    "find_repo_files",
    {
      title: "Find files by name",
      description:
        'Find files by name or path. Plain text does a case-insensitive substring match ("auth"). ' +
        'Globs are supported: "*.test.ts" matches file names, "src/**/*.py" matches full paths.',
      inputSchema: {
        repo,
        pattern: z.string().min(1).describe('Substring or glob, e.g. "config", "*.sql", "src/**/route.ts"'),
        limit: z.number().int().min(1).max(500).optional().describe("Max results (default 50)"),
        ref,
      },
      annotations: readOnly,
    },
    ({ repo, pattern, limit, ref }) => run(() => findRepoFiles(repo, pattern, { ref, limit })),
  );

  server.registerTool(
    "search_repo_code",
    {
      title: "Search code in a repository",
      description:
        "Full-text search across a repository's code on its default branch using GitHub code search. " +
        "Returns matching files with snippets. Requires GITHUB_TOKEN" +
        (getToken() ? "." : " (not set right now, so this tool will fail; use find_repo_files and read_repo_file instead)."),
      inputSchema: {
        repo,
        query: z.string().min(1).describe('Search terms, e.g. "createServer" or "useEffect language:tsx"'),
        limit: z.number().int().min(1).max(100).optional().describe("Max files (default 20)"),
      },
      annotations: readOnly,
    },
    ({ repo, query, limit }) => run(() => searchRepoCode(repo, query, { limit })),
  );

  server.registerTool(
    "get_repo_activity",
    {
      title: "Get recent repository activity",
      description:
        "Recent commits, latest release, open issue count and top contributors. " +
        "Useful to check if a project is maintained or what changed lately.",
      inputSchema: {
        repo,
        commits: z.number().int().min(1).max(100).optional().describe("How many recent commits to list (default 15)"),
        ref,
      },
      annotations: readOnly,
    },
    ({ repo, commits, ref }) => run(() => repoActivity(repo, { ref, commits })),
  );

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  // stdout is used by the protocol, so log to stderr
  console.error(`repo-context-mcp ${VERSION} running on stdio${getToken() ? " (GitHub token found)" : ""}`);
}
