// Works out the tech stack and the commands to run a project from its file
// list and a handful of manifest files (package.json, pyproject.toml, ...).

type Group = "frameworks" | "data" | "ai" | "testing" | "tooling" | "infra";

const GROUP_TITLES: Record<Group, string> = {
  frameworks: "Frameworks & libraries",
  data: "Data & storage",
  ai: "AI / LLM",
  testing: "Testing",
  tooling: "Build & tooling",
  infra: "Infra & deploy",
};

type Rule = [match: string | RegExp, group: Group, label: string];

const NPM_RULES: Rule[] = [
  ["next", "frameworks", "Next.js"],
  ["react", "frameworks", "React"],
  ["react-native", "frameworks", "React Native"],
  ["expo", "frameworks", "Expo"],
  ["vue", "frameworks", "Vue"],
  ["nuxt", "frameworks", "Nuxt"],
  ["svelte", "frameworks", "Svelte"],
  ["@sveltejs/kit", "frameworks", "SvelteKit"],
  ["@angular/core", "frameworks", "Angular"],
  ["solid-js", "frameworks", "SolidJS"],
  ["astro", "frameworks", "Astro"],
  [/^@remix-run\//, "frameworks", "Remix"],
  ["gatsby", "frameworks", "Gatsby"],
  ["express", "frameworks", "Express"],
  ["fastify", "frameworks", "Fastify"],
  ["@nestjs/core", "frameworks", "NestJS"],
  ["koa", "frameworks", "Koa"],
  ["hono", "frameworks", "Hono"],
  ["electron", "frameworks", "Electron"],
  ["@tauri-apps/api", "frameworks", "Tauri"],
  ["tailwindcss", "frameworks", "Tailwind CSS"],
  [/^@mui\//, "frameworks", "Material UI"],
  [/^@radix-ui\//, "frameworks", "Radix UI"],
  ["@chakra-ui/react", "frameworks", "Chakra UI"],
  [/^(redux|@reduxjs\/toolkit)$/, "frameworks", "Redux"],
  ["zustand", "frameworks", "Zustand"],
  ["@tanstack/react-query", "frameworks", "TanStack Query"],
  [/^@trpc\//, "frameworks", "tRPC"],
  ["graphql", "frameworks", "GraphQL"],
  [/^@apollo\//, "frameworks", "Apollo"],
  ["socket.io", "frameworks", "Socket.IO"],
  ["three", "frameworks", "Three.js"],
  ["d3", "frameworks", "D3"],
  ["jquery", "frameworks", "jQuery"],
  ["zod", "frameworks", "Zod"],

  [/^(prisma|@prisma\/client)$/, "data", "Prisma"],
  ["drizzle-orm", "data", "Drizzle ORM"],
  ["mongoose", "data", "Mongoose"],
  ["mongodb", "data", "MongoDB"],
  ["typeorm", "data", "TypeORM"],
  ["sequelize", "data", "Sequelize"],
  [/^(pg|postgres)$/, "data", "PostgreSQL"],
  ["mysql2", "data", "MySQL"],
  [/^(redis|ioredis)$/, "data", "Redis"],
  ["@supabase/supabase-js", "data", "Supabase"],
  [/^(firebase|firebase-admin)$/, "data", "Firebase"],
  [/^(better-sqlite3|sqlite3)$/, "data", "SQLite"],

  ["openai", "ai", "OpenAI SDK"],
  ["@anthropic-ai/sdk", "ai", "Anthropic SDK"],
  [/^(langchain|@langchain\/.+)$/, "ai", "LangChain"],
  ["ai", "ai", "Vercel AI SDK"],
  ["@modelcontextprotocol/sdk", "ai", "MCP SDK"],
  [/^@google\/(genai|generative-ai)$/, "ai", "Gemini SDK"],
  ["llamaindex", "ai", "LlamaIndex"],

  ["jest", "testing", "Jest"],
  ["vitest", "testing", "Vitest"],
  ["mocha", "testing", "Mocha"],
  [/^(playwright|@playwright\/test)$/, "testing", "Playwright"],
  ["cypress", "testing", "Cypress"],
  [/^@testing-library\//, "testing", "Testing Library"],

  ["typescript", "tooling", "TypeScript"],
  ["vite", "tooling", "Vite"],
  ["webpack", "tooling", "Webpack"],
  ["esbuild", "tooling", "esbuild"],
  ["rollup", "tooling", "Rollup"],
  ["turbo", "tooling", "Turborepo"],
  ["nx", "tooling", "Nx"],
  ["eslint", "tooling", "ESLint"],
  ["prettier", "tooling", "Prettier"],
  ["@biomejs/biome", "tooling", "Biome"],
  [/^@storybook\//, "tooling", "Storybook"],
];

const PY_RULES: Rule[] = [
  ["django", "frameworks", "Django"],
  ["flask", "frameworks", "Flask"],
  ["fastapi", "frameworks", "FastAPI"],
  ["streamlit", "frameworks", "Streamlit"],
  ["gradio", "frameworks", "Gradio"],
  ["pydantic", "frameworks", "Pydantic"],
  ["celery", "frameworks", "Celery"],
  ["pandas", "frameworks", "pandas"],
  ["numpy", "frameworks", "NumPy"],
  ["scikit-learn", "ai", "scikit-learn"],
  ["torch", "ai", "PyTorch"],
  ["tensorflow", "ai", "TensorFlow"],
  ["jax", "ai", "JAX"],
  ["transformers", "ai", "Hugging Face Transformers"],
  ["langchain", "ai", "LangChain"],
  [/llama[-_]index/, "ai", "LlamaIndex"],
  ["openai", "ai", "OpenAI SDK"],
  ["anthropic", "ai", "Anthropic SDK"],
  ["mcp", "ai", "MCP SDK"],
  ["sqlalchemy", "data", "SQLAlchemy"],
  [/psycopg2?(-binary)?/, "data", "PostgreSQL"],
  ["pymongo", "data", "MongoDB"],
  ["redis", "data", "Redis"],
  ["pytest", "testing", "pytest"],
  ["ruff", "tooling", "Ruff"],
  ["black", "tooling", "Black"],
  ["mypy", "tooling", "mypy"],
];

const GO_RULES: Rule[] = [
  ["github.com/gin-gonic/gin", "frameworks", "Gin"],
  ["github.com/labstack/echo", "frameworks", "Echo"],
  ["github.com/gofiber/fiber", "frameworks", "Fiber"],
  ["github.com/go-chi/chi", "frameworks", "chi"],
  ["github.com/gorilla/mux", "frameworks", "Gorilla Mux"],
  ["github.com/spf13/cobra", "frameworks", "Cobra"],
  ["google.golang.org/grpc", "frameworks", "gRPC"],
  ["gorm.io/gorm", "data", "GORM"],
  ["github.com/jackc/pgx", "data", "PostgreSQL"],
  ["github.com/stretchr/testify", "testing", "testify"],
];

const CARGO_RULES: Rule[] = [
  ["tokio", "frameworks", "Tokio"],
  ["axum", "frameworks", "Axum"],
  ["actix-web", "frameworks", "Actix Web"],
  ["rocket", "frameworks", "Rocket"],
  ["serde", "frameworks", "Serde"],
  ["clap", "frameworks", "clap"],
  ["tauri", "frameworks", "Tauri"],
  ["bevy", "frameworks", "Bevy"],
  ["sqlx", "data", "SQLx"],
  ["diesel", "data", "Diesel"],
];

const GEM_RULES: Rule[] = [
  ["rails", "frameworks", "Ruby on Rails"],
  ["sinatra", "frameworks", "Sinatra"],
  ["sidekiq", "frameworks", "Sidekiq"],
  ["rspec", "testing", "RSpec"],
];

const JVM_RULES: Rule[] = [
  ["spring-boot", "frameworks", "Spring Boot"],
  ["quarkus", "frameworks", "Quarkus"],
  ["micronaut", "frameworks", "Micronaut"],
  ["junit", "testing", "JUnit"],
];

// Files that tell us something just by existing.
const FILE_RULES: [RegExp, Group, string][] = [
  [/(^|\/)Dockerfile[^/]*$/, "infra", "Docker"],
  [/(^|\/)(docker-)?compose\.ya?ml$/, "infra", "Docker Compose"],
  [/^\.github\/workflows\/[^/]+\.ya?ml$/, "infra", "GitHub Actions"],
  [/^\.gitlab-ci\.yml$/, "infra", "GitLab CI"],
  [/^\.circleci\/config\.yml$/, "infra", "CircleCI"],
  [/(^|\/)Jenkinsfile$/, "infra", "Jenkins"],
  [/\.tf$/, "infra", "Terraform"],
  [/(^|\/)Chart\.yaml$/, "infra", "Helm"],
  [/(^|\/)(k8s|kubernetes)\//, "infra", "Kubernetes"],
  [/^vercel\.json$/, "infra", "Vercel"],
  [/^netlify\.toml$/, "infra", "Netlify"],
  [/^fly\.toml$/, "infra", "Fly.io"],
  [/^render\.yaml$/, "infra", "Render"],
  [/(^|\/)serverless\.ya?ml$/, "infra", "Serverless Framework"],
  [/(^|\/)wrangler\.(toml|jsonc?)$/, "infra", "Cloudflare Workers"],
  [/^Procfile$/, "infra", "Procfile"],

  [/(^|\/)tsconfig\.json$/, "tooling", "TypeScript"],
  [/^turbo\.json$/, "tooling", "Turborepo"],
  [/^nx\.json$/, "tooling", "Nx"],
  [/^lerna\.json$/, "tooling", "Lerna"],
  [/(^|\/)CMakeLists\.txt$/, "tooling", "CMake"],
  [/^Makefile$/, "tooling", "Make"],
  [/^\.pre-commit-config\.yaml$/, "tooling", "pre-commit"],
  [/^deno\.jsonc?$/, "tooling", "Deno"],

  [/\.prisma$/, "data", "Prisma"],

  [/(^|\/)jest\.config\.[cm]?[jt]s$/, "testing", "Jest"],
  [/(^|\/)vitest\.config\.[cm]?[jt]s$/, "testing", "Vitest"],
  [/(^|\/)playwright\.config\.[cm]?[jt]s$/, "testing", "Playwright"],
  [/(^|\/)cypress\.config\.[cm]?[jt]s$/, "testing", "Cypress"],
  [/(^|\/)(pytest\.ini|conftest\.py)$/, "testing", "pytest"],

  [/\.(csproj|sln)$/, "frameworks", ".NET"],
  [/^Package\.swift$/, "tooling", "Swift Package Manager"],
];

const MANIFESTS = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "setup.py",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "pubspec.yaml",
  "Makefile",
]);

// Sample and test folders often have their own manifests that would drown
// out the real project, so skip them.
const SKIP_DIRS = /(^|\/)(examples?|samples?|fixtures?|tests?|__tests__|e2e|docs?|templates?|benchmarks?)\//i;

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function depth(path: string): number {
  return path.split("/").length - 1;
}

// Root manifests first, then ones up to two folders deep (monorepo packages).
export function pickManifests(paths: string[], max = 12): string[] {
  return paths
    .filter((p) => MANIFESTS.has(baseName(p)) && depth(p) <= 2 && !SKIP_DIRS.test(p))
    .sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))
    .slice(0, max);
}

export interface Command {
  command: string;
  note?: string;
}

export interface StackGroup {
  title: string;
  items: string[];
}

export interface StackReport {
  groups: StackGroup[];
  packageManagers: string[];
  monorepo: string | null;
  install: string[];
  commands: Command[];
  entryHints: string[];
}

interface PackageJson {
  main?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function matches(match: string | RegExp, name: string): boolean {
  return typeof match === "string" ? match === name : match.test(name);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Looks for a dependency name in a text manifest: at the start of a line
// (requirements.txt, poetry tables) or right after a quote (pyproject lists,
// setup.py). This avoids matching words in descriptions.
function hasTextDep(text: string, match: string | RegExp): boolean {
  const name = typeof match === "string" ? escapeRe(match) : match.source;
  return new RegExp(`(^|["'])\\s*(${name})\\s*(?=[<>=!~;,"'\\[]|$)`, "im").test(text);
}

const SCRIPT_ORDER = ["dev", "start", "build", "test", "lint", "typecheck", "format"];

function runScript(pm: string, name: string): string {
  if (pm === "npm") return name === "test" || name === "start" ? `npm ${name}` : `npm run ${name}`;
  if (pm === "bun") return `bun run ${name}`;
  return `${pm} ${name}`;
}

function shorten(s: string, max = 70): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 3) + "..." : one;
}

export function detectStack(paths: string[], manifests: Map<string, string>): StackReport {
  const found: Record<Group, Set<string>> = {
    frameworks: new Set(),
    data: new Set(),
    ai: new Set(),
    testing: new Set(),
    tooling: new Set(),
    infra: new Set(),
  };
  const add = (group: Group, label: string) => found[group].add(label);

  const managers = new Set<string>();
  const install: string[] = [];
  const commands: Command[] = [];
  const entryHints: string[] = [];
  let monorepo: string | null = null;

  const pathSet = new Set(paths);
  const has = (p: string) => pathSet.has(p);

  for (const path of paths) {
    for (const [re, group, label] of FILE_RULES) {
      if (re.test(path)) add(group, label);
    }
  }

  // package manager from root lockfiles
  let pm = "npm";
  if (has("pnpm-lock.yaml")) pm = "pnpm";
  else if (has("yarn.lock")) pm = "yarn";
  else if (has("bun.lockb") || has("bun.lock")) pm = "bun";

  if (has("go.work")) monorepo = "Go workspace";
  if (has("pnpm-workspace.yaml")) monorepo = "pnpm workspaces";
  if (has("lerna.json")) monorepo = "Lerna";
  if (has("nx.json")) monorepo = "Nx";
  if (has("turbo.json")) monorepo = "Turborepo";

  for (const [path, text] of manifests) {
    const name = baseName(path);
    const isRoot = depth(path) === 0;

    if (name === "package.json") {
      const pkg = parseJson<PackageJson>(text);
      if (!pkg) continue;

      if (isRoot && pkg.packageManager) {
        pm = pkg.packageManager.split("@")[0] || pm;
      }

      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
      for (const dep of deps) {
        for (const [match, group, label] of NPM_RULES) {
          if (matches(match, dep)) add(group, label);
        }
      }

      if (!isRoot) continue;

      if (pkg.workspaces && !monorepo) monorepo = `${pm} workspaces`;
      if (pkg.main) entryHints.push(pkg.main);
      if (typeof pkg.bin === "string") entryHints.push(pkg.bin);
      else if (pkg.bin) entryHints.push(...Object.values(pkg.bin));

      const scripts = pkg.scripts ?? {};
      const names = Object.keys(scripts).sort((a, b) => {
        const ia = SCRIPT_ORDER.indexOf(a);
        const ib = SCRIPT_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      for (const s of names.slice(0, 10)) {
        commands.push({ command: runScript(pm, s), note: shorten(scripts[s]) });
      }
    }

    if (name === "requirements.txt" || name === "pyproject.toml" || name === "Pipfile" || name === "setup.py") {
      for (const [match, group, label] of PY_RULES) {
        if (hasTextDep(text, match)) add(group, label);
      }
      if (isRoot && name === "pyproject.toml" && /\[tool\.poetry\]/.test(text)) managers.add("Poetry");
    }

    if (name === "go.mod") {
      for (const [match, group, label] of GO_RULES) {
        if (text.includes(match as string)) add(group, label);
      }
    }

    if (name === "Cargo.toml") {
      for (const [match, group, label] of CARGO_RULES) {
        if (new RegExp(`^\\s*${escapeRe(match as string)}\\s*=`, "m").test(text)) add(group, label);
      }
      if (isRoot && /^\[workspace\]/m.test(text)) monorepo = monorepo ?? "Cargo workspace";
    }

    if (name === "Gemfile") {
      for (const [match, group, label] of GEM_RULES) {
        if (new RegExp(`gem\\s+["']${escapeRe(match as string)}["']`).test(text)) add(group, label);
      }
    }

    if (name === "composer.json") {
      const deps = Object.keys(parseJson<{ require?: object; "require-dev"?: object }>(text)?.require ?? {});
      if (deps.includes("laravel/framework")) add("frameworks", "Laravel");
      if (deps.some((d) => d.startsWith("symfony/"))) add("frameworks", "Symfony");
      if (/phpunit/.test(text)) add("testing", "PHPUnit");
    }

    if (name === "pom.xml" || name.startsWith("build.gradle")) {
      for (const [match, group, label] of JVM_RULES) {
        if (text.includes(match as string)) add(group, label);
      }
      if (name.endsWith(".kts") || text.includes("org.jetbrains.kotlin")) add("frameworks", "Kotlin");
    }

    if (name === "pubspec.yaml" && /^\s*flutter:/m.test(text)) add("frameworks", "Flutter");

    if (name === "Makefile" && isRoot) {
      const targets = [...text.matchAll(/^([A-Za-z0-9][A-Za-z0-9_.-]*):(?!=)/gm)].map((m) => m[1]);
      for (const t of [...new Set(targets)].slice(0, 8)) commands.push({ command: `make ${t}` });
    }
  }

  // package managers and install commands
  const hasJs = paths.some((p) => baseName(p) === "package.json");
  if (hasJs) {
    managers.add(pm);
    install.push(`${pm} install`);
  }

  if (has("uv.lock")) {
    managers.add("uv");
    install.push("uv sync");
  } else if (managers.has("Poetry") || has("poetry.lock")) {
    managers.add("Poetry");
    install.push("poetry install");
  } else if (has("Pipfile")) {
    managers.add("Pipenv");
    install.push("pipenv install");
  } else if (has("requirements.txt")) {
    managers.add("pip");
    install.push("pip install -r requirements.txt");
  } else if (has("pyproject.toml") || has("setup.py")) {
    managers.add("pip");
    install.push("pip install -e .");
  }
  if (has("manage.py")) commands.push({ command: "python manage.py runserver" });
  if (found.testing.has("pytest") && (has("pyproject.toml") || has("requirements.txt") || has("setup.py"))) {
    commands.push({ command: "pytest" });
  }

  if (has("go.mod")) {
    managers.add("Go modules");
    install.push("go mod download");
    commands.push({ command: "go build ./..." }, { command: "go test ./..." });
  }

  if (has("Cargo.toml")) {
    managers.add("Cargo");
    commands.push({ command: "cargo build" }, { command: "cargo test" });
    if (has("src/main.rs")) commands.push({ command: "cargo run" });
  }

  if (has("Gemfile")) {
    managers.add("Bundler");
    install.push("bundle install");
  }
  if (has("composer.json")) {
    managers.add("Composer");
    install.push("composer install");
  }
  if (has("pom.xml")) {
    managers.add("Maven");
    commands.push({ command: "mvn package" });
  }
  if (has("build.gradle") || has("build.gradle.kts")) {
    managers.add("Gradle");
    commands.push({ command: "./gradlew build" });
  }
  if (has("pubspec.yaml")) {
    managers.add("pub");
    install.push(found.frameworks.has("Flutter") ? "flutter pub get" : "dart pub get");
  }

  if (paths.some((p) => /^(docker-)?compose\.ya?ml$/.test(p))) {
    commands.push({ command: "docker compose up" });
  }

  const groups = (Object.keys(GROUP_TITLES) as Group[])
    .filter((g) => found[g].size > 0)
    .map((g) => ({ title: GROUP_TITLES[g], items: [...found[g]] }));

  return {
    groups,
    packageManagers: [...managers],
    monorepo,
    install,
    commands,
    entryHints,
  };
}
