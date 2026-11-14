import { createRequire } from "node:module";

// package.json sits one folder up from both src/ and dist/
const pkg = createRequire(import.meta.url)("../package.json") as { version: string };

export const VERSION = pkg.version;
