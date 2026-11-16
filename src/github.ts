import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RepoRef } from "./parse.ts";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 10 * 60_000;

export class GitHubError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export interface RepoInfo {
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id: string | null; name: string } | null;
  default_branch: string;
  topics?: string[];
  archived: boolean;
  fork: boolean;
  private: boolean;
  pushed_at: string;
  created_at: string;
  size: number;
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
}

export interface Tree {
  entries: TreeEntry[];
  truncated: boolean;
}

export interface Commit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  author: { login: string } | null;
}

export interface Release {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  html_url: string;
}

export interface Contributor {
  login: string;
  contributions: number;
}

export interface CodeMatch {
  path: string;
  html_url: string;
  fragments: string[];
}

export function getToken(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
}

// Results are cached in memory and in a temp folder. The disk part matters
// for the CLI: every command is a new process, and without it each file
// read would spend one more request from GitHub's hourly limit.
const memory = new Map<string, { expires: number; value: Promise<unknown> }>();
const cacheDir = join(tmpdir(), `repo-context-cache-${process.getuid?.() ?? "user"}`);

function diskPath(key: string): string {
  // private repo content must not be shared with token-less runs
  const scope = getToken() ? createHash("sha256").update(getToken()!).digest("hex").slice(0, 12) : "public";
  return join(cacheDir, createHash("sha256").update(`${scope}:${key}`).digest("hex") + ".json");
}

function readDisk(key: string): { value: unknown } | undefined {
  try {
    const entry = JSON.parse(readFileSync(diskPath(key), "utf8")) as { expires: number; value: unknown };
    return entry.expires > Date.now() ? { value: entry.value } : undefined;
  } catch {
    return undefined;
  }
}

function writeDisk(key: string, value: unknown): void {
  try {
    mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
    writeFileSync(diskPath(key), JSON.stringify({ expires: Date.now() + CACHE_TTL_MS, value }), { mode: 0o600 });
  } catch {
    // caching is best effort
  }
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;

  const disk = readDisk(key);
  const value = disk
    ? Promise.resolve(disk.value as T)
    : load().then((v) => {
        writeDisk(key, v);
        return v;
      });

  memory.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  value.catch(() => memory.delete(key));
  return value;
}

export function clearCache(): void {
  memory.clear();
  rmSync(cacheDir, { recursive: true, force: true });
}

async function request(url: string, accept = "application/vnd.github+json"): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "repo-context-mcp",
  };

  const token = getToken();
  if (url.startsWith(API)) {
    headers["X-GitHub-Api-Version"] = "2022-11-28";
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    return await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "failed";
    throw new GitHubError(`Request to GitHub ${reason} (${url}).`);
  }
}

async function fail(res: Response, what: string): Promise<never> {
  const hasToken = Boolean(getToken());

  const limited = res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
  if (limited) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const when = reset ? ` (resets at ${new Date(reset * 1000).toLocaleTimeString()})` : "";
    const hint = hasToken
      ? ""
      : " Set GITHUB_TOKEN to raise the limit from 60 to 5,000 requests per hour. Reading files still works without it.";
    throw new GitHubError(`GitHub rate limit reached${when}.${hint}`, res.status);
  }

  if (res.status === 401) {
    throw new GitHubError("GitHub rejected the token. Check that GITHUB_TOKEN is valid.", 401);
  }

  if (res.status === 404) {
    const hint = hasToken ? "" : " If it is a private repository, set GITHUB_TOKEN.";
    throw new GitHubError(`${what} not found.${hint}`, 404);
  }

  let detail = "";
  try {
    detail = ((await res.json()) as { message?: string }).message ?? "";
  } catch {
    // body wasn't json, ignore
  }
  throw new GitHubError(`GitHub returned ${res.status} for ${what}${detail ? `: ${detail}` : ""}.`, res.status);
}

function getJson<T>(path: string, what: string, accept?: string): Promise<T> {
  return cached(`json:${accept ?? ""}:${path}`, async () => {
    const res = await request(API + path, accept);
    if (!res.ok) await fail(res, what);
    return (await res.json()) as T;
  });
}

function repoPath(r: RepoRef): string {
  return `/repos/${r.owner}/${r.repo}`;
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function getRepo(r: RepoRef): Promise<RepoInfo> {
  return getJson(repoPath(r), `Repository ${r.owner}/${r.repo}`);
}

export function getLanguages(r: RepoRef): Promise<Record<string, number>> {
  return getJson(`${repoPath(r)}/languages`, "Language stats");
}

// ref defaults to HEAD, which GitHub resolves to the default branch
export async function getTree(r: RepoRef, ref = "HEAD"): Promise<Tree> {
  const data = await getJson<{ tree: TreeEntry[]; truncated: boolean }>(
    `${repoPath(r)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    ref === "HEAD" ? `Repository ${r.owner}/${r.repo}` : `Branch or commit "${ref}"`,
  );
  return {
    entries: data.tree.map((e) => ({ path: e.path, type: e.type, size: e.size })),
    truncated: data.truncated,
  };
}

// Returns null when the file doesn't exist.
// Without a token we use raw.githubusercontent.com, which doesn't count
// against the API rate limit. With a token we use the contents API so
// private repos work too.
export function getFile(r: RepoRef, path: string, ref = "HEAD"): Promise<string | null> {
  return cached(`file:${r.owner}/${r.repo}@${ref}:${path}`, async () => {
    const url = getToken()
      ? `${API}${repoPath(r)}/contents/${encodePath(path)}${ref === "HEAD" ? "" : `?ref=${encodeURIComponent(ref)}`}`
      : `${RAW}/${r.owner}/${r.repo}/${encodePath(ref)}/${encodePath(path)}`;

    const res = await request(url, "application/vnd.github.raw+json");
    if (res.status === 404) return null;
    if (!res.ok) await fail(res, `File ${path}`);
    return await res.text();
  });
}

export function getCommits(r: RepoRef, ref: string, count: number): Promise<Commit[]> {
  return getJson(`${repoPath(r)}/commits?sha=${encodeURIComponent(ref)}&per_page=${count}`, "Commits");
}

export async function getLatestRelease(r: RepoRef): Promise<Release | null> {
  try {
    return await getJson<Release>(`${repoPath(r)}/releases/latest`, "Latest release");
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return null;
    throw err;
  }
}

export async function getContributors(r: RepoRef, count: number): Promise<Contributor[]> {
  // GitHub returns 204 with no body for empty repos, so handle that quietly
  try {
    const list = await getJson<Contributor[] | null>(`${repoPath(r)}/contributors?per_page=${count}`, "Contributors");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function searchCode(r: RepoRef, query: string, count: number): Promise<{ total: number; items: CodeMatch[] }> {
  if (!getToken()) {
    throw new GitHubError(
      "GitHub code search needs a token. Set GITHUB_TOKEN, or use find_repo_files and read_repo_file instead.",
    );
  }

  const q = encodeURIComponent(`${query} repo:${r.owner}/${r.repo}`);
  const data = await getJson<{
    total_count: number;
    items: { path: string; html_url: string; text_matches?: { fragment: string }[] }[];
  }>(`/search/code?q=${q}&per_page=${count}`, "Code search", "application/vnd.github.text-match+json");

  return {
    total: data.total_count,
    items: data.items.map((item) => ({
      path: item.path,
      html_url: item.html_url,
      fragments: (item.text_matches ?? []).map((m) => m.fragment),
    })),
  };
}
