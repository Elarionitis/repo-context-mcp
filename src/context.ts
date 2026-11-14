// The actual work behind each tool. Every function returns markdown text so
// the MCP server and the CLI can share it.

import { posix } from "node:path";
import {
  GitHubError,
  getCommits,
  getContributors,
  getFile,
  getLanguages,
  getLatestRelease,
  getRepo,
  getTree,
  searchCode,
  type RepoInfo,
  type Tree,
} from "./github.ts";
import { parseRepo, type ParsedRepo } from "./parse.ts";
import { detectStack, pickManifests } from "./detect.ts";
import { readmeHeadings, readmeIntro, setupSections } from "./readme.ts";
import { filePaths, findFiles, plural, renderTree, topLevel } from "./tree.ts";

interface Target {
  repo: ParsedRepo;
  info: RepoInfo;
  ref: string;
}

async function resolve(input: string, ref?: string): Promise<Target> {
  const repo = parseRepo(input);
  const info = await getRepo(repo);
  return { repo, info, ref: ref || repo.ref || info.default_branch };
}

async function loadTree(t: Target): Promise<Tree> {
  try {
    return await getTree(t.repo, t.ref);
  } catch (err) {
    // 409 means the repository has no commits yet
    if (err instanceof GitHubError && err.status === 409) return { entries: [], truncated: false };
    throw err;
  }
}

function title(t: Target): string {
  return `${t.info.full_name}${t.ref !== t.info.default_branch ? ` @ ${t.ref}` : ""}`;
}

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 60) return `${days} days ago`;
  if (days < 730) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function day(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "unknown";
}

const DIR_HINTS: Record<string, string> = {
  src: "source code",
  lib: "library code",
  app: "app code / routes",
  pages: "page routes",
  components: "UI components",
  hooks: "hooks",
  packages: "workspace packages",
  apps: "workspace apps",
  crates: "Rust crates",
  docs: "documentation",
  doc: "documentation",
  test: "tests",
  tests: "tests",
  __tests__: "tests",
  spec: "tests",
  e2e: "end-to-end tests",
  scripts: "scripts",
  examples: "examples",
  example: "examples",
  public: "static assets",
  static: "static assets",
  assets: "assets",
  ".github": "GitHub config and CI",
  cmd: "command entry points",
  internal: "internal packages",
  pkg: "packages",
  api: "API",
  server: "backend",
  backend: "backend",
  client: "frontend",
  frontend: "frontend",
  web: "web app",
  config: "configuration",
  migrations: "database migrations",
  prisma: "database schema",
  infra: "infrastructure",
  deploy: "deployment",
  terraform: "infrastructure",
  benchmarks: "benchmarks",
  bench: "benchmarks",
  tools: "tooling",
  include: "headers",
  bin: "executables",
  styles: "styles",
  types: "type definitions",
  utils: "utilities",
};

const ENTRY_PATTERNS = [
  /^(src\/)?(index|main|app|server|cli)\.(ts|tsx|js|mjs|cjs|jsx)$/,
  /^src\/App\.(tsx|jsx|vue|svelte)$/,
  /^(src\/)?app\/(page|layout)\.(tsx|jsx|ts|js)$/,
  /^(src\/)?pages\/(index|_app)\.(tsx|jsx|ts|js)$/,
  /^main\.go$/,
  /^cmd\/[^/]+\/main\.go$/,
  /^src\/(main|lib)\.rs$/,
  /^(app|main|manage|wsgi|asgi|cli)\.py$/,
  /^(src\/)?[^/]+\/__main__\.py$/,
  /^Program\.cs$/,
  /^lib\/main\.dart$/,
  /^src\/main\/java\/.+Application\.(java|kt)$/,
  /^config\/routes\.rb$/,
];

// Files maintainers write specifically for AI agents.
const AGENT_FILES = [
  /^AGENTS\.md$/i,
  /^CLAUDE\.md$/i,
  /^GEMINI\.md$/i,
  /^\.cursorrules$/,
  /^\.cursor\/rules\/.+/,
  /^\.windsurfrules$/,
  /^\.github\/copilot-instructions\.md$/,
];

const DOC_FILES =
  /^(\.github\/|docs\/)?(CONTRIBUTING|ARCHITECTURE|DEVELOPMENT|DEVELOPING|HACKING|DESIGN|CHANGELOG|SECURITY)(\.md)?$|^\.env\.(example|sample|template)$/i;

const README = /^readme(\.(md|markdown|mdx|rst|txt))?$/i;

export async function analyzeRepo(input: string, opts: { ref?: string } = {}): Promise<string> {
  const t = await resolve(input, opts.ref);
  const { info } = t;

  const [languages, tree] = await Promise.all([getLanguages(t.repo).catch(() => ({})), loadTree(t)]);
  const paths = filePaths(tree.entries);

  // files that fail to load are just skipped, they shouldn't break the summary
  const load = (path: string) => getFile(t.repo, path, t.ref).catch(() => null);

  const readmePath = paths.filter((p) => README.test(p)).sort((a, b) => a.length - b.length)[0];
  const manifestPaths = pickManifests(paths);
  const [readmeRaw, ...manifestTexts] = await Promise.all([
    readmePath ? load(readmePath) : Promise.resolve(null),
    ...manifestPaths.map(load),
  ]);

  // some READMEs are symlinks, and GitHub returns the link target as the content
  let readme = readmeRaw;
  if (readme && readmePath && /^[^\s]+\.(md|markdown|rst|txt)$/i.test(readme.trim())) {
    const target = posix.join(posix.dirname(readmePath), readme.trim());
    if (paths.includes(target)) readme = await load(target);
  }

  const manifests = new Map<string, string>();
  manifestPaths.forEach((p, i) => {
    const text = manifestTexts[i];
    if (text) manifests.set(p, text);
  });

  const stack = detectStack(paths, manifests);
  const out: string[] = [];

  // header
  out.push(`# ${title(t)}`);
  if (info.description) out.push(`> ${info.description}`);
  out.push("");

  const flags = [info.private && "private", info.archived && "archived (read-only)", info.fork && "fork"].filter(Boolean);
  const meta = [
    `- **URL:** ${info.html_url}`,
    info.homepage ? `- **Homepage:** ${info.homepage}` : "",
    `- **Branch:** ${t.ref}${t.ref === info.default_branch ? " (default)" : `, default is ${info.default_branch}`}`,
    `- **Stars:** ${info.stargazers_count.toLocaleString("en-US")} · **Forks:** ${info.forks_count.toLocaleString("en-US")} · **Open issues + PRs:** ${info.open_issues_count.toLocaleString("en-US")}`,
    `- **License:** ${info.license?.spdx_id && info.license.spdx_id !== "NOASSERTION" ? info.license.spdx_id : info.license?.name ?? "none"}`,
    `- **Last push:** ${day(info.pushed_at)} (${ago(info.pushed_at)}) · **Created:** ${day(info.created_at)}`,
    info.topics?.length ? `- **Topics:** ${info.topics.join(", ")}` : "",
    flags.length ? `- **Note:** ${flags.join(", ")}` : "",
  ];
  out.push(...meta.filter(Boolean));

  // languages
  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
  if (totalBytes > 0) {
    const langs = Object.entries(languages)
      .map(([name, bytes]) => [name, (bytes / totalBytes) * 100] as const)
      .filter(([, pct]) => pct >= 1)
      .slice(0, 8)
      .map(([name, pct]) => `${name} ${pct.toFixed(pct < 10 ? 1 : 0)}%`);
    out.push("", "## Languages", langs.join(" · "));
  }

  // stack
  const stackLines = stack.groups.map((g) => `- **${g.title}:** ${g.items.join(", ")}`);
  if (stack.packageManagers.length) stackLines.push(`- **Package managers:** ${stack.packageManagers.join(", ")}`);
  if (stack.monorepo) stackLines.push(`- **Monorepo:** ${stack.monorepo}`);
  if (stackLines.length) out.push("", "## Tech stack", ...stackLines);
  if (manifests.size) out.push(`_Read from: ${[...manifests.keys()].join(", ")}_`);

  // layout
  out.push("", "## Layout");
  if (paths.length === 0) {
    out.push("The repository is empty.");
  } else {
    out.push(`${plural(paths.length, "file")} (not counting folders like node_modules or dist).`);
    if (tree.truncated) out.push("The repository is very large, so GitHub only returned part of the file list.");
    const items = topLevel(tree.entries);
    const dirs = items.filter((i) => i.dir);
    for (const d of dirs.slice(0, 25)) {
      const sameAsRepo = d.name.toLowerCase().replace(/[-_]/g, "") === info.full_name.split("/")[1].toLowerCase().replace(/[-_.]/g, "");
      const hint = DIR_HINTS[d.name.toLowerCase()] ?? (sameAsRepo ? "main package" : "");
      out.push(`- \`${d.name}/\` ${plural(d.fileCount, "file")}${hint ? ` - ${hint}` : ""}`);
    }
    if (dirs.length > 25) out.push(`- ... ${dirs.length - 25} more folders`);
    const files = items.filter((i) => !i.dir).map((i) => i.name);
    if (files.length) out.push(`- Root files: ${files.slice(0, 30).join(", ")}${files.length > 30 ? ", ..." : ""}`);
  }

  // entry points and docs worth opening first
  const entries = new Set<string>();
  for (const hint of stack.entryHints) {
    const clean = hint.replace(/^\.\//, "");
    if (paths.includes(clean)) entries.add(clean);
  }
  for (const p of paths) {
    if (entries.size >= 10) break;
    if (ENTRY_PATTERNS.some((re) => re.test(p))) entries.add(p);
  }
  if (entries.size) out.push("", "## Likely entry points", ...[...entries].map((p) => `- ${p}`));

  const agentFiles = paths.filter((p) => AGENT_FILES.some((re) => re.test(p))).slice(0, 10);
  if (agentFiles.length) {
    out.push(
      "",
      "## Instructions for AI agents",
      "The maintainers left instructions for coding agents. Read these before making changes:",
      ...agentFiles.map((p) => `- ${p}`),
    );
  }

  const docs = paths.filter((p) => DOC_FILES.test(p));
  const hasDocsDir = paths.some((p) => p.startsWith("docs/"));
  if (docs.length || hasDocsDir) {
    out.push("", "## Docs worth reading", ...docs.slice(0, 10).map((p) => `- ${p}`));
    if (hasDocsDir) out.push("- docs/ folder");
  }

  // how to run
  const runLines: string[] = [];
  if (stack.install.length) runLines.push(`Install: ${stack.install.map((c) => `\`${c}\``).join(", ")}`);
  if (stack.commands.length) {
    runLines.push("Commands:");
    for (const c of stack.commands.slice(0, 14)) {
      runLines.push(`- \`${c.command}\`${c.note ? ` - ${c.note}` : ""}`);
    }
  }
  const setup = readme ? setupSections(readme) : "";
  if (setup) runLines.push("", "From the README:", "", setup);
  if (runLines.length) out.push("", "## How to run", ...runLines);

  // readme
  if (readme) {
    const intro = readmeIntro(readme);
    const headings = readmeHeadings(readme);
    out.push("", `## README (${readmePath})`);
    if (intro) out.push(intro);
    if (headings.length) out.push("", "Sections:", ...headings);
  } else {
    out.push("", "## README", "No README found.");
  }

  // next steps
  const next: string[] = [];
  if (agentFiles.length) next.push(`read_repo_file "${agentFiles[0]}" for the maintainers' agent rules`);
  const dirNames = new Set(topLevel(tree.entries).filter((i) => i.dir).map((i) => i.name));
  const mainDir = ["src", "lib", "app", "packages", "cmd", "apps", "crates"].find((d) => dirNames.has(d));
  if (mainDir) next.push(`get_repo_tree with path "${mainDir}" to see the code layout`);
  const firstEntry = [...entries][0];
  if (firstEntry) next.push(`read_repo_file "${firstEntry}" to start from the entry point`);
  next.push("find_repo_files to locate files by name, search_repo_code to search contents (needs GITHUB_TOKEN)");
  out.push("", "## Next steps", ...next.map((n) => `- ${n}`));

  return out.join("\n");
}

export async function repoTree(
  input: string,
  opts: { path?: string; depth?: number; ref?: string } = {},
): Promise<string> {
  const t = await resolve(input, opts.ref);
  const tree = await loadTree(t);
  const path = (opts.path ?? t.repo.path ?? "").replace(/^\/+|\/+$/g, "");
  const depth = opts.depth ?? 3;

  const body = renderTree(tree.entries, { root: path, depth });
  if (!body) {
    return `No files found under "${path || "/"}" in ${title(t)}. Check the path with find_repo_files.`;
  }

  const out = [`# ${title(t)}: ${path ? `${path}/` : "/"} (depth ${depth})`, ""];
  if (tree.truncated) out.push("Note: the repository is very large, GitHub only returned part of the file list.", "");
  out.push("```", body, "```");
  return out.join("\n");
}

const DEFAULT_MAX_LINES = 400;

export async function readRepoFile(
  input: string,
  path: string,
  opts: { ref?: string; startLine?: number; endLine?: number } = {},
): Promise<string> {
  const t = await resolve(input, opts.ref);
  const clean = path.replace(/^\/+/, "");
  const text = await getFile(t.repo, clean, t.ref);

  if (text === null) {
    const name = clean.slice(clean.lastIndexOf("/") + 1);
    return `File "${clean}" not found in ${title(t)}. Try find_repo_files with "${name}".`;
  }
  if (text.includes("\u0000")) {
    return `"${clean}" is a binary file (${plural(text.length, "byte")}), not shown.`;
  }

  const lines = text.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  const total = lines.length;

  const start = Math.max(1, opts.startLine ?? 1);
  const end = Math.min(total, opts.endLine ?? start + DEFAULT_MAX_LINES - 1);
  if (start > total) return `"${clean}" has only ${plural(total, "line")}.`;

  const width = String(end).length;
  const shown = lines
    .slice(start - 1, end)
    .map((line, i) => `${String(start + i).padStart(width)}  ${line.length > 500 ? line.slice(0, 500) + " ..." : line}`);

  const ext = clean.includes(".") ? clean.slice(clean.lastIndexOf(".") + 1) : "";
  const out = [`# ${clean} (${title(t)})`, "", "```" + ext, ...shown, "```"];
  if (start > 1 || end < total) {
    out.push(`Lines ${start}-${end} of ${total}.${end < total ? ` Use start_line ${end + 1} to read more.` : ""}`);
  }
  return out.join("\n");
}

export async function findRepoFiles(
  input: string,
  pattern: string,
  opts: { ref?: string; limit?: number } = {},
): Promise<string> {
  const t = await resolve(input, opts.ref);
  const tree = await loadTree(t);
  const matches = findFiles(filePaths(tree.entries), pattern);
  const limit = opts.limit ?? 50;

  if (matches.length === 0) return `No files matching "${pattern}" in ${title(t)}.`;

  const out = [`# Files matching "${pattern}" in ${title(t)}`, ""];
  out.push(...matches.slice(0, limit).map((p) => `- ${p}`));
  if (matches.length > limit) out.push(`- ... ${matches.length - limit} more, use a narrower pattern`);
  if (tree.truncated) out.push("", "Note: the repository is very large, some files may be missing from the results.");
  return out.join("\n");
}

export async function searchRepoCode(input: string, query: string, opts: { limit?: number } = {}): Promise<string> {
  const repo = parseRepo(input);
  const result = await searchCode(repo, query, opts.limit ?? 20);

  if (result.items.length === 0) return `No code matches for "${query}" in ${repo.owner}/${repo.repo}.`;

  const out = [`# "${query}" in ${repo.owner}/${repo.repo}`, `${plural(result.total, "match")} on the default branch.`, ""];
  for (const item of result.items) {
    out.push(`## ${item.path}`);
    for (const fragment of item.fragments.slice(0, 2)) {
      out.push("```", fragment.trim(), "```");
    }
  }
  return out.join("\n");
}

export async function repoActivity(input: string, opts: { ref?: string; commits?: number } = {}): Promise<string> {
  const t = await resolve(input, opts.ref);
  const [commits, release, contributors] = await Promise.all([
    getCommits(t.repo, t.ref, opts.commits ?? 15).catch(() => []),
    getLatestRelease(t.repo).catch(() => null),
    getContributors(t.repo, 8),
  ]);

  const out = [
    `# ${title(t)} activity`,
    "",
    `- **Last push:** ${day(t.info.pushed_at)} (${ago(t.info.pushed_at)})`,
    `- **Open issues + PRs:** ${t.info.open_issues_count.toLocaleString("en-US")}`,
    release
      ? `- **Latest release:** ${release.tag_name}${release.name && release.name !== release.tag_name ? ` (${release.name})` : ""}, ${day(release.published_at)}`
      : "- **Latest release:** none",
  ];
  if (t.info.archived) out.push("- **Archived:** yes, no longer maintained");

  if (commits.length) {
    out.push("", `## Recent commits on ${t.ref}`);
    for (const c of commits) {
      const who = c.author?.login ?? c.commit.author?.name ?? "unknown";
      const msg = c.commit.message.split("\n")[0];
      out.push(`- ${c.sha.slice(0, 7)} ${day(c.commit.author?.date)} ${msg} (${who})`);
    }
  }

  if (contributors.length) {
    out.push("", "## Top contributors");
    out.push(...contributors.map((c) => `- ${c.login} (${plural(c.contributions, "commit")})`));
  }

  return out.join("\n");
}
