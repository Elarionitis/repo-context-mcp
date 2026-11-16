# Setup

The skill works as soon as it's installed. Your agent runs `../scripts/repo-context.mjs` with Node.js. The only requirement is:

- **Node.js 20 or newer.** Check with `node --version`, or install it from https://nodejs.org.

Everything below is optional, and each step is for the user to do. The agent should explain it, not do it on its own.

## Optional: GitHub token

A token adds private repos and code search, and raises GitHub's rate limit from 60 to 5,000 requests per hour.

1. The user creates a fine-grained token at https://github.com/settings/personal-access-tokens.
2. Public repos need no extra permissions. Private repos need read-only **Contents** and **Metadata** access.
3. The user makes it available as `GITHUB_TOKEN` (`GH_TOKEN` also works), for example in their shell profile.

The token is only sent to api.github.com. The skill never asks for it, prints it or stores it.

## Optional: native MCP tools

The same tool also runs as an MCP server, which gives the agent six native tools (`analyze_github_repo`, `get_repo_tree` and so on) instead of shell commands. The MCP server ships in the project's npm package, not in this skill. Setup steps for Claude Code, Cursor, VS Code, Claude Desktop, Windsurf, Codex CLI and Gemini CLI are in the project README: https://github.com/Elarionitis/repo-context-mcp#install

## Check it works

Run the first example in SKILL.md (`analyze expressjs/express`). You should see a summary with the stack, layout and run commands.
