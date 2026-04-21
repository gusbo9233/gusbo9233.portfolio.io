import { useEffect, useMemo, useState, useTransition } from "react";
import type { Project } from "./lib/github";
import { ProjectCard } from "./ProjectCard";
import {
  createFolder,
  deleteFolder,
  setFolderPosition,
  renameFolder,
  updateProfile,
  upsertItem,
} from "./lib/portfolio";
import type { Folder, PortfolioItem, Profile } from "./lib/portfolio";
import {
  getCachedUserPageData,
  invalidateUserPageData,
  loadUserPageData,
  prefetchCvPageData,
} from "./lib/pageData";
import UserTabs from "./UserTabs";

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
  githubError: string | null;
}

const UNFILED = "__unfiled__";
const HIDDEN = "__hidden__";

interface PlacedProject {
  project: Project;
  item: PortfolioItem | null;
}

export default function UserPage({ username, viewerId, mode = "reader" }: UserPageProps) {
  const [data, setData] = useState<LoadedData | null>(() => getCachedUserPageData(username) ?? null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "not_found">(() =>
    getCachedUserPageData(username) ? "ready" : "loading",
  );
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const cached = getCachedUserPageData(username);
    if (cached) {
      setData(cached);
      setStatus("ready");
    } else {
      setStatus("loading");
    }

    (async () => {
      try {
        const nextData = await loadUserPageData(username, { force: version > 0 });
        if (!nextData) {
          if (active) setStatus("not_found");
          return;
        }
        if (!active) return;
        setData(nextData);
        setStatus("ready");
        prefetchCvPageData(username);
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

  const reload = () => {
    invalidateUserPageData(username);
    setVersion((v) => v + 1);
  };

  const buckets = useMemo(() => (data ? buildBuckets(data) : null), [data]);

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

  if (mode === "edit" && isOwner) {
    return <OwnerView data={data} buckets={buckets!} onChange={reload} />;
  }
  return <ReaderView data={data} buckets={buckets!} isOwner={isOwner} />;
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

function ReaderView({ data, buckets, isOwner }: { data: LoadedData; buckets: Map<string, PlacedProject[]>; isOwner: boolean }) {
  const sortedFolders = data.folders.slice().sort((a, b) => a.position - b.position);

  const sections: { key: string; title: string; placed: PlacedProject[] }[] = [];
  sortedFolders.forEach((f) => {
    const list = buckets.get(f.id) ?? [];
    if (list.length > 0) sections.push({ key: f.id, title: f.name, placed: list });
  });
  const unfiled = buckets.get(UNFILED) ?? [];
  if (unfiled.length > 0) {
    sections.push({ key: UNFILED, title: sections.length === 0 ? "Projects" : "Other projects", placed: unfiled });
  }

  return (
    <main className="user-page user-page--projects tabbed-page">
      <UserTabs username={data.profile.username} active="projects" />

      {data.githubError ? (
        <div className="status-panel status-panel--error" role="status">
          GitHub projects are temporarily unavailable. {data.githubError}
        </div>
      ) : null}

      {sections.length === 0 ? (
        data.githubError ? (
          <p className="user-folder__empty">Project data could not be loaded from GitHub right now.</p>
        ) : (
        <p className="user-folder__empty">No public projects yet.</p>
        )
      ) : (
        sections.map((section) => (
          <section className="projects" key={section.key}>
            <div className="projects__header">
              <div>
                <p className="section-label">Projects</p>
                <h2>{section.title}</h2>
              </div>
            </div>
            <div className="scroll-row" role="list">
              {section.placed.map((p) => (
                <div className="scroll-row__item" role="listitem" key={p.project.id}>
                  <ProjectCard project={p.project} />
                </div>
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
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      onChange();
    });

  function handleAddFolder() {
    const name = window.prompt("Folder name?");
    if (!name) return;
    run(() => createFolder(profile.id, name.trim(), folders.length).then(() => {}));
  }

  function handleRenameFolder(folder: Folder) {
    const name = window.prompt("New folder name", folder.name);
    if (!name || name.trim() === folder.name) return;
    run(() => renameFolder(folder.id, name.trim()));
  }

  function handleDeleteFolder(folder: Folder) {
    if (!window.confirm(`Delete folder "${folder.name}"? Projects inside become unfiled.`)) return;
    run(() => deleteFolder(folder.id));
  }

  function handleMoveFolder(folder: Folder, direction: -1 | 1) {
    const ordered = folders.slice().sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((f) => f.id === folder.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= ordered.length) return;
    const other = ordered[swapIdx];
    run(async () => {
      await Promise.all([
        setFolderPosition(folder.id, swapIdx),
        setFolderPosition(other.id, idx),
      ]);
    });
  }

  function handleSetFolder(placed: PlacedProject, folderId: string | null) {
    run(() =>
      upsertItem(profile.id, placed.project.name, {
        folder_id: folderId,
        hidden: placed.item?.hidden ?? false,
        position: placed.item?.position ?? 0,
      }).then(() => {}),
    );
  }

  function handleToggleHidden(placed: PlacedProject) {
    const nextHidden = !(placed.item?.hidden ?? false);
    run(() =>
      upsertItem(profile.id, placed.project.name, {
        hidden: nextHidden,
        folder_id: placed.item?.folder_id ?? null,
        position: placed.item?.position ?? 0,
      }).then(() => {}),
    );
  }

  function handleReorder(placed: PlacedProject, direction: -1 | 1) {
    const folderKey = placed.item?.hidden
      ? HIDDEN
      : placed.item?.folder_id ?? UNFILED;
    const siblings = buckets.get(folderKey) ?? [];
    const idx = siblings.findIndex((s) => s.project.name === placed.project.name);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    run(async () => {
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
    });
  }

  function handleEditBio() {
    const bio = window.prompt("Bio", profile.bio ?? "");
    if (bio === null) return;
    run(() => updateProfile(profile.id, { bio }));
  }

  function renderBucket(key: string, title: string, folder?: Folder, isHidden = false) {
    const placed = buckets.get(key) ?? [];
    return (
      <section className={`user-folder${isHidden ? " user-folder--hidden" : ""}`} key={key}>
        <header className="user-folder__header">
          <h2>{title}</h2>
          {folder ? (
            <div className="user-folder__actions">
              <button type="button" onClick={() => handleMoveFolder(folder, -1)}>↑</button>
              <button type="button" onClick={() => handleMoveFolder(folder, 1)}>↓</button>
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
    <main className="user-page user-page--projects" aria-busy={isPending}>
      <div className="user-page__toolbar">
        <p className="section-label">Projects{isPending ? " — saving…" : ""}</p>
        <div className="user-hero__actions">
          <button type="button" onClick={handleEditBio}>Edit bio</button>
          <button type="button" onClick={handleAddFolder}>+ New folder</button>
          <a href={`#u/${profile.username}`}>Preview as visitor</a>
        </div>
      </div>
      <UserTabs username={profile.username} active="projects" />

      {data.githubError ? (
        <div className="status-panel status-panel--error" role="status">
          GitHub projects are temporarily unavailable. {data.githubError}
        </div>
      ) : null}

      {sortedFolders.map((f) => renderBucket(f.id, f.name, f))}
      {renderBucket(UNFILED, "Unfiled")}
      {renderBucket(HIDDEN, "Hidden (only visible to you)", undefined, true)}
    </main>
  );
}
