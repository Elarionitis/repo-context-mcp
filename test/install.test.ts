import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installSkill, uninstallSkill } from "../src/install.ts";

// These tests need the bundled skill script, built by npm install / npm run package:skill.
const realHome = process.env.HOME;
let home: string;

const installed = (folder: string) => existsSync(join(home, folder, "repo-context", "scripts", "repo-context.mjs"));

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "repo-context-home-"));
  process.env.HOME = home;
});

afterEach(() => {
  process.env.HOME = realHome;
  rmSync(home, { recursive: true, force: true });
});

test("installs for every agent it finds", () => {
  mkdirSync(join(home, ".claude"));
  mkdirSync(join(home, ".gemini"));
  const out = installSkill();

  assert.ok(installed(".claude/skills"));
  assert.ok(installed(".gemini/skills"));
  assert.ok(!installed(".codex/skills"));
  assert.match(out, /Claude Code/);
  assert.match(out, /Gemini CLI/);
});

test("cursor reuses the claude folder instead of a second copy", () => {
  mkdirSync(join(home, ".claude"));
  mkdirSync(join(home, ".cursor"));
  const out = installSkill();

  assert.ok(installed(".claude/skills"));
  assert.ok(!installed(".cursor/skills"));
  assert.match(out, /Cursor\s+\(uses ~\/\.claude\/skills\)/);
});

test("falls back to claude code when no agent is found", () => {
  const out = installSkill();
  assert.ok(installed(".claude/skills"));
  assert.match(out, /No agents were found/);
});

test("--agent and --dir pick the target", () => {
  installSkill({ agent: "codex" });
  assert.ok(installed(".codex/skills"));
  assert.ok(!installed(".claude/skills"));

  installSkill({ dir: join(home, "custom") });
  assert.ok(installed("custom"));

  assert.throws(() => installSkill({ agent: "nope" }), /Unknown agent/);
});

test("uninstall removes only this skill", () => {
  mkdirSync(join(home, ".claude"));
  installSkill();
  // someone else's folder with the same name must survive
  mkdirSync(join(home, ".gemini/skills/repo-context"), { recursive: true });
  writeFileSync(join(home, ".gemini/skills/repo-context/SKILL.md"), "---\nname: other\n---\n");

  const out = uninstallSkill();
  assert.ok(!installed(".claude/skills"));
  assert.ok(existsSync(join(home, ".gemini/skills/repo-context/SKILL.md")));
  assert.match(out, /Removed/);
});
