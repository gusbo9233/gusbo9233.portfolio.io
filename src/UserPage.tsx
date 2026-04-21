import { useEffect, useState } from "react";
import { fetchGitHubData } from "./lib/github";
import type { Project } from "./lib/github";
import { ProjectCard } from "./ProjectCard";
import {
  createFolder,
  deleteFolder,
  fetchFolders,
  fetchItems,
  fetchProfileByUsername,
  renameFolder,
  updateProfile,
  upsertItem,
} from "./lib/portfolio";
import type { Folder, PortfolioItem, Profile } from "./lib/portfolio";

interface UserPageProps {
  username: string;
  viewerId: string | null;
  mode?: "reader" | "edit";
}

interface LoadedData {
  profile: Profile;
  folders: Folder[];
  items: PortfolioItem[];
  projects: Project[];
}

const UNFILED = "__unfiled__";
const HIDDEN = "__hidden__";

interface PlacedProject {
  project: Project;
  item: PortfolioItem | null;
}

export default function UserPage({ username, viewerId, mode = "reader" }: UserPageProps) {
  const [data, setData] = useState<LoadedData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "not_found">("loading");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");

    (async () => {
      try {
        const profile = await fetchProfileByUsername(username);
        if (!profile) {
          if (active) setStatus("not_found");
          return;
        }
        const [folders, items, gh] = await Promise.all([
          fetchFolders(profile.id),
          fetchItems(profile.id),
          profile.github_username
            ? fetchGitHubData(profile.github_username).catch(() => ({ projects: [] as Project[], profile: null }))
            : Promise.resolve({ projects: [] as Project[], profile: null }),
        ]);
        if (!active) return;
        setData({ profile, folders, items, projects: gh.projects });
        setStatus("ready");
      } catch (err) {
        if (!active) return;
        setError((err as Error).message);
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [username, version]);

  const reload = () => setVersion((v) => v + 1);

  if (status === "loading") {
    return <main className="user-page"><p>Loading...</p></main>;
  }
  if (status === "not_found") {
    return <main className="user-page"><p>No user "{username}" found.</p></main>;
  }
  if (status === "error" || !data) {
    return <main className="user-page"><p>Error: {error}</p></main>;
  }

  const isOwner = viewerId === data.profile.id;
  const buckets = buildBuckets(data);

  if (mode === "edit" && isOwner) {
    return <OwnerView data={data} buckets={buckets} onChange={reload} />;
  }
  return <ReaderView data={data} buckets={buckets} isOwner={isOwner} />;
}

function buildBuckets({ folders, projects, items }: LoadedData): Map<string, PlacedProject[]> {
  const itemByRepo = new Map<string, PortfolioItem>();
  for (const it of items) itemByRepo.set(it.repo_full_name, it);

  const map = new Map<string, PlacedProject[]>();
  map.set(UNFILED, []);
  map.set(HIDDEN, []);
  for (const f of folders) map.set(f.id, []);

  for (const project of projects) {
    const item = itemByRepo.get(project.name) ?? null;
    const key = item?.hidden
      ? HIDDEN
      : item?.folder_id && map.has(item.folder_id)
        ? item.folder_id
        : UNFILED;
    map.get(key)!.push({ project, item });
  }
  for (const [, list] of map) {
    list.sort((a, b) => {
      const ap = a.item?.position ?? Number.MAX_SAFE_INTEGER;
      const bp = b.item?.position ?? Number.MAX_SAFE_INTEGER;
      return ap - bp;
    });
  }
  return map;
}

function ProfileHero({ profile }: { profile: Profile }) {
  return (
    <header className="user-hero">
      <div>
        <p className="section-label">Portfolio</p>
        <h1>{profile.display_name || profile.username}</h1>
        <p className="user-hero__username">@{profile.username}</p>
        {profile.bio ? <p>{profile.bio}</p> : null}
        {profile.github_username ? (
          <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noreferrer">
            github.com/{profile.github_username}
          </a>
        ) : null}
      </div>
    </header>
  );
}

function ReaderView({ data, buckets, isOwner }: { data: LoadedData; buckets: Map<string, PlacedProject[]>; isOwner: boolean }) {
  const sortedFolders = data.folders.slice().sort((a, b) => a.position - b.position);

  const sections: { title: string; placed: PlacedProject[]; isFirst: boolean }[] = [];
  sortedFolders.forEach((f, idx) => {
    const list = buckets.get(f.id) ?? [];
    if (list.length > 0) sections.push({ title: f.name, placed: list, isFirst: idx === 0 });
  });
  const unfiled = buckets.get(UNFILED) ?? [];
  if (unfiled.length > 0) {
    sections.push({ title: sections.length === 0 ? "Projects" : "Other projects", placed: unfiled, isFirst: sections.length === 0 });
  }

  return (
    <main className="user-page">
      <ProfileHero profile={data.profile} />
      {isOwner ? (
        <div className="user-hero__actions">
          <a className="auth-button" href={`#u/${data.profile.username}/edit`}>Edit page</a>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <p className="user-folder__empty">No public projects yet.</p>
      ) : (
        sections.map((section) => (
          <section className="projects" key={section.title}>
            <div className="projects__header">
              <div>
                <p className="section-label">{section.isFirst ? "Selected Work" : "Projects"}</p>
                <h2>{section.title}</h2>
              </div>
            </div>
            {section.isFirst && section.placed.length > 0 ? (
              <div className="featured-grid">
                {section.placed.slice(0, 3).map((p, i) => (
                  <ProjectCard key={p.project.id} project={p.project} featured={i === 0} />
                ))}
              </div>
            ) : null}
            <div className="project-grid">
              {(section.isFirst ? section.placed.slice(3) : section.placed).map((p) => (
                <ProjectCard key={p.project.id} project={p.project} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}

function OwnerView({
  data,
  buckets,
  onChange,
}: {
  data: LoadedData;
  buckets: Map<string, PlacedProject[]>;
  onChange: () => void;
}) {
  const { profile, folders } = data;

  async function handleAddFolder() {
    const name = window.prompt("Folder name?");
    if (!name) return;
    await createFolder(profile.id, name.trim(), folders.length);
    onChange();
  }

  async function handleRenameFolder(folder: Folder) {
    const name = window.prompt("New folder name", folder.name);
    if (!name || name.trim() === folder.name) return;
    await renameFolder(folder.id, name.trim());
    onChange();
  }

  async function handleDeleteFolder(folder: Folder) {
    if (!window.confirm(`Delete folder "${folder.name}"? Projects inside become unfiled.`)) return;
    await deleteFolder(folder.id);
    onChange();
  }

  async function handleSetFolder(placed: PlacedProject, folderId: string | null) {
    await upsertItem(profile.id, placed.project.name, {
      folder_id: folderId,
      hidden: false,
      position: placed.item?.position ?? 0,
    });
    onChange();
  }

  async function handleToggleHidden(placed: PlacedProject) {
    const nextHidden = !(placed.item?.hidden ?? false);
    await upsertItem(profile.id, placed.project.name, {
      hidden: nextHidden,
      folder_id: placed.item?.folder_id ?? null,
      position: placed.item?.position ?? 0,
    });
    onChange();
  }

  async function handleReorder(placed: PlacedProject, direction: -1 | 1) {
    const folderKey = placed.item?.hidden
      ? HIDDEN
      : placed.item?.folder_id ?? UNFILED;
    const siblings = buckets.get(folderKey) ?? [];
    const idx = siblings.findIndex((s) => s.project.name === placed.project.name);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    await Promise.all([
      upsertItem(profile.id, placed.project.name, {
        folder_id: placed.item?.folder_id ?? null,
        hidden: placed.item?.hidden ?? false,
        position: swapIdx,
      }),
      upsertItem(profile.id, other.project.name, {
        folder_id: other.item?.folder_id ?? null,
        hidden: other.item?.hidden ?? false,
        position: idx,
      }),
    ]);
    onChange();
  }

  async function handleEditBio() {
    const bio = window.prompt("Bio", profile.bio ?? "");
    if (bio === null) return;
    await updateProfile(profile.id, { bio });
    onChange();
  }

  function renderBucket(key: string, title: string, folder?: Folder, isHidden = false) {
    const placed = buckets.get(key) ?? [];
    return (
      <section className={`user-folder${isHidden ? " user-folder--hidden" : ""}`} key={key}>
        <header className="user-folder__header">
          <h2>{title}</h2>
          {folder ? (
            <div className="user-folder__actions">
              <button type="button" onClick={() => handleRenameFolder(folder)}>Rename</button>
              <button type="button" onClick={() => handleDeleteFolder(folder)}>Delete</button>
            </div>
          ) : null}
        </header>
        {placed.length === 0 ? (
          <p className="user-folder__empty">Empty.</p>
        ) : (
          <ul className="user-item-list">
            {placed.map((p) => (
              <li key={p.project.id} className="user-item">
                <div className="user-item__main">
                  <h3>{p.project.title}</h3>
                  <p>{p.project.description}</p>
                  <a href={p.project.htmlUrl} target="_blank" rel="noreferrer">View on GitHub</a>
                </div>
                <div className="user-item__actions">
                  <button type="button" onClick={() => handleReorder(p, -1)}>↑</button>
                  <button type="button" onClick={() => handleReorder(p, 1)}>↓</button>
                  <select
                    value={p.item?.folder_id ?? ""}
                    onChange={(e) => handleSetFolder(p, e.target.value || null)}
                    disabled={p.item?.hidden}
                  >
                    <option value="">Unfiled</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleToggleHidden(p)}>
                    {p.item?.hidden ? "Show" : "Hide"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const sortedFolders = folders.slice().sort((a, b) => a.position - b.position);

  return (
    <main className="user-page">
      <header className="user-hero">
        <div>
          <p className="section-label">Portfolio (editing)</p>
          <h1>{profile.display_name || profile.username}</h1>
          <p className="user-hero__username">@{profile.username}</p>
          {profile.bio ? <p>{profile.bio}</p> : null}
          {profile.github_username ? (
            <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noreferrer">
              github.com/{profile.github_username}
            </a>
          ) : null}
        </div>
        <div className="user-hero__actions">
          <button type="button" onClick={handleEditBio}>Edit bio</button>
          <button type="button" onClick={handleAddFolder}>+ New folder</button>
          <a href={`#u/${profile.username}?preview=1`} onClick={(e) => {
            e.preventDefault();
            window.location.hash = `#u/${profile.username}`;
            window.location.reload();
          }}>Preview as visitor</a>
        </div>
      </header>

      {sortedFolders.map((f) => renderBucket(f.id, f.name, f))}
      {renderBucket(UNFILED, "Unfiled")}
      {renderBucket(HIDDEN, "Hidden (only visible to you)", undefined, true)}
    </main>
  );
}
