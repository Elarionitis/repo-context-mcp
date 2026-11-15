// Bundles the server and CLI into one file inside the skill folder, so the
// skill works on its own with just Node.js installed. Also writes the
// license notices for the bundled open source packages.

import { build } from "esbuild";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "skill/repo-context/scripts");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const result = await build({
  entryPoints: [join(root, "src/index.ts")],
  outfile: join(outDir, "repo-context.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // kept readable on purpose so the code can be reviewed
  minify: false,
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
  "Copyright (c) 2026 Suhan Ramani. All rights reserved.",
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
writeFileSync(join(outDir, "THIRD_PARTY_NOTICES.txt"), notices.join("\n"));

const size = readFileSync(join(outDir, "repo-context.mjs")).length;
console.log(`skill script built: ${(size / 1024).toFixed(0)} KB, ${packages.size} bundled packages`);
