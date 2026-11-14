---
name: repo-context
description: Understand any GitHub repository fast without cloning it. Gets the tech stack, folder layout, entry points, install and run commands, README summary, agent instruction files and recent activity, then lets you browse the tree, find files, read code and search. Use when the user mentions a GitHub repo or URL, asks how a project works, wants to onboard to a codebase, compare libraries, check if a project is maintained, or find where something is implemented in a repo that isn't checked out locally.
---

# Repo Context

Gives you a structured picture of a GitHub repository in one call, then lets you dig into specific folders and files. Works on public repos out of the box and on private repos when `GITHUB_TOKEN` is set.

## When to use

- The user pastes a GitHub URL or names a repo (`owner/name`) and asks about it
- "How does X work?", "Where is Y implemented in Z?", "How do I run this project?"
- Comparing two or more libraries or frameworks
- Checking if a dependency is maintained before adopting it
- Onboarding to a codebase before making changes
- Looking up how a library handles something internally, without cloning it

Don't use it for the repository you're already working in locally. Read the local files directly instead.

## Tools

These come from the `repo-context` MCP server. Every tool takes `repo` as `owner/name` or any github.com URL (including `/tree/<branch>/<path>` and `/blob/...` links), and an optional `ref` (branch, tag or commit).

| Tool | Use it to |
|------|-----------|
| `analyze_github_repo` | Get the overview. **Always call this first.** |
| `get_repo_tree` | See folders and files under a path (`path`, `depth` 1-10, default 3) |
| `find_repo_files` | Find files by name: substring (`auth`) or glob (`*.test.ts`, `src/**/route.ts`) |
| `read_repo_file` | Read a file with line numbers, 400 lines at a time (`start_line`, `end_line`) |
| `search_repo_code` | Full-text search on the default branch. Needs `GITHUB_TOKEN` |
| `get_repo_activity` | Recent commits, latest release, open issues, top contributors |

If the tools aren't available, see [reference/setup.md](reference/setup.md) to install the server, or use the command line fallback below.

## Workflow

1. **Overview.** Call `analyze_github_repo`. It returns languages, frameworks, package managers, top-level layout with file counts, likely entry points, install and run commands, a README summary and suggested next steps.
2. **Respect the maintainers' rules.** If the overview lists files under "Instructions for AI agents" (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`), read them before giving advice about changing the code.
3. **Narrow down.** Use `get_repo_tree` on the main source folder with a small depth, then `find_repo_files` for specific names. Prefer these over guessing paths.
4. **Read only what you need.** Use `read_repo_file` on entry points and the files that answer the question. For long files, read the first chunk and continue with `start_line`.
5. **Search when names don't help.** With a token, `search_repo_code` finds symbols and strings. Without one, combine `find_repo_files` with reading likely files.
6. **Answer with references.** Cite file paths and line numbers (`src/server.ts:42`) so the user can check.

Each step's results are cached for 5 minutes, so calling several tools on the same repo is cheap.

## Tips

- Start shallow: `depth: 2` on big monorepos, then go deeper into one package.
- For "how do I run this", the overview's **How to run** section already merges package scripts, Makefile targets and the README's install section.
- For "is this maintained", use `get_repo_activity` and look at the last push date, release date and whether the repo is archived.
- To compare libraries, call `analyze_github_repo` on each and compare stack, activity, license and stars side by side.
- Branch names with `/` in them can't be read from a URL. Pass them through `ref` instead.

## Errors

- **Rate limit reached:** without a token GitHub allows 60 API requests per hour. Ask the user to set `GITHUB_TOKEN` (5,000 per hour). File reads don't count toward the limit when no token is set.
- **Not found:** the repo is private or the name is wrong. Private repos need `GITHUB_TOKEN` with read access.
- **Code search needs a token:** fall back to `find_repo_files` and `read_repo_file`.

## Command line fallback

For agents without MCP support, the same features work from the shell. The output is the same markdown the tools return.

```bash
npx -y github:Elarionitis/repo-context-mcp analyze vercel/next.js
npx -y github:Elarionitis/repo-context-mcp tree vercel/next.js packages --depth 2
npx -y github:Elarionitis/repo-context-mcp find vercel/next.js "*.config.ts"
npx -y github:Elarionitis/repo-context-mcp read vercel/next.js packages/next/package.json
npx -y github:Elarionitis/repo-context-mcp search vercel/next.js "unstable_cache"
npx -y github:Elarionitis/repo-context-mcp activity vercel/next.js --commits 10
```

The first run downloads and builds the tool (around 10 seconds). Later runs take about a second.
