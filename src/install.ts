import { cpSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The skill folder is next to dist/ when installed from GitHub or npm, and
// one folder up when running from inside the skill itself.
function findSkillDir(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "..", "skill", "repo-context"), join(here, "..")];
  return candidates.find((d) => existsSync(join(d, "SKILL.md")) && existsSync(join(d, "scripts", "repo-context.mjs")));
}

function expandHome(path: string): string {
  return path.replace(/^~(?=$|[/\\])/, homedir());
}

// Copies the skill into ~/.claude/skills (or another skills folder) so the
// agent can use it without any MCP setup.
export function installSkill(dir?: string): string {
  const source = findSkillDir();
  if (!source) {
    throw new Error("Couldn't find the skill files in this package. Try reinstalling from GitHub.");
  }

  const parent = dir ? resolve(expandHome(dir)) : join(homedir(), ".claude", "skills");
  const target = join(parent, "repo-context");
  if (resolve(source) === resolve(target)) return `The skill is already installed at ${target}`;

  mkdirSync(parent, { recursive: true });
  cpSync(source, target, { recursive: true, force: true });

  const script = join(target, "scripts", "repo-context.mjs");
  return [
    `Installed the repo-context skill to ${target}`,
    "",
    'Restart your agent, then ask: "Analyze expressjs/express"',
    "",
    "Optional, native MCP tools in Claude Code:",
    `  claude mcp add repo-context --scope user -- node "${script}"`,
  ].join("\n");
}
