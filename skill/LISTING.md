# Agensi listing draft

Copy for the Agensi listing form. Not included in the skill zip.

## Title

Repo Context: understand any GitHub repo without cloning

## Short description

Your agent gets the stack, layout, run commands, entry points and README summary of any GitHub repo in one call, then browses, reads and searches the code.

## Full description

Agents are good with code they can see. Repo Context lets them see code that isn't on your machine.

Point your agent at any GitHub repo, by `owner/name` or a URL, and it gets a structured overview in one call:

- **Tech stack** detected from real manifests (package.json, pyproject.toml, requirements.txt, go.mod, Cargo.toml, Gemfile, composer.json, Maven and Gradle files), plus CI, Docker and deploy targets. It doesn't guess from GitHub topics.
- **Layout**: top-level folders with file counts and what each one is for
- **Likely entry points**, so the agent knows where to start reading
- **How to run it**: install command, package scripts, Makefile targets and the README's setup section in one place
- **Agent instruction files** like AGENTS.md, CLAUDE.md, .cursorrules and Copilot instructions, so your agent follows the maintainers' rules
- **README summary** with the badges and HTML stripped out

From there it can drill down with five more tools: browse the file tree, find files by name or glob, read files with line numbers, search code, and check recent commits, releases and contributors.

**Good for**
- Onboarding to an unfamiliar codebase
- "Where is X implemented in library Y?"
- Comparing libraries before you adopt one
- Checking that a dependency is still maintained
- Reviewing open-source projects without cloning them

**Zero setup.** The tool ships inside the skill, so it works right after install with just Node.js 20+. There's no account to create and no API key to paste.

**Works with** Claude Code, Cursor, VS Code Copilot, Claude Desktop, Windsurf, Codex CLI, Gemini CLI and any agent that can run shell commands. It can also run as a native MCP server for agents that support MCP.

**Privacy and safety**: read-only. It only talks to GitHub and sends no telemetry. The bundled script is readable, not minified, so you can review it. An optional GitHub token adds private repos and code search, and it is only sent to api.github.com.

## Tags

github, mcp, codebase, onboarding, code-search, repository, developer-tools, context

## Category

Developer tools / Coding

## Upload

Run `npm run package:skill` and upload `repo-context-skill.zip` from the project root.
