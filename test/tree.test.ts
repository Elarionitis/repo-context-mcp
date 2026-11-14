import { test } from "node:test";
import assert from "node:assert/strict";
import type { TreeEntry } from "../src/github.ts";
import { filePaths, findFiles, renderTree, topLevel } from "../src/tree.ts";

const blob = (path: string): TreeEntry => ({ path, type: "blob" });
const dir = (path: string): TreeEntry => ({ path, type: "tree" });

const entries: TreeEntry[] = [
  dir("src"),
  dir("src/utils"),
  blob("src/index.ts"),
  blob("src/utils/a.ts"),
  blob("src/utils/b.test.ts"),
  dir("node_modules"),
  blob("node_modules/x/index.js"),
  blob("package.json"),
  blob("README.md"),
];

test("filePaths drops ignored folders", () => {
  assert.deepEqual(filePaths(entries), ["src/index.ts", "src/utils/a.ts", "src/utils/b.test.ts", "package.json", "README.md"]);
});

test("renderTree lists folders first and collapses past the depth", () => {
  assert.equal(renderTree(entries, { depth: 2 }), ["src/", "  utils/ (2 files)", "  index.ts", "package.json", "README.md"].join("\n"));
});

test("renderTree with a root path", () => {
  assert.equal(renderTree(entries, { root: "src/utils" }), ["a.ts", "b.test.ts"].join("\n"));
  assert.equal(renderTree(entries, { root: "missing" }), "");
});

test("topLevel counts files per folder", () => {
  assert.deepEqual(topLevel(entries), [
    { name: "src", dir: true, fileCount: 3 },
    { name: "package.json", dir: false, fileCount: 0 },
    { name: "README.md", dir: false, fileCount: 0 },
  ]);
});

test("findFiles: substring, name glob and path glob", () => {
  const paths = filePaths(entries);
  assert.deepEqual(findFiles(paths, "UTILS"), ["src/utils/a.ts", "src/utils/b.test.ts"]);
  assert.deepEqual(findFiles(paths, "*.test.ts"), ["src/utils/b.test.ts"]);
  assert.deepEqual(findFiles(paths, "src/**/*.ts"), ["src/index.ts", "src/utils/a.ts", "src/utils/b.test.ts"]);
  assert.deepEqual(findFiles(paths, "src/*.ts"), ["src/index.ts"]);
});
