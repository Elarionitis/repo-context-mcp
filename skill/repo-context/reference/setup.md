# Setup

The skill works as soon as it's installed. Your agent runs `scripts/repo-context.mjs` with Node.js. You only need:

- **Node.js 20 or newer.** Check with `node --version`, or install it from https://nodejs.org.

Everything below is optional.

## Optional: GitHub token

A token adds private repos and code search, and raises GitHub's rate limit from 60 to 5,000 requests per hour.

1. Go to https://github.com/settings/personal-access-tokens and create a **fine-grained token**.
2. For public repos only, no permissions are needed. For private repos, give it read-only **Contents** and **Metadata** access to those repos.
3. Make it available as `GITHUB_TOKEN` (`GH_TOKEN` also works):
   - macOS / Linux: add `export GITHUB_TOKEN=your_token` to `~/.zshrc` or `~/.bashrc`, then open a new terminal
   - Windows (PowerShell): `setx GITHUB_TOKEN your_token`, then restart your agent
   - Or put it in the `env` block of the MCP config below

The token is only sent to `api.github.com`.

## Optional: native MCP tools

The script also runs as an MCP server. That gives your agent six native tools instead of shell commands, with results cached between calls.

In each config below, replace `/path/to/repo-context` with the absolute path of this skill's folder. For Claude Code that is usually `~/.claude/skills/repo-context`.

### Claude Code

```bash
claude mcp add repo-context --scope user -- node ~/.claude/skills/repo-context/scripts/repo-context.mjs
```

With a token:

```bash
claude mcp add repo-context --scope user -e GITHUB_TOKEN=your_token -- node ~/.claude/skills/repo-context/scripts/repo-context.mjs
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "repo-context": {
      "command": "node",
      "args": ["/path/to/repo-context/scripts/repo-context.mjs"],
      "env": { "GITHUB_TOKEN": "your_token" }
    }
  }
}
```

Leave out `env` if you don't use a token.

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "repo-context": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/repo-context/scripts/repo-context.mjs"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json` (Settings > Developer > Edit Config):

```json
{
  "mcpServers": {
    "repo-context": {
      "command": "node",
      "args": ["/path/to/repo-context/scripts/repo-context.mjs"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`, same shape as Cursor.

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.repo-context]
command = "node"
args = ["/path/to/repo-context/scripts/repo-context.mjs"]
```

### Gemini CLI

Add to `~/.gemini/settings.json`, same shape as Cursor.

## Check it works

```bash
node /path/to/repo-context/scripts/repo-context.mjs analyze expressjs/express
```

You should see a summary with the stack, layout and run commands. With MCP set up, restart your agent and ask: "Analyze expressjs/express".
