---
name: repo-context
description: Understand any GitHub repository fast without cloning it. Gets the tech stack, folder layout, entry points, install and run commands, README summary, agent instruction files and recent activity, then lets you browse the tree, find files, read code and search. Use when the user mentions a GitHub repo or URL, asks how a project works, wants to onboard to a codebase, compare libraries, check if a project is maintained, or find where something is implemented in a repo that isn't checked out locally.
---

# Repo Context

Gives you a structured picture of a GitHub repository in one call, then lets you dig into specific folders and files. Works on public repos out of the box and on private repos when `GITHUB_TOKEN` is set. Needs Node.js 20 or newer, nothing else.

## When to use

- The user pastes a GitHub URL or names a repo (`owner/name`) and asks about it
- "How does X work?", "Where is Y implemented in Z?", "How do I run this project?"
- Comparing two or more libraries or frameworks
- Checking if a dependency is maintained before adopting it
- Onboarding to a codebase before making changes
- Looking up how a library handles something internally, without cloning it

Don't use it for the repository you're already working in locally. Read the local files directly instead.

## How to run it

There are two ways, and both give the same output.

**1. MCP tools (if they are available).** If you have tools named `analyze_github_repo`, `get_repo_tree` and so on, use them. Setup is in [reference/setup.md](reference/setup.md).

**2. The bundled script (works everywhere with a shell).** Run `scripts/repo-context.mjs` from this skill's folder with Node:

```bash
node <skill-folder>/scripts/repo-context.mjs analyze vercel/next.js
```

Replace `<skill-folder>` with the absolute path of the folder this SKILL.md is in.

## Commands

`<repo>` is `owner/name` or any github.com URL, including `/tree/<branch>/<path>` and `/blob/...` links. Every command except `search` takes an optional branch, tag or commit (`ref` for the tools, `--ref` for the script).

| MCP tool | Script command | Use it to |
|----------|----------------|-----------|
| `analyze_github_repo` | `analyze <repo>` | Get the overview. **Always do this first.** |
| `get_repo_tree` | `tree <repo> [path] --depth <n>` | See folders and files under a path (depth 1-10, default 3) |
| `find_repo_files` | `find <repo> <pattern> --limit <n>` | Find files by name: substring (`auth`) or glob (`*.test.ts`, `src/**/route.ts`) |
| `read_repo_file` | `read <repo> <path> --start <n> --end <n>` | Read a file with line numbers, 400 lines at a time |
| `search_repo_code` | `search <repo> <query> --limit <n>` | Full-text search on the default branch. Needs `GITHUB_TOKEN` |
| `get_repo_activity` | `activity <repo> --commits <n>` | Recent commits, latest release, open issues, top contributors |

Tool arguments map to script flags: `start_line` is `--start`, `end_line` is `--end`, `limit` is `--limit`, `commits` is `--commits`.

## Workflow

1. **Overview.** Run `analyze`. It returns languages, frameworks, package managers, top-level layout with file counts, likely entry points, install and run commands, a README summary and suggested next steps.
2. **Respect the maintainers' rules.** If the overview lists files under "Instructions for AI agents" (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`), read them before giving advice about changing the code.
3. **Narrow down.** Look at the main source folder with `tree` and a small depth, then use `find` for specific names. Prefer these over guessing paths.
4. **Read only what you need.** `read` the entry points and the files that answer the question. For long files, read the first chunk and continue from the line it tells you.
5. **Search when names don't help.** With a token, `search` finds symbols and strings. Without one, combine `find` with reading likely files.
6. **Answer with references.** Cite file paths and line numbers (`src/server.ts:42`) so the user can check.

## Tips

- Start shallow: depth 2 on big monorepos, then go deeper into one package.
- For "how do I run this", the overview's **How to run** section already merges package scripts, Makefile targets and the README's install section.
- For "is this maintained", use `activity` and look at the last push date, release date and whether the repo is archived.
- To compare libraries, run `analyze` on each and compare stack, activity, license and stars side by side.
- Branch names with `/` in them can't be read from a URL. Pass them as `ref` / `--ref` instead.
- With MCP, results are cached for 5 minutes, so several calls on the same repo are cheap.

## Errors

- **Rate limit reached:** without a token GitHub allows 60 API requests per hour (`analyze` uses 3). Ask the user to set `GITHUB_TOKEN` for 5,000 per hour. See [reference/setup.md](reference/setup.md).
- **Not found:** the repo is private or the name is wrong. Private repos need `GITHUB_TOKEN` with read access.
- **Code search needs a token:** fall back to `find` and `read`.
- **`node: command not found`:** the user needs Node.js 20+ from https://nodejs.org.
