import { useEffect, useMemo, useState } from "react";
import { fetchGitHubData } from "./lib/github";
import type { Project } from "./lib/github";
import {
  addItem,
  createFolder,
  deleteFolder,
  fetchFolders,
  fetchItems,
  fetchProfileByUsername,
  moveItem,
  removeItem,
  renameFolder,
  updateProfile,
} from "./lib/portfolio";
import type { Folder, PortfolioItem, Profile } from "./lib/portfolio";

interface UserPageProps {
  username: string;
  viewerId: string | null;
}

interface LoadedData {
  profile: Profile;
  folders: Folder[];
  items: PortfolioItem[];
  projects: Project[];
}

const UNFILED = "__unfiled__";

export default function UserPage({ username, viewerId }: UserPageProps) {
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

  return (
    <UserPageContent
      data={data}
      isOwner={isOwner}
      onChange={reload}
    />
  );
}

interface ContentProps {
  data: LoadedData;
  isOwner: boolean;
  onChange: () => void;
}

function UserPageContent({ data, isOwner, onChange }: ContentProps) {
  const { profile, folders, items, projects } = data;

  const projectByName = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) map.set(p.name, p);
    return map;
  }, [projects]);

  const itemsByFolder = useMemo(() => {
    const map = new Map<string, PortfolioItem[]>();
    map.set(UNFILED, []);
    for (const f of folders) map.set(f.id, []);
    for (const it of items) {
      const key = it.folder_id ?? UNFILED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [folders, items]);

  const usedRepos = useMemo(() => new Set(items.map((i) => i.repo_full_name)), [items]);
  const availableRepos = projects.filter((p) => !usedRepos.has(p.name));

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
    if (!window.confirm(`Delete folder "${folder.name}"? Projects inside will become unfiled.`)) return;
    await deleteFolder(folder.id);
    onChange();
  }

  async function handleAddItem(repoName: string, folderId: string | null) {
    const siblings = items.filter((i) => (i.folder_id ?? null) === folderId);
    await addItem(profile.id, repoName, folderId, siblings.length);
    onChange();
  }

  async function handleRemoveItem(item: PortfolioItem) {
    await removeItem(item.id);
    onChange();
  }

  async function handleMoveItem(item: PortfolioItem, folderId: string | null) {
    const siblings = items.filter((i) => (i.folder_id ?? null) === folderId && i.id !== item.id);
    await moveItem(item.id, folderId, siblings.length);
    onChange();
  }

  async function handleReorder(item: PortfolioItem, direction: -1 | 1) {
    const siblings = items
      .filter((i) => (i.folder_id ?? null) === (item.folder_id ?? null))
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex((s) => s.id === item.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    await Promise.all([
      moveItem(item.id, item.folder_id, other.position),
      moveItem(other.id, other.folder_id, item.position),
    ]);
    onChange();
  }

  async function handleEditBio() {
    const bio = window.prompt("Bio", profile.bio ?? "");
    if (bio === null) return;
    await updateProfile(profile.id, { bio });
    onChange();
  }

  function renderFolder(folderId: string | null, folderName: string, folder?: Folder) {
    const key = folderId ?? UNFILED;
    const folderItems = (itemsByFolder.get(key) ?? []).slice().sort((a, b) => a.position - b.position);

    return (
      <section className="user-folder" key={key}>
        <header className="user-folder__header">
          <h2>{folderName}</h2>
          {isOwner && folder ? (
            <div className="user-folder__actions">
              <button type="button" onClick={() => handleRenameFolder(folder)}>Rename</button>
              <button type="button" onClick={() => handleDeleteFolder(folder)}>Delete</button>
            </div>
          ) : null}
        </header>

        {folderItems.length === 0 ? (
          <p className="user-folder__empty">{isOwner ? "No projects yet." : "Empty."}</p>
        ) : (
          <ul className="user-item-list">
            {folderItems.map((item) => {
              const project = projectByName.get(item.repo_full_name);
              return (
                <li key={item.id} className="user-item">
                  <div className="user-item__main">
                    <h3>{project?.title ?? item.repo_full_name}</h3>
                    <p>{project?.description ?? ""}</p>
                    {project ? (
                      <a href={project.htmlUrl} target="_blank" rel="noreferrer">View on GitHub</a>
                    ) : null}
                  </div>
                  {isOwner ? (
                    <div className="user-item__actions">
                      <button type="button" onClick={() => handleReorder(item, -1)}>↑</button>
                      <button type="button" onClick={() => handleReorder(item, 1)}>↓</button>
                      <select
                        value={item.folder_id ?? ""}
                        onChange={(e) => handleMoveItem(item, e.target.value || null)}
                      >
                        <option value="">Unfiled</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleRemoveItem(item)}>Remove</button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {isOwner && availableRepos.length > 0 ? (
          <div className="user-folder__add">
            <label>
              Add project:
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddItem(e.target.value, folderId);
                    e.target.value = "";
                  }
                }}
              >
                <option value="" disabled>Choose a repo...</option>
                {availableRepos.map((p) => (
                  <option key={p.id} value={p.name}>{p.title}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </section>
    );
  }

  const sortedFolders = folders.slice().sort((a, b) => a.position - b.position);

  return (
    <main className="user-page">
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
        {isOwner ? (
          <div className="user-hero__actions">
            <button type="button" onClick={handleEditBio}>Edit bio</button>
            <button type="button" onClick={handleAddFolder}>+ New folder</button>
          </div>
        ) : null}
      </header>

      {sortedFolders.map((f) => renderFolder(f.id, f.name, f))}
      {renderFolder(null, "Unfiled")}
    </main>
  );
}
