---
name: repo-context
description: Explores any GitHub repo without cloning it - stack, layout, run commands, code, search and activity. Use for GitHub URLs, onboarding, comparing libraries. Not for local repos.
version: 2.0.0
license: MIT
# What the bundled script does: calls the GitHub API and reads GITHUB_TOKEN.
permissions:
  - network
  - env
metadata:
  author: Elarionitis <Elarionitis@users.noreply.github.com>
  version: "2.0.0"
  tags:
    - github
    - code-exploration
    - onboarding
    - mcp
---

# Repo Context

Gives you a structured picture of a GitHub repository in one call, then lets you dig into specific folders and files. Works on public repos out of the box and on private repos when `GITHUB_TOKEN` is set.

## Purpose

Answer questions about a GitHub repository that is not checked out locally, quickly and with file and line references, without cloning it.

Use it when:

- The user pastes a GitHub URL or names a repo (`owner/name`) and asks about it
- "How does X work?", "Where is Y implemented in Z?", "How do I run this project?"
- Comparing two or more libraries or frameworks
- Checking if a dependency is maintained before adopting it
- Onboarding to a codebase before making changes
- Looking up how a library handles a feature internally

Do not use it for the repository you're already working in locally. Read the local files directly instead.

## Prerequisites

- **Node.js 20 or newer** (`node --version`). Nothing else to install: the script is bundled.
- **Network access** to api.github.com and raw.githubusercontent.com.
- **Optional: `GITHUB_TOKEN`** (or `GH_TOKEN`) for private repos, code search and a higher rate limit. See [references/setup.md](references/setup.md).

## Instructions

There are two ways to run it, and both give the same output.

**1. MCP tools (if they are available).** If you have tools named `analyze_github_repo`, `get_repo_tree` and so on, use them. Setup is in [references/setup.md](references/setup.md).

**2. The bundled script (works everywhere with a shell).** Run `scripts/repo-context.mjs` with Node:

```bash
node scripts/repo-context.mjs analyze facebook/react
```

Paths in this file are relative to the folder this SKILL.md is in. If the shell is somewhere else, use the absolute path of `scripts/repo-context.mjs`.

### Commands

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

### Workflow

1. **Overview.** Run `analyze`. It returns languages, frameworks, package managers, top-level layout with file counts, likely entry points, install and run commands, a README summary and suggested next steps.
2. **Respect the maintainers' rules.** If the overview lists files under "Instructions for AI agents" (AGENTS.md, CLAUDE.md, .cursorrules, copilot-instructions.md), read them before giving advice about changing the code.
3. **Narrow down.** Look at the main source folder with `tree` and a small depth, then use `find` for specific names. Prefer these over guessing paths.
4. **Read only what you need.** `read` the entry points and the files that answer the question. For long files, read the first chunk and continue from the line it tells you.
5. **Search when names don't help.** With a token, `search` finds symbols and strings. Without one, combine `find` with reading likely files.
6. **Answer with references.** Cite file paths and line numbers (for example `server.ts:42`) so the user can check.

### Tips

- Start shallow: depth 2 on big monorepos, then go deeper into one package.
- For "how do I run this", the overview's **How to run** section already merges package scripts, Makefile targets and the README's install section.
- For "is this maintained", use `activity` and look at the last push date, release date and whether the repo is archived.
- To compare libraries, run `analyze` on each and compare stack, activity, license and stars side by side.
- Results are cached for 10 minutes, including between script runs, so repeating a command on the same repo is free.

## Examples

**"How does Express create an app?"**

```bash
node scripts/repo-context.mjs analyze expressjs/express
node scripts/repo-context.mjs tree expressjs/express lib --depth 1
node scripts/repo-context.mjs read https://github.com/expressjs/express/blob/master/lib/express.js
```

Then answer with references such as `express.js:36`, naming the folder it is in.

**"Is fastapi still maintained?"**

```bash
node scripts/repo-context.mjs activity fastapi/fastapi --commits 5
```

Report the last push, the latest release and whether the repo is archived.

**"Where is useSyncExternalStore implemented in React?"** (needs `GITHUB_TOKEN`)

```bash
node scripts/repo-context.mjs search facebook/react "useSyncExternalStore" --limit 10
```

## Limitations

- GitHub only. GitLab, Bitbucket and self-hosted Git servers are not supported.
- Without a token GitHub allows 60 API requests per hour. `analyze` uses 3, `tree` and `find` use 1, and `read` uses none.
- `search` needs `GITHUB_TOKEN` and only covers the default branch (a GitHub code search limit).
- Branch names with `/` in them can't be read from a URL. Pass them as `ref` / `--ref` instead.
- `read` returns at most 400 lines per call. Continue from the line it tells you.
- The script reads repositories only. It never writes to GitHub or to the local disk outside its cache.

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Rate limit reached | No token, 60 requests per hour used up | Keep going with `read`, which costs no API requests. Don't switch to `curl` or `git clone`. Tell the user they can set `GITHUB_TOKEN` for 5,000 per hour ([references/setup.md](references/setup.md)). |
| Not found | The repo is private or the name is wrong | Check the spelling. Private repos need `GITHUB_TOKEN` with read access. |
| Code search needs a token | `search` was called without `GITHUB_TOKEN` | Fall back to `find` and `read`. |
| `node: command not found` | Node.js is not installed | The user needs Node.js 20+ from https://nodejs.org. |

## Source

Open source under the MIT license: https://github.com/Elarionitis/repo-context-mcp. Bug reports and ideas are welcome there.
