import { createRequire } from "node:module";

// Set by the skill build, where package.json isn't shipped.
declare const __VERSION__: string | undefined;

function readPackageVersion(): string {
  // package.json sits one folder up from both src/ and dist/
  const pkg = createRequire(import.meta.url)("../package.json") as { version: string };
  return pkg.version;
}

export const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : readPackageVersion();
