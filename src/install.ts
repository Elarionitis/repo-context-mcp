import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = "repo-context";

interface Agent {
  id: string;
  name: string;
  // folders that show the agent is installed
  markers: string[];
  // where the agent looks for personal skills
  skills: string;
  // other agents' skill folders this one also reads
  alsoReads?: string[];
}

// Personal skill folders, relative to the home folder.
export const AGENTS: Agent[] = [
  { id: "claude", name: "Claude Code", markers: [".claude"], skills: ".claude/skills" },
  { id: "codex", name: "Codex CLI", markers: [".codex"], skills: ".codex/skills" },
  { id: "gemini", name: "Gemini CLI", markers: [".gemini"], skills: ".gemini/skills" },
  { id: "copilot", name: "GitHub Copilot", markers: [".copilot", ".vscode"], skills: ".copilot/skills" },
  { id: "cursor", name: "Cursor", markers: [".cursor"], skills: ".cursor/skills", alsoReads: ["claude", "codex"] },
];

// The skill folder is next to dist/ when installed from GitHub or npm, and
// one folder up when running from inside the skill itself.
function findSkillDir(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "..", "skill", SKILL), join(here, "..")];
  return candidates.find((d) => existsSync(join(d, "SKILL.md")) && existsSync(join(d, "scripts", "repo-context.mjs")));
}

function expandHome(path: string): string {
  return path.replace(/^~(?=$|[/\\])/, homedir());
}

function short(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? "~" + path.slice(home.length) : path;
}

// Agents that look installed on this computer.
export function detectAgents(): Agent[] {
  return AGENTS.filter((a) => a.markers.some((m) => existsSync(join(homedir(), m))));
}

function pickAgents(requested?: string): Agent[] {
  if (requested) {
    const ids = requested.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (ids.includes("all")) return AGENTS;
    const unknown = ids.filter((id) => !AGENTS.some((a) => a.id === id));
    if (unknown.length) {
      throw new Error(`Unknown agent "${unknown.join(", ")}". Use one of: ${AGENTS.map((a) => a.id).join(", ")}, all`);
    }
    return AGENTS.filter((a) => ids.includes(a.id));
  }
  return detectAgents();
}

export interface InstallOptions {
  agent?: string;
  dir?: string;
}

// Copies the skill into the skills folder of every agent found on this
// computer, so nobody needs to know where those folders are.
export function installSkill(options: InstallOptions = {}): string {
  const source = findSkillDir();
  if (!source) throw new Error("Couldn't find the skill files in this package. Try reinstalling from GitHub.");

  const copyTo = (parent: string): string => {
    const target = join(parent, SKILL);
    if (resolve(source) !== resolve(target)) {
      mkdirSync(parent, { recursive: true });
      cpSync(source, target, { recursive: true, force: true });
    }
    return target;
  };

  const lines: string[] = [];
  // the MCP tip only makes sense when Claude Code got the skill
  let claudeScript: string | undefined;

  if (options.dir) {
    const target = copyTo(resolve(expandHome(options.dir)));
    lines.push(`Installed the repo-context skill to ${short(target)}`);
  } else {
    let agents = pickAgents(options.agent);
    let fallback = false;
    if (agents.length === 0) {
      agents = AGENTS.filter((a) => a.id === "claude");
      fallback = true;
    }

    const ids = new Set(agents.map((a) => a.id));
    lines.push("Installed the repo-context skill for:");
    for (const agent of agents) {
      // Cursor already picks up skills from the Claude and Codex folders
      const via = agent.alsoReads?.find((id) => ids.has(id));
      if (via) {
        const other = AGENTS.find((a) => a.id === via)!;
        lines.push(`  ✓ ${agent.name.padEnd(15)} (uses ${short(join(homedir(), other.skills))})`);
        continue;
      }
      const target = copyTo(join(homedir(), agent.skills));
      if (agent.id === "claude") claudeScript = join(target, "scripts", "repo-context.mjs");
      lines.push(`  ✓ ${agent.name.padEnd(15)} ${short(target)}`);
    }

    if (fallback) {
      lines.push(
        "",
        "No agents were found on this computer, so it was installed for Claude Code.",
        `For another agent, run again with --agent (${AGENTS.map((a) => a.id).join(", ")}) or --dir <skills folder>.`,
      );
    }
  }

  lines.push("", "Next: restart your agent and ask:", '  "Analyze expressjs/express"');
  if (claudeScript) {
    lines.push("", "Optional, native MCP tools in Claude Code:", `  claude mcp add repo-context --scope user -- node "${claudeScript}"`);
  }
  return lines.join("\n");
}

function isOurSkill(dir: string): boolean {
  try {
    return /^name:\s*repo-context\s*$/m.test(readFileSync(join(dir, "SKILL.md"), "utf8"));
  } catch {
    return false;
  }
}

// Removes the skill from every known agent folder (and --dir if given).
export function uninstallSkill(options: InstallOptions = {}): string {
  const parents = options.dir
    ? [resolve(expandHome(options.dir))]
    : AGENTS.map((a) => join(homedir(), a.skills));

  const removed: string[] = [];
  for (const parent of parents) {
    const target = join(parent, SKILL);
    // only delete a folder that really is this skill
    if (isOurSkill(target)) {
      rmSync(target, { recursive: true, force: true });
      removed.push(short(target));
    }
  }

  if (removed.length === 0) return "The repo-context skill wasn't found, nothing to remove.";
  return ["Removed the repo-context skill from:", ...removed.map((p) => `  ✓ ${p}`)].join("\n");
}
