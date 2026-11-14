# Repo Context MCP

Give your AI coding agent a clear picture of any GitHub repository without cloning it.

One call returns the tech stack, folder layout, entry points, install and run commands, agent instruction files and a README summary. Five more tools let the agent browse the tree, find files, read code, search, and check recent activity.

Works with Claude Code, Cursor, VS Code Copilot, Claude Desktop, Windsurf, Codex CLI, Gemini CLI and any other MCP client. There's also a command line mode for everything else.

```text
> Analyze vercel/next.js

# vercel/next.js
> The React Framework

- **Branch:** canary (default)
- **Stars:** 143,519 · **Forks:** 32,804 · **Open issues + PRs:** 3,979
- **License:** MIT
- **Last push:** 2026-11-14 (today)

## Languages
JavaScript 47% · TypeScript 35% · Rust 16%

## Tech stack
- **Frameworks & libraries:** Next.js, React, Express, Tailwind CSS, Tokio, Serde, ...
- **Testing:** Jest, Playwright, Cypress, Vitest, Testing Library
- **Build & tooling:** TypeScript, Turborepo, esbuild, ESLint, Prettier, Webpack
- **Infra & deploy:** GitHub Actions, Docker, Vercel
- **Package managers:** pnpm, Cargo
- **Monorepo:** Turborepo

## Layout
33,820 files (not counting folders like node_modules or dist).
- `crates/` 1,238 files - Rust crates
- `docs/` 479 files - documentation
- `packages/` 3,758 files - workspace packages
- ...

## Instructions for AI agents
- AGENTS.md

## How to run
Install: `pnpm install`
- `pnpm dev` - turbo run dev --parallel ...
- `pnpm build` - turbo run build ...
- `pnpm test` - scripts/run-jest.sh ...

## README (readme.md)
...

## Next steps
- read_repo_file "AGENTS.md" for the maintainers' agent rules
- get_repo_tree with path "packages" to see the code layout
```

## Why

Coding agents do well with code they can see. When you ask about a library or a project that isn't on your machine, they guess, or you end up pasting READMEs and file trees into the chat.

Repo Context fetches that context straight from GitHub and shapes it for an LLM: compact markdown, noise removed, and the details an agent actually needs to start working.

## Tools

Every tool takes `repo` as `owner/name` or any github.com URL (including `/tree/...` and `/blob/...` links), plus an optional `ref` for a branch, tag or commit.

| Tool | What it does |
|------|--------------|
| `analyze_github_repo` | Overview: description, languages, stack detected from manifests, layout, entry points, agent instruction files, install and run commands, README summary |
| `get_repo_tree` | File tree for the repo or a subfolder, with a depth limit. Deep folders show file counts |
| `find_repo_files` | Find files by substring (`auth`) or glob (`*.test.ts`, `src/**/route.ts`) |
| `read_repo_file` | Read a file with line numbers, 400 lines at a time, with `start_line` / `end_line` |
| `search_repo_code` | Full-text code search with snippets (needs `GITHUB_TOKEN`) |
| `get_repo_activity` | Recent commits, latest release, open issues and top contributors |

### What it detects

- **Manifests:** `package.json`, `pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py`, `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle`, `pubspec.yaml`, `Makefile`, including packages inside monorepos
- **Frameworks:** Next.js, React, Vue, Svelte, Angular, Astro, Express, NestJS, Django, FastAPI, Flask, Gin, Axum, Rails, Laravel, Spring Boot, Flutter and many more
- **Data, AI, testing and tooling:** Prisma, Drizzle, SQLAlchemy, OpenAI and Anthropic SDKs, LangChain, PyTorch, Jest, Vitest, pytest, Playwright, Vite, Turborepo, ESLint, Ruff, ...
- **Infra:** Docker, Compose, GitHub Actions, GitLab CI, Terraform, Helm, Kubernetes, Vercel, Netlify, Fly.io, Cloudflare Workers
- **Agent files:** `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.cursor/rules`, `.windsurfrules`, `.github/copilot-instructions.md`

## Install

You need Node.js 20 or newer. Nothing else: the commands below download and build the server the first time they run.

### Claude Code

```bash
claude mcp add repo-context --scope user -- npx -y github:Elarionitis/repo-context-mcp
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "repo-context": {
      "command": "npx",
      "args": ["-y", "github:Elarionitis/repo-context-mcp"]
    }
  }
}
```

### VS Code (Copilot)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "repo-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:Elarionitis/repo-context-mcp"]
    }
  }
}
```

Claude Desktop, Windsurf, Codex CLI and Gemini CLI setups are in [skill/repo-context/reference/setup.md](skill/repo-context/reference/setup.md).

### GitHub token (optional)

Set `GITHUB_TOKEN` (or `GH_TOKEN`) to:

- read private repositories
- use `search_repo_code`
- raise the rate limit from 60 to 5,000 API requests per hour

A [fine-grained token](https://github.com/settings/personal-access-tokens) with read-only access is enough. Add it to the `env` block of your MCP config, or with Claude Code:

```bash
claude mcp add repo-context --scope user -e GITHUB_TOKEN=your_token -- npx -y github:Elarionitis/repo-context-mcp
```

Without a token, file contents come from `raw.githubusercontent.com`, which doesn't count toward the API limit. A full `analyze_github_repo` costs 3 API requests.

## Command line

The same tools work from a terminal, which is handy for scripts and for agents without MCP support:

```bash
npx -y github:Elarionitis/repo-context-mcp analyze vercel/next.js
npx -y github:Elarionitis/repo-context-mcp tree facebook/react packages --depth 2
npx -y github:Elarionitis/repo-context-mcp find tokio-rs/axum "*.toml"
npx -y github:Elarionitis/repo-context-mcp read https://github.com/expressjs/express/blob/master/index.js
npx -y github:Elarionitis/repo-context-mcp search facebook/react "useSyncExternalStore"
npx -y github:Elarionitis/repo-context-mcp activity fastapi/fastapi --commits 5
```

Run `npx -y github:Elarionitis/repo-context-mcp help` for all options.

## Agent skill

[`skill/repo-context`](skill/repo-context) is a ready-made skill (`SKILL.md`) that tells the agent when to use these tools and in what order: overview first, then the maintainers' agent rules, then targeted tree, find and read calls. Build the zip with:

```bash
npm run package:skill
```

## Development

```bash
git clone https://github.com/Elarionitis/repo-context-mcp.git
cd repo-context-mcp
npm install
npm run build
npm test
```

- `npm run dev`: run straight from `src/` (Node 22.18+ runs TypeScript directly)
- `npm run inspect`: open the MCP Inspector against the built server
- `node dist/index.js analyze owner/name`: try the CLI locally

### Project layout

```text
src/
  index.ts     entry: MCP server with no args, CLI otherwise
  server.ts    MCP tool definitions
  cli.ts       command line interface
  context.ts   builds the markdown each tool returns
  github.ts    GitHub API client: token, caching, errors
  detect.ts    stack and command detection from manifests
  readme.ts    README cleanup, intro and setup sections
  tree.ts      file tree rendering and file search
  parse.ts     repo name and URL parsing
test/          node:test tests, no network needed
skill/         agent skill package
```

## Limitations

- GitHub only, no GitLab or Bitbucket yet
- Stack detection reads manifests and file names. It doesn't parse code
- For very large repos (over about 100k files), GitHub returns a partial file tree. The output says when that happens
- Code search only covers the default branch, which is a GitHub limitation

## Author

Suhan Ramani ([@Elarionitis](https://github.com/Elarionitis))

## License

MIT
