# Setting up the repo-context MCP server

The skill needs the `repo-context` MCP server. It runs locally with Node.js 20 or newer and talks to the GitHub API. No account or API key is needed for public repositories.

## Optional: GitHub token

A token is needed for private repos and code search, and raises the rate limit from 60 to 5,000 requests per hour.

1. Go to https://github.com/settings/personal-access-tokens and create a **fine-grained token**.
2. For public repos only, no permissions are needed. For private repos, give it read-only **Contents** and **Metadata** access to those repos.
3. Pass it as `GITHUB_TOKEN` in the config below. `GH_TOKEN` also works.

The token is only sent to `api.github.com`.

## Claude Code

```bash
claude mcp add repo-context --scope user -- npx -y github:Elarionitis/repo-context-mcp
```

With a token:

```bash
claude mcp add repo-context --scope user -e GITHUB_TOKEN=your_token -- npx -y github:Elarionitis/repo-context-mcp
```

## Cursor

Add to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "repo-context": {
      "command": "npx",
      "args": ["-y", "github:Elarionitis/repo-context-mcp"],
      "env": { "GITHUB_TOKEN": "your_token" }
    }
  }
}
```

Leave out `env` if you don't use a token.

## VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "repo-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:Elarionitis/repo-context-mcp"],
      "env": { "GITHUB_TOKEN": "your_token" }
    }
  }
}
```

## Claude Desktop

Add to `claude_desktop_config.json` (Settings > Developer > Edit Config):

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

## Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`, same shape as Cursor:

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

## Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.repo-context]
command = "npx"
args = ["-y", "github:Elarionitis/repo-context-mcp"]
env = { GITHUB_TOKEN = "your_token" }
```

## Gemini CLI

Add to `~/.gemini/settings.json`:

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

## Check it works

Restart your agent and ask: "Analyze expressjs/express". You should get a summary with the stack, layout and run commands.

Or from a terminal:

```bash
npx -y github:Elarionitis/repo-context-mcp analyze expressjs/express
```

## Troubleshooting

- **First start is slow or times out:** the first `npx` run downloads and builds the server. Run the terminal command above once, then restart the agent.
- **`npx` not found:** install Node.js 20+ from https://nodejs.org.
- **Rate limit errors:** add a `GITHUB_TOKEN`.
