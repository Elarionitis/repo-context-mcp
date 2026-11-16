// Bundles the CLI (no MCP server, no installer) into one file inside the skill folder, so the
// skill works on its own with just Node.js installed. Also writes the
// license notices for the bundled open source packages.

import { build } from "esbuild";
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "skills/repo-context/scripts");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const result = await build({
  entryPoints: [join(root, "src/skill-cli.ts")],
  outfile: join(outDir, "repo-context.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // kept readable on purpose so the code can be reviewed
  minify: false,
  // Write `a${b}` as "a" + b. Security scanners such as NVIDIA SkillSpector
  // read backticks as shell command substitution and can't finish the scan.
  supported: { "template-literal": false },
  legalComments: "none",
  metafile: true,
  define: { __VERSION__: JSON.stringify(pkg.version) },
  // some bundled packages still call require()
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module";\nconst require = __createRequire(import.meta.url);',
  },
  logLevel: "warning",
});

// collect the license of every package that ended up in the bundle
const packages = new Map();
for (const input of Object.keys(result.metafile.inputs)) {
  const m = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  if (m) packages.set(m[1], join(root, "node_modules", m[1]));
}

const notices = [
  `repo-context ${pkg.version}`,
  "Copyright (c) 2026 Suhan Ramani. MIT License.",
  "Source: https://github.com/Elarionitis/repo-context-mcp",
  "",
  "This file includes the following open source packages:",
  "",
];
for (const [name, dir] of [...packages].sort()) {
  const meta = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const licenseFile = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
  notices.push("=".repeat(70), `${name} ${meta.version} (${meta.license ?? "see below"})`, "=".repeat(70));
  if (licenseFile && existsSync(join(dir, licenseFile))) {
    notices.push(readFileSync(join(dir, licenseFile), "utf8").trim());
  }
  notices.push("");
}
// The skill script has no third-party code today. Only ship a notices file if that changes.
const noticesFile = join(outDir, "THIRD_PARTY_NOTICES.txt");
if (packages.size > 0) writeFileSync(noticesFile, notices.join("\n"));
else rmSync(noticesFile, { force: true });

// With template literals turned off above, every backtick left is inside a
// string or regex (Markdown code fences), where \x60 means the same thing.
// Unpaired backticks are what stop shell-aware scanners from finishing.
const scriptFile = join(outDir, "repo-context.mjs");
writeFileSync(scriptFile, readFileSync(scriptFile, "utf8").replaceAll("`", "\\x60"));

const size = readFileSync(scriptFile).length;
console.log(`skill script built: ${(size / 1024).toFixed(0)} KB, ${packages.size} bundled packages`);
