# Testing the skill with SkillEvaluator

[NVIDIA SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator) checks an agent skill in three tiers:

| Tier | What it checks | Needs |
|------|----------------|-------|
| 1 · Static & security | Frontmatter schema, version, security (SkillSpector), secrets (Gitleaks), PII, license, dead links, invisible Unicode, quality score, script lint | Python, SkillSpector, Gitleaks. No API key |
| 2 · Deduplication | Repeated or redundant content inside the skill, and overlap with other skills | An embeddings API key |
| 3 · Live evaluation | Runs a real agent on generated tasks, with and without the skill, and grades the results | An LLM API key, Docker, and an agent CLI |

Tier 1 decides the exit code. Tier 2 also blocks by default. Tier 3 is advisory unless you pass `--block-on-agent-eval`.

## One-time setup (macOS)

```bash
pip install skillevaluator
```

```bash
brew install gitleaks uv
```

SkillSpector needs Python 3.12 (one of its dependencies has no wheel for 3.14 yet):

```bash
uv tool install --python 3.12 https://github.com/NVIDIA/SkillSpector/releases/download/v2.13.3/skillspector-2.13.3-py3-none-any.whl
```

```bash
uv tool update-shell
```

Open a new terminal afterwards so `~/.local/bin` (where `skillspector` lives) is on your `PATH`.

**If you see `certificate verify failed: unable to get local issuer certificate`:** the python.org installer doesn't set up SSL certificates. Run the installer's own fix once:

```bash
open "/Applications/Python 3.14/Install Certificates.command"
```

Or, for one terminal session only:

```bash
export SSL_CERT_FILE="$(python3 -m certifi)"
```

## Tier 1

Build the skill's script first (it's generated, not committed), then validate:

```bash
npm run package:skill
```

```bash
skillevaluator validate ./skills/repo-context --tiers 1
```

Expected: `11/11 passed`, quality `A 100.0 / 100`. Reports land in `reports/` as HTML and JSON. Open the HTML one to see each check's details.

Individual Tier 1 checks, handy while fixing one thing:

```bash
skillevaluator quality-check ./skills/repo-context
```

```bash
skillevaluator security-scan ./skills/repo-context
```

```bash
skillevaluator pii-scan ./skills/repo-context
```

Run SkillSpector on its own (faster to iterate, and shows exact file and line):

```bash
skillspector scan ./skills/repo-context --no-llm
```

## Tier 2

Install the extra, then give it an embeddings provider. A free key from https://build.nvidia.com works:

```bash
pip install "skillevaluator[tier2]"
```

```bash
export SKILL_EVAL_EMBEDDING_PROVIDER=nv_build
export NVIDIA_API_KEY='your-key'
```

(`SKILL_EVAL_EMBEDDING_PROVIDER=openai` with `OPENAI_API_KEY` also works.)

```bash
skillevaluator doctor --tier 2
```

```bash
skillevaluator validate ./skills/repo-context --tiers 1,2
```

## Tier 3

Live evaluation runs an agent in Docker containers through Harbor, so it costs model tokens. Install Docker Desktop and start it, then:

```bash
pip install "skillevaluator[tier3]"
```

```bash
skillevaluator doctor
```

`doctor` tells you which LLM key and agent it found and what's missing.

**If Tier 3 is skipped with `model nvidia/nemotron-3-super-120b-a12b is not listed`:** SkillEvaluator 0.9.0's default NVIDIA model has been retired from build.nvidia.com. Pick one that's still listed (see `curl -s https://integrate.api.nvidia.com/v1/models`):

```bash
export SKILL_EVAL_LLM_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
export SKILL_EVAL_JUDGE_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
```

Then run everything:

```bash
skillevaluator validate ./skills/repo-context
```

Useful flags for Tier 3:

- `--max-cost-usd 5 --price-file prices.json` caps model spend
- `--block-on-agent-eval` makes Tier 3 decide the exit code
- `skillevaluator view` opens the latest live-evaluation report
- `--n-concurrent 2` runs fewer cases at once. Use it if you see `ApiRateLimitError` or `EPIPE: broken pipe` errors with the free NVIDIA key

Tier 3 writes each agent's full log to `skills/repo-context/evals/results/` (ignored by git). Look in `opencode.txt` to see whether the agent loaded the skill (`"tool":"skill"`). Move or delete that folder before the next Tier 1 run, so it isn't scanned as part of the skill.

The test cases are already written in `skills/repo-context/evals/evals.json`: 11 questions about real GitHub repos plus 2 that should not use the skill. `evals/EVAL.md` explains what they cover. Edit those files to add cases. Keep the skill's name out of prompts and assertions, because Tier 3 also grades an agent without the skill on the same cases.

## What "Publication eligibility: Incomplete" means

You'll see this even when Tier 1 passes. Publication needs evidence from all three tiers, and from a committed tree: run it on a clean `git status` with all tiers before treating the result as final.

## Keeping it passing

- Keep the skill's script free of third-party bundles. `scripts/build-skill.mjs` builds only `src/skill-cli.ts`, with no template literals or raw backticks, because SkillSpector can't finish scanning those and reports the scan as incomplete.
- In SKILL.md and `references/`, don't put example paths from other repos (like `src/server.ts`) in backticks or bare in commands. SkillSpector expects every path-like reference to exist inside the skill folder.
- Don't add unpinned `npx` commands inside the skill folder. They're flagged as a rug-pull risk. Keep MCP setup in the README.
