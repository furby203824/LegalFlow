"use client";

// =============================================================================
// GitHub Contents API Client
// Per LegalFlow JSON Data Structure v1.0, Section 6.1
// =============================================================================

interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

const SHA_CACHE = new Map<string, string>();

let config: GitHubConfig | null = null;

// Build-time environment variables (injected from GitHub repo secrets)
const ENV_CONFIG: GitHubConfig | null =
  process.env.NEXT_PUBLIC_GH_OWNER &&
  process.env.NEXT_PUBLIC_GH_REPO &&
  process.env.NEXT_PUBLIC_GH_TOKEN
    ? {
        owner: process.env.NEXT_PUBLIC_GH_OWNER,
        repo: process.env.NEXT_PUBLIC_GH_REPO,
        branch: process.env.NEXT_PUBLIC_GH_BRANCH || "main",
        token: process.env.NEXT_PUBLIC_GH_TOKEN,
      }
    : null;

export function isEnvConfigured(): boolean {
  return !!ENV_CONFIG;
}

export function getGitHubConfig(): GitHubConfig | null {
  if (config) return config;
  // Prefer build-time env config
  if (ENV_CONFIG) {
    config = ENV_CONFIG;
    return config;
  }
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("legalflow_github");
  if (!stored) return null;
  config = JSON.parse(stored);
  return config;
}

export function setGitHubConfig(c: GitHubConfig) {
  config = c;
  localStorage.setItem("legalflow_github", JSON.stringify(c));
}

export function clearGitHubConfig() {
  config = null;
  SHA_CACHE.clear();
  localStorage.removeItem("legalflow_github");
}

export function isGitHubConfigured(): boolean {
  return !!getGitHubConfig();
}

function apiUrl(path: string): string {
  const c = getGitHubConfig()!;
  return `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`;
}

function headers(): Record<string, string> {
  const c = getGitHubConfig()!;
  return {
    Authorization: `Bearer ${c.token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

// Read a JSON file from the repo
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const c = getGitHubConfig();
  if (!c) throw new Error("GitHub not configured");

  const url = `${apiUrl(filePath)}?ref=${c.branch}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });

  if (!res.ok) {
    if (res.status === 404) {
      // File doesn't exist yet - return empty array
      return [] as unknown as T;
    }
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  SHA_CACHE.set(filePath, data.sha);
  const content = atob(data.content.replace(/\n/g, ""));
  return JSON.parse(content);
}

// Write a JSON file to the repo
export async function writeJsonFile<T>(
  filePath: string,
  content: T,
  message?: string
): Promise<void> {
  const c = getGitHubConfig();
  if (!c) throw new Error("GitHub not configured");

  // Get current SHA if we don't have it
  if (!SHA_CACHE.has(filePath)) {
    try {
      await readJsonFile(filePath);
    } catch {
      // File may not exist - that's ok for creation
    }
  }

  const sha = SHA_CACHE.get(filePath);
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));

  const commitMessage = message ||
    `LegalFlow: update ${filePath.split("/").pop()} ${new Date().toISOString()}`;

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: encoded,
    branch: c.branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl(filePath), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 409) {
      // Stale SHA - retry with fresh SHA
      SHA_CACHE.delete(filePath);
      await readJsonFile(filePath);
      return writeJsonFile(filePath, content, message);
    }
    const err = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`GitHub write failed: ${err.message}`);
  }

  const result = await res.json();
  SHA_CACHE.set(filePath, result.content.sha);
}
