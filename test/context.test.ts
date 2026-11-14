import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRepo, readRepoFile } from "../src/context.ts";
import { clearCache } from "../src/github.ts";

// Fake GitHub so the tests don't touch the network.
const routes: Record<string, unknown> = {
  "https://api.github.com/repos/acme/shop": {
    full_name: "acme/shop",
    description: "A tiny shop",
    html_url: "https://github.com/acme/shop",
    homepage: null,
    language: "TypeScript",
    stargazers_count: 12,
    forks_count: 3,
    open_issues_count: 1,
    license: { spdx_id: "MIT", name: "MIT License" },
    default_branch: "main",
    topics: [],
    archived: false,
    fork: false,
    private: false,
    pushed_at: "2026-01-01T00:00:00Z",
    created_at: "2025-01-01T00:00:00Z",
    size: 100,
  },
  "https://api.github.com/repos/acme/shop/languages": { TypeScript: 900, CSS: 100 },
  "https://api.github.com/repos/acme/shop/git/trees/main?recursive=1": {
    truncated: false,
    tree: [
      { path: "src", type: "tree" },
      { path: "src/index.ts", type: "blob" },
      { path: "package.json", type: "blob" },
      { path: "README.md", type: "blob" },
      { path: "AGENTS.md", type: "blob" },
    ],
  },
  "https://raw.githubusercontent.com/acme/shop/main/package.json": JSON.stringify({
    scripts: { dev: "tsx src/index.ts" },
    dependencies: { express: "5" },
  }),
  "https://raw.githubusercontent.com/acme/shop/main/README.md":
    "# Shop\n\nA tiny shop used to test the summary output of this tool end to end.\n\n## Getting started\n\nRun npm install.\n",
  "https://raw.githubusercontent.com/acme/shop/main/src/index.ts": "line one\nline two\nline three\n",
};

const realFetch = globalThis.fetch;

beforeEach(() => {
  clearCache();
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    if (!(url in routes)) return new Response("not found", { status: 404 });
    const body = routes[url];
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("analyzeRepo builds a full summary", async () => {
  const out = await analyzeRepo("https://github.com/acme/shop");

  assert.match(out, /^# acme\/shop\n> A tiny shop/);
  assert.match(out, /TypeScript 90% · CSS 10%/);
  assert.match(out, /\*\*Frameworks & libraries:\*\* Express/);
  assert.match(out, /`npm run dev` - tsx src\/index\.ts/);
  assert.match(out, /### Getting started\nRun npm install\./);
  assert.match(out, /## Instructions for AI agents[\s\S]*- AGENTS\.md/);
  assert.match(out, /## Likely entry points\n- src\/index\.ts/);
  assert.match(out, /A tiny shop used to test/);
});

test("readRepoFile numbers lines and supports ranges", async () => {
  const out = await readRepoFile("acme/shop", "src/index.ts", { startLine: 2, endLine: 2 });
  assert.match(out, /```ts\n2  line two\n```/);
  assert.match(out, /Lines 2-2 of 3\. Use start_line 3/);
});

test("missing repo gives a helpful error", async () => {
  await assert.rejects(analyzeRepo("acme/nope"), /not found\. If it is a private repository, set GITHUB_TOKEN/);
});
