# Repo Context

**Your AI coding agent can now understand any GitHub repository without cloning it.**

Paste a GitHub link or `owner/name` into Claude Code, Cursor or Copilot. Your agent gets the tech stack, folder layout, entry points, run commands and README summary in one step, then browses and reads the code on its own.

**[Get Repo Context on Agensi →](https://www.agensi.io/skills/YOUR-SKILL-LINK)**

---

## What your agent sees

```text
> Analyze vercel/next.js

# vercel/next.js
> The React Framework

- Stars: 143,519 · Forks: 32,804 · License: MIT
- Last push: today

## Tech stack
- Frameworks & libraries: Next.js, React, Express, Tailwind CSS, ...
- Testing: Jest, Playwright, Cypress, Vitest
- Build & tooling: TypeScript, Turborepo, esbuild, ESLint
- Infra & deploy: GitHub Actions, Docker, Vercel
- Monorepo: Turborepo

## Layout
33,820 files
- packages/   3,758 files - workspace packages
- crates/     1,238 files - Rust crates
- docs/         479 files - documentation

## Instructions for AI agents
- AGENTS.md

## How to run
Install: pnpm install
- pnpm dev
- pnpm build
- pnpm test
```

## Features

| | |
|---|---|
| **Real stack detection** | Reads package.json, pyproject.toml, go.mod, Cargo.toml, Gemfile, composer.json, Maven and Gradle files. It doesn't guess from tags |
| **How to run it** | Install command, package scripts, Makefile targets and the README's setup steps in one place |
| **Respects maintainers** | Finds AGENTS.md, CLAUDE.md, .cursorrules and Copilot instructions so your agent follows the project's rules |
| **Browse the code** | File tree, find by name or glob, read files with line numbers, full-text search |
| **Project health** | Recent commits, latest release, open issues, top contributors |
| **Zero setup** | Works right after install with Node.js 20+. No account and no API key |
| **Private repos** | Add an optional GitHub token for private repos and code search |

## Works with

Claude Code · Cursor · VS Code Copilot · Claude Desktop · Windsurf · Codex CLI · Gemini CLI · any MCP client

## Good for

- Onboarding to an unfamiliar codebase in minutes
- "Where is X implemented in library Y?"
- Comparing libraries before you adopt one
- Checking that a dependency is still maintained
- Reviewing open-source projects without cloning them

## Built with

TypeScript · Node.js · Model Context Protocol · GitHub REST API

Read-only. It only talks to GitHub, and nothing is sent anywhere else.

---

**[Get Repo Context on Agensi →](https://www.agensi.io/skills/YOUR-SKILL-LINK)**

Made by [Suhan Ramani](https://github.com/Elarionitis)
