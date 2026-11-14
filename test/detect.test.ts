import { test } from "node:test";
import assert from "node:assert/strict";
import { detectStack, pickManifests } from "../src/detect.ts";

function items(report: ReturnType<typeof detectStack>): string[] {
  return report.groups.flatMap((g) => g.items);
}

test("pickManifests prefers root, skips examples", () => {
  const paths = [
    "examples/blog/package.json",
    "packages/core/package.json",
    "package.json",
    "a/b/c/package.json",
    "README.md",
  ];
  assert.deepEqual(pickManifests(paths), ["package.json", "packages/core/package.json"]);
});

test("node project with pnpm", () => {
  const pkg = JSON.stringify({
    main: "dist/index.js",
    scripts: { lint: "eslint .", test: "vitest", dev: "next dev" },
    dependencies: { next: "15", react: "19", "@prisma/client": "6" },
    devDependencies: { typescript: "5", vitest: "3" },
  });
  const paths = ["package.json", "pnpm-lock.yaml", "Dockerfile", ".github/workflows/ci.yml", "tsconfig.json"];
  const report = detectStack(paths, new Map([["package.json", pkg]]));

  for (const name of ["Next.js", "React", "Prisma", "TypeScript", "Vitest", "Docker", "GitHub Actions"]) {
    assert.ok(items(report).includes(name), `missing ${name}`);
  }
  assert.deepEqual(report.packageManagers, ["pnpm"]);
  assert.deepEqual(report.install, ["pnpm install"]);
  assert.deepEqual(
    report.commands.map((c) => c.command),
    ["pnpm dev", "pnpm test", "pnpm lint"],
  );
  assert.deepEqual(report.entryHints, ["dist/index.js"]);
});

test("python project", () => {
  const pyproject = `
[project]
name = "demo"
description = "made with black magic"
dependencies = ["fastapi>=0.110", "sqlalchemy[asyncio]", "pydantic"]

[tool.poetry]
`;
  const report = detectStack(["pyproject.toml", "poetry.lock", "tests/conftest.py"], new Map([["pyproject.toml", pyproject]]));

  assert.ok(items(report).includes("FastAPI"));
  assert.ok(items(report).includes("SQLAlchemy"));
  assert.ok(items(report).includes("pytest"));
  // "black" only appears in the description, not as a dependency
  assert.ok(!items(report).includes("Black"));
  assert.deepEqual(report.install, ["poetry install"]);
});

test("go, rust and makefile", () => {
  const gomod = "module x\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.0\n)\n";
  const cargo = '[package]\nname = "x"\n\n[dependencies]\ntokio = { version = "1" }\naxum = "0.7"\n';
  const makefile = ".PHONY: build\nbuild:\n\tgo build\nVAR := 1\ntest: build\n\tgo test\n";
  const report = detectStack(
    ["go.mod", "Cargo.toml", "src/main.rs", "Makefile"],
    new Map([
      ["go.mod", gomod],
      ["Cargo.toml", cargo],
      ["Makefile", makefile],
    ]),
  );

  for (const name of ["Gin", "Tokio", "Axum", "Make"]) {
    assert.ok(items(report).includes(name), `missing ${name}`);
  }
  const commands = report.commands.map((c) => c.command);
  assert.ok(commands.includes("make build"));
  assert.ok(commands.includes("make test"));
  assert.ok(!commands.some((c) => c.includes("VAR")));
  assert.ok(commands.includes("cargo run"));
});
