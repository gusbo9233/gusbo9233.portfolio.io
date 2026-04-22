import { fetchCvByUserId } from "./cv";
import type { Cv } from "./cv";
import { fetchExternalRepo, fetchGitHubData } from "./github";
import type { Project } from "./github";
import {
  fetchFolders,
  fetchItems,
  fetchProfileByUsername,
} from "./portfolio";
import type { Folder, PortfolioItem, Profile } from "./portfolio";

export interface UserPageData {
  profile: Profile;
  folders: Folder[];
  items: PortfolioItem[];
  projects: Project[];
  githubError: string | null;
}

export interface CvPageData {
  profile: Profile;
  cv: Cv | null;
}

interface CacheEntry<T> {
  data?: T | null;
  promise?: Promise<T | null>;
}

const userPageCache = new Map<string, CacheEntry<UserPageData>>();
const cvPageCache = new Map<string, CacheEntry<CvPageData>>();

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null | undefined {
  return cache.get(key)?.data;
}

function invalidateCache<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  cache.delete(key);
}

async function withCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  loader: () => Promise<T | null>,
  force = false,
): Promise<T | null> {
  const existing = cache.get(key);
  if (!force && existing?.data !== undefined) {
    return existing.data;
  }
  if (!force && existing?.promise) {
    return existing.promise;
  }

  const entry: CacheEntry<T> = force ? {} : { data: existing?.data };
  const promise = loader()
    .then((data) => {
      entry.data = data;
      return data;
    })
    .finally(() => {
      entry.promise = undefined;
    });

  entry.promise = promise;
  cache.set(key, entry);

  return promise;
}

async function loadUserPage(username: string): Promise<UserPageData | null> {
  const profile = await fetchProfileByUsername(username);
  if (!profile) return null;

  const [folders, items] = await Promise.all([
    fetchFolders(profile.id),
    fetchItems(profile.id),
  ]);

  let ownedProjects: Project[] = [];
  let githubError: string | null = null;

  if (profile.github_username) {
    try {
      const githubData = await fetchGitHubData(profile.github_username);
      ownedProjects = githubData.projects;
    } catch (error) {
      githubError = (error as Error).message || "Unable to load GitHub profile data right now.";
    }
  }

  const ownedNames = new Set(ownedProjects.map((p) => p.name));
  const externalNames = Array.from(
    new Set(
      items
        .map((it) => it.repo_full_name)
        .filter((n) => n.includes("/") && !ownedNames.has(n)),
    ),
  );

  const externalResults = await Promise.all(
    externalNames.map(async (full) => {
      const [owner, name] = full.split("/", 2);
      try {
        return await fetchExternalRepo(owner, name);
      } catch {
        return null;
      }
    }),
  );
  const externalProjects = externalResults.filter((p): p is Project => p !== null);

  const projects = [...ownedProjects, ...externalProjects];

  return { profile, folders, items, projects, githubError };
}

async function loadCvPage(username: string): Promise<CvPageData | null> {
  const profile = await fetchProfileByUsername(username);
  if (!profile) return null;

  const cv = await fetchCvByUserId(profile.id);
  return { profile, cv };
}

export function getCachedUserPageData(username: string) {
  return readCache(userPageCache, username);
}

export function getCachedCvPageData(username: string) {
  return readCache(cvPageCache, username);
}

export function loadUserPageData(username: string, options?: { force?: boolean }) {
  return withCache(userPageCache, username, () => loadUserPage(username), options?.force);
}

export function loadCvPageData(username: string, options?: { force?: boolean }) {
  return withCache(cvPageCache, username, () => loadCvPage(username), options?.force);
}

export function prefetchUserPageData(username: string) {
  void loadUserPageData(username).catch(() => undefined);
}

export function prefetchCvPageData(username: string) {
  void loadCvPageData(username).catch(() => undefined);
}

export function invalidateUserPageData(username: string) {
  invalidateCache(userPageCache, username);
}

export function invalidateCvPageData(username: string) {
  invalidateCache(cvPageCache, username);
}
