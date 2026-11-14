import type { TreeEntry } from "./github.ts";

// Folders that are almost never useful context for an agent.
export const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "bower_components",
  "vendor",
  "dist",
  "build",
  "out",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".cache",
  ".parcel-cache",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  ".gradle",
  ".idea",
  ".vscode",
  "Pods",
  "DerivedData",
]);

export function isIgnored(path: string): boolean {
  return path.split("/").some((part) => IGNORED_DIRS.has(part));
}

export function filePaths(entries: TreeEntry[]): string[] {
  return entries.filter((e) => e.type === "blob" && !isIgnored(e.path)).map((e) => e.path);
}

interface Node {
  name: string;
  dir: boolean;
  fileCount: number;
  children: Map<string, Node>;
}

function newNode(name: string, dir: boolean): Node {
  return { name, dir, fileCount: 0, children: new Map() };
}

function buildTree(entries: TreeEntry[], root: string): Node {
  const top = newNode("", true);
  const prefix = root ? root.replace(/\/+$/, "") + "/" : "";

  for (const entry of entries) {
    if (entry.type === "commit") continue; // submodules
    if (prefix && !entry.path.startsWith(prefix)) continue;
    if (isIgnored(entry.path)) continue;

    const parts = entry.path.slice(prefix.length).split("/");
    let node = top;
    for (let i = 0; i < parts.length; i++) {
      const last = i === parts.length - 1;
      const dir = !last || entry.type === "tree";
      let child = node.children.get(parts[i]);
      if (!child) {
        child = newNode(parts[i], dir);
        node.children.set(parts[i], child);
      }
      node = child;
    }
  }

  countFiles(top);
  return top;
}

function countFiles(node: Node): number {
  let total = 0;
  for (const child of node.children.values()) {
    total += child.dir ? countFiles(child) : 1;
  }
  node.fileCount = total;
  return total;
}

function sortedChildren(node: Node): Node[] {
  return [...node.children.values()].sort((a, b) => {
    if (a.dir !== b.dir) return a.dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export interface TreeOptions {
  root?: string;
  depth?: number;
  maxLines?: number;
  perDir?: number;
}

// Renders an indented tree. Folders past the depth limit show a file count
// instead of their contents so big repos stay readable.
export function renderTree(entries: TreeEntry[], options: TreeOptions = {}): string {
  const { root = "", depth = 3, maxLines = 300, perDir = 40 } = options;
  const top = buildTree(entries, root);
  if (top.children.size === 0) return "";

  const lines: string[] = [];
  let cut = false;

  const walk = (node: Node, level: number) => {
    const children = sortedChildren(node);
    const shown = children.slice(0, perDir);

    for (const child of shown) {
      if (lines.length >= maxLines) {
        cut = true;
        return;
      }
      const indent = "  ".repeat(level);
      if (!child.dir) {
        lines.push(`${indent}${child.name}`);
      } else if (level + 1 >= depth) {
        lines.push(`${indent}${child.name}/ (${plural(child.fileCount, "file")})`);
      } else {
        lines.push(`${indent}${child.name}/`);
        walk(child, level + 1);
      }
    }

    if (children.length > shown.length) {
      lines.push(`${"  ".repeat(level)}... ${children.length - shown.length} more`);
    }
  };

  walk(top, 0);
  if (cut) lines.push(`... output cut at ${maxLines} lines, use a smaller depth or a path`);
  return lines.join("\n");
}

export interface TopLevelItem {
  name: string;
  dir: boolean;
  fileCount: number;
}

export function topLevel(entries: TreeEntry[]): TopLevelItem[] {
  return sortedChildren(buildTree(entries, "")).map((n) => ({ name: n.name, dir: n.dir, fileCount: n.fileCount }));
}

// Simple glob support: ** matches across folders, * and ? within a name.
// A pattern without "/" is matched against the file name only.
// A pattern without any wildcard is a case-insensitive substring match.
export function globToRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      re += ".*";
      i++;
      if (pattern[i + 1] === "/") i++;
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`, "i");
}

export function findFiles(paths: string[], pattern: string): string[] {
  const p = pattern.trim();
  if (!/[*?]/.test(p)) {
    const needle = p.toLowerCase();
    return paths.filter((path) => path.toLowerCase().includes(needle));
  }

  const re = globToRegex(p);
  const byName = !p.includes("/");
  return paths.filter((path) => re.test(byName ? path.slice(path.lastIndexOf("/") + 1) : path));
}

export function plural(n: number, word: string): string {
  return `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
}
