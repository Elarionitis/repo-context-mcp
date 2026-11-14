// Helpers to pull the useful parts out of a README without dumping the whole
// thing into the agent's context.

// Removes badges, html, images and comments, keeps the readable text.
export function cleanMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "") // linked badges
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/<\/?(p|div|span|a|img|br|picture|source|sup|sub|h[1-6]|details|summary|b|strong|em|i|center)\b[^>]*>/gi, "")
    .replace(/^\s*[-*]?\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Section {
  level: number;
  heading: string;
  body: string;
}

function splitSections(md: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { level: 0, heading: "", body: "" };
  let inCode = false;

  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
    const m = !inCode && line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (m) {
      sections.push(current);
      current = { level: m[1].length, heading: m[2], body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  sections.push(current);
  return sections;
}

function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastBreak = slice.lastIndexOf("\n");
  return (lastBreak > max * 0.6 ? slice.slice(0, lastBreak) : slice).trimEnd() + "\n...";
}

// The intro: text before the first second-level heading (or the first
// section with real text in it).
export function readmeIntro(md: string, max = 900): string {
  const sections = splitSections(cleanMarkdown(md));
  const intro = sections
    .filter((s) => s.level <= 1)
    .map((s) => s.body.trim())
    .filter(Boolean)
    .join("\n\n");

  if (intro.length >= 120) return cut(intro, max);

  // intro is just a title or logo, so borrow the first real paragraph
  const first = sections.find((s) => s.level > 1 && s.body.trim().length > 80);
  const text = [intro, first?.body.trim()].filter(Boolean).join("\n\n");
  return text ? cut(text, max) : "";
}

const SETUP_HEADINGS = /install|getting started|get started|quick ?start|setup|set up|usage|development|developing|running|run locally|build/i;

// Sections that explain how to install or run the project.
export function setupSections(md: string, max = 1800): string {
  const sections = splitSections(cleanMarkdown(md));
  const picked: string[] = [];
  let used = 0;

  for (let i = 0; i < sections.length && used < max; i++) {
    const s = sections[i];
    if (!s.heading || !SETUP_HEADINGS.test(s.heading)) continue;

    // include nested subsections
    let body = s.body;
    let j = i + 1;
    while (j < sections.length && sections[j].level > s.level) {
      body += `${"#".repeat(sections[j].level)} ${sections[j].heading}\n${sections[j].body}`;
      j++;
    }
    i = j - 1;

    body = body.trim();
    if (!body) continue;

    const block = cut(`${"#".repeat(Math.max(s.level, 3))} ${s.heading}\n${body}`, max - used);
    picked.push(block);
    used += block.length;
  }

  return picked.join("\n\n");
}

export function readmeHeadings(md: string, max = 25): string[] {
  return splitSections(cleanMarkdown(md))
    .filter((s) => s.level >= 2 && s.level <= 3 && s.heading)
    .slice(0, max)
    .map((s) => `${"  ".repeat(s.level - 2)}- ${s.heading}`);
}
