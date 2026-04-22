import YAML from "yaml";

export interface GitHubProfile {
  bio: string | null;
  followers: number;
  public_repos: number;
}

interface GitHubOwner {
  login: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  homepage: string | null;
  html_url: string;
  topics?: string[];
  archived: boolean;
  fork: boolean;
  default_branch: string;
  owner: GitHubOwner;
}

interface PortfolioManifest {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface Project {
  id: number;
  name: string;
  title: string;
  description: string;
  tags: string[];
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  homepage: string | null;
  htmlUrl: string;
  topics: string[];
  archived: boolean;
}

export interface GitHubData {
  profile: GitHubProfile;
  projects: Project[];
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value || 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function titleFromName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function fetchPortfolioManifest(repo: GitHubRepo): Promise<PortfolioManifest | null> {
  const manifestUrl = `https://raw.githubusercontent.com/${repo.owner.login}/${repo.name}/${repo.default_branch}/portfolio.yaml`;

  try {
    const response = await fetch(manifestUrl);

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    const parsed = YAML.parse(text) as PortfolioManifest | null;

    return {
      title: parsed?.title,
      description: parsed?.description,
      tags: Array.isArray(parsed?.tags) ? parsed.tags : [],
    };
  } catch {
    return null;
  }
}

function normalizeProject(repo: GitHubRepo, manifest: PortfolioManifest | null): Project {
  return {
    id: repo.id,
    name: repo.name,
    title: manifest?.title || titleFromName(repo.name),
    description:
      manifest?.description ||
      repo.description ||
      "A live GitHub repository with more details available in the source.",
    tags: manifest?.tags?.length ? manifest.tags : [repo.language, "GitHub"].filter(Boolean) as string[],
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: repo.updated_at,
    homepage: repo.homepage,
    htmlUrl: repo.html_url,
    topics: repo.topics || [],
    archived: repo.archived,
  };
}

export function parseRepoInput(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
  if (urlMatch) return { owner: urlMatch[1], name: urlMatch[2] };
  const plainMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (plainMatch) return { owner: plainMatch[1], name: plainMatch[2] };
  return null;
}

export async function fetchExternalRepo(owner: string, name: string): Promise<Project | null> {
  const headers = { Accept: "application/vnd.github+json" };
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers });
  if (!response.ok) return null;
  const repo = (await response.json()) as GitHubRepo;
  const manifest = await fetchPortfolioManifest(repo);
  const project = normalizeProject(repo, manifest);
  return { ...project, name: `${repo.owner.login}/${repo.name}` };
}

export async function fetchGitHubData(username: string): Promise<GitHubData> {
  const headers = {
    Accept: "application/vnd.github+json",
  };

  const [profileResponse, reposResponse] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers }),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers }),
  ]);

  if (!profileResponse.ok || !reposResponse.ok) {
    throw new Error("Unable to load GitHub profile data right now.");
  }

  const profile = (await profileResponse.json()) as GitHubProfile;
  const repos = (await reposResponse.json()) as GitHubRepo[];
  const ownedRepos = repos
    .filter((repo) => !repo.fork)
    .sort((left, right) => {
      if (right.stargazers_count !== left.stargazers_count) {
        return right.stargazers_count - left.stargazers_count;
      }

      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });

  const manifests = await Promise.all(
    ownedRepos.map((repo) => fetchPortfolioManifest(repo)),
  );

  const projects = ownedRepos.map((repo, index) =>
    normalizeProject(repo, manifests[index]),
  );

  return { profile, projects };
}
