import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRepo } from "../src/parse.ts";

test("owner/name", () => {
  assert.deepEqual(parseRepo("vercel/next.js"), { owner: "vercel", repo: "next.js" });
});

test("full urls and .git suffix", () => {
  assert.deepEqual(parseRepo("https://github.com/facebook/react"), { owner: "facebook", repo: "react" });
  assert.deepEqual(parseRepo("github.com/facebook/react.git"), { owner: "facebook", repo: "react" });
  assert.deepEqual(parseRepo("git@github.com:facebook/react.git"), { owner: "facebook", repo: "react" });
  assert.deepEqual(parseRepo("https://github.com/facebook/react/?tab=readme"), { owner: "facebook", repo: "react" });
});

test("tree and blob links keep ref and path", () => {
  assert.deepEqual(parseRepo("https://github.com/a/b/tree/dev/src/lib"), {
    owner: "a",
    repo: "b",
    ref: "dev",
    path: "src/lib",
  });
  assert.deepEqual(parseRepo("https://github.com/a/b/blob/main/README.md#L3"), {
    owner: "a",
    repo: "b",
    ref: "main",
    path: "README.md",
  });
});

test("bad input throws a clear error", () => {
  assert.throws(() => parseRepo("react"), /owner\/name/);
  assert.throws(() => parseRepo("a b/c"), /not a valid/);
});
