export interface RepoRef {
  owner: string;
  repo: string;
}

export interface ParsedRepo extends RepoRef {
  ref?: string;
  path?: string;
}

const NAME = /^[A-Za-z0-9_.-]+$/;

// Accepts "owner/repo", "github.com/owner/repo", full URLs (including
// /tree/<branch>/<path> and /blob/... links) and git@github.com:owner/repo.git
export function parseRepo(input: string): ParsedRepo {
  let s = input.trim();

  s = s.replace(/^git@github\.com:/i, "");
  s = s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");
  s = s.replace(/[?#].*$/, "").replace(/\/+$/, "");

  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Could not read a repository from "${input}". Use owner/name or a github.com URL.`);
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!NAME.test(owner) || !NAME.test(repo)) {
    throw new Error(`"${owner}/${repo}" is not a valid GitHub repository name.`);
  }

  const result: ParsedRepo = { owner, repo };

  // links like /tree/main/src or /blob/main/src/index.ts
  // note: branch names with slashes can't be told apart from paths here
  if ((parts[2] === "tree" || parts[2] === "blob") && parts[3]) {
    result.ref = decodeURIComponent(parts[3]);
    if (parts.length > 4) result.path = parts.slice(4).map(decodeURIComponent).join("/");
  }

  return result;
}
