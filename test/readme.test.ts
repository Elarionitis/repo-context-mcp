import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanMarkdown, readmeHeadings, readmeIntro, setupSections } from "../src/readme.ts";

const README = `<p align="center"><img src="logo.png"></p>

# Demo

[![CI](https://img.shields.io/ci.svg)](https://ci) ![npm](https://img.shields.io/npm.svg)

Demo is a small tool that does useful things for people who need useful things done quickly.

## Features

- fast

## Installation

\`\`\`bash
# not a heading
npm install demo
\`\`\`

### From source

Clone and build.

## License

MIT
`;

test("cleanMarkdown removes badges and html", () => {
  const clean = cleanMarkdown(README);
  assert.ok(!clean.includes("shields.io"));
  assert.ok(!clean.includes("<img"));
});

test("intro is the text before the first section", () => {
  assert.equal(readmeIntro(README), "Demo is a small tool that does useful things for people who need useful things done quickly.");
});

test("setup sections include subsections and ignore # in code", () => {
  const setup = setupSections(README);
  assert.ok(setup.startsWith("### Installation"));
  assert.ok(setup.includes("npm install demo"));
  assert.ok(setup.includes("Clone and build."));
  assert.ok(!setup.includes("MIT"));
});

test("headings outline", () => {
  assert.deepEqual(readmeHeadings(README), ["- Features", "- Installation", "  - From source", "- License"]);
});
