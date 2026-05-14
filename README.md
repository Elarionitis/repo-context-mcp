# Repo Context MCP

A lightweight MCP (Model Context Protocol) server that provides GitHub repository context to AI coding assistants like Cursor, Claude Code, and other MCP-compatible tools.

---

# The Problem

AI coding assistants are powerful, but they usually lack repository-specific context.

In real workflows, developers repeatedly need to explain:

* what the project does
* which frameworks are used
* how the repository is structured
* where the backend/frontend lives
* setup instructions
* architecture decisions

Without proper repository context, AI assistants often:

* generate incorrect assumptions
* misunderstand project structure
* produce low-quality suggestions
* require repeated manual explanations

---

# What This MCP Solves

Repo Context MCP helps automate repository onboarding for AI systems.

Instead of manually pasting README files or explaining project structure in every conversation, the MCP server fetches repository information directly from GitHub and converts it into structured AI-friendly context.

This allows AI coding assistants to start with significantly better understanding of the repository.

---

# How It Works

```text id="xt9kq1"
AI Assistant
      ↓
Repo Context MCP
      ↓
GitHub API
      ↓
Structured Repository Context
```

The MCP server:

* fetches GitHub repository metadata
* reads repository README content
* detects basic tech stack/frameworks
* generates structured project summaries for LLM consumption

---

# Features

* GitHub repository metadata fetching
* README extraction
* Basic framework/stack detection
* AI-friendly repository summaries
* Lightweight TypeScript implementation
* MCP-compatible architecture

---

# Example Use Cases

Analyze repositories like:

* `vercel/next.js`
* `microsoft/vscode`
* `facebook/react`
* `Elarionitis/sqora`

Example prompts:

```text id="v8m2d4"
Analyze vercel/next.js
Explain microsoft/vscode architecture
Generate repository context for facebook/react
```

---

# Example Output

```text id="t5j7w9"
Repository Context

Project:
vercel/next.js

Description:
The React Framework for the Web

Primary Language:
TypeScript

Detected Stack:
- TypeScript
- React
- Next.js
```

---

# Tech Stack

* TypeScript
* Node.js
* MCP SDK
* GitHub REST API

---

# Installation

## Clone Repository

```bash id="n1q3r5"
git clone https://github.com/Elarionitis/repo-context-mcp.git
cd repo-context-mcp
```

## Install Dependencies

```bash id="b7d9f2"
npm install
```

## Build Project

```bash id="m4p6s8"
npm run build
```

## Run MCP Server

```bash id="k2x5z7"
node dist/index.js
```

---

# Cursor MCP Configuration

Add this to your Cursor MCP configuration:

```json id="h3j6l9"
{
  "mcpServers": {
    "repo-context-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/repo-context-mcp/dist/index.js"
      ]
    }
  }
}
```

---

# Current Limitations

Currently the MCP server:

* performs lightweight repository analysis
* does not recursively analyze the entire codebase
* does not perform semantic code understanding
* supports public GitHub repositories only

---

# Future Improvements

Planned improvements include:

* Recursive repository analysis
* Package.json dependency parsing
* Smarter README summarization
* Semantic repository indexing
* AST-based code understanding
* Token-efficient context compression
* Bug localization assistance
* Private repository support using GitHub tokens

---

# Why This Project Exists

This project was built to explore:

* MCP architecture
* AI tooling infrastructure
* repository context engineering
* GitHub API integration
* developer tooling for LLM workflows

---
# Author

Suhan Ramani

---
# License

MIT
