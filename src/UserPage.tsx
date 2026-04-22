import { useEffect, useMemo, useState, useTransition } from "react";
import type { Project } from "./lib/github";
import { fetchExternalRepo, formatCompactNumber, formatDate, parseRepoInput } from "./lib/github";
import { ProjectCard } from "./ProjectCard";
import {
  createFolder,
  deleteFolder,
  deleteItem,
  ensureFeaturedFolder,
  FEATURED_FOLDER_NAME,
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

  for (const baseProject of projects) {
    const item = itemByRepo.get(baseProject.name) ?? null;
    const project: Project = item
      ? {
          ...baseProject,
          title: item.title_override?.trim() || baseProject.title,
          description: item.description_override?.trim() || baseProject.description,
        }
      : baseProject;
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
  void isOwner;
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

  const featuredFolder = data.folders.find((f) => f.name === FEATURED_FOLDER_NAME);
  const featuredPlaced = featuredFolder ? buckets.get(featuredFolder.id) ?? [] : [];
  const highlights = featuredPlaced.slice(0, 6).map((p) => p.project);

  const archiveSections = sections.filter((s) => s.key !== featuredFolder?.id);

  const totalProjects = sections.reduce((sum, s) => sum + s.placed.length, 0);
  const archiveCount = archiveSections.reduce((sum, s) => sum + s.placed.length, 0);
  const displayName = data.profile.display_name || data.profile.username;

  return (
    <main className="user-page--projects tabbed-page">
      <UserTabs username={data.profile.username} active="projects" />

      <section className="gallery-head">
        <p className="blueprint blueprint--warm" style={{ marginBottom: 12 }}>Selected Works</p>
        <h1 className="display">
          {displayName}&rsquo;s <em>projects</em>.
        </h1>
        {data.profile.bio ? (
          <p className="lede" style={{ marginTop: 20 }}>{data.profile.bio}</p>
        ) : null}
      </section>

      {data.githubError ? (
        <div className="status-panel status-panel--error" role="status">
          GitHub projects are temporarily unavailable. {data.githubError}
        </div>
      ) : null}

      {totalProjects === 0 ? (
        data.githubError ? (
          <p className="user-folder__empty">Project data could not be loaded from GitHub right now.</p>
        ) : (
          <p className="user-folder__empty">No public projects yet.</p>
        )
      ) : (
        <>
          <HighlightsBento projects={highlights} />

          {archiveSections.length > 0 && (
            <>
              <div className="gallery-filters" style={{ marginTop: 48 }}>
                <p className="blueprint blueprint--muted">Archive</p>
                <p className="blueprint blueprint--muted">
                  Showing <span style={{ color: "var(--primary)" }}>{archiveCount}</span>{" "}
                  {archiveCount === 1 ? "repository" : "repositories"}
                </p>
              </div>

              {archiveSections.map((section, sIdx) => (
                <section className="section" style={{ padding: sIdx === 0 ? "0 0 40px" : "40px 0" }} key={section.key}>
                  <div className="section-head">
                    <div>
                      <p className="blueprint">Folder</p>
                      <h2 className="h2">{section.title}</h2>
                    </div>
                    <p className="blueprint blueprint--muted">
                      {section.placed.length} {section.placed.length === 1 ? "repo" : "repos"}
                    </p>
                  </div>

                  <div className="gallery" role="list">
                    {section.placed.map((p) => (
                      <div className="gallery__cell proj--narrow" role="listitem" key={p.project.id}>
                        <ProjectCard project={p.project} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}
    </main>
  );
}

function HighlightsBento({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;
  const [hero, side, ...rest] = projects;
  const smallCount = rest.length;
  const smallSpan =
    smallCount === 0 ? 0 :
    smallCount === 1 ? 12 :
    smallCount === 2 ? 6 :
    smallCount === 3 ? 4 : 3;
  const heroSpan = projects.length === 1 ? 12 : 8;

  return (
    <section className="section" style={{ padding: "0 0 40px" }}>
      <div className="section-head">
        <div>
          <p className="blueprint blueprint--warm">Highlighted</p>
          <h2 className="h2">Featured works</h2>
        </div>
        <p className="blueprint blueprint--muted">
          {projects.length} of {projects.length === 1 ? "1" : "up to 6"}
        </p>
      </div>

      <div className="highlight-bento">
        {hero && (
          <HighlightTile
            project={hero}
            variant="hero"
            style={{ gridColumn: `span ${heroSpan}` }}
          />
        )}
        {side && <HighlightTile project={side} variant="side" />}
        {rest.map((p) => (
          <HighlightTile
            key={p.id}
            project={p}
            variant="small"
            style={{ gridColumn: `span ${smallSpan}` }}
          />
        ))}
      </div>
    </section>
  );
}

function HighlightTile({
  project,
  variant,
  style,
}: {
  project: Project;
  variant: "hero" | "side" | "small";
  style?: React.CSSProperties;
}) {
  const eyebrow = project.language || project.tags[0] || "Repository";
  const titleStyle =
    variant === "hero"
      ? { fontSize: "clamp(2rem, 3.2vw, 2.8rem)", letterSpacing: "-0.04em", lineHeight: 1.02 }
      : variant === "side"
        ? { fontSize: "1.6rem", letterSpacing: "-0.04em", lineHeight: 1.1 }
        : { fontSize: "1.2rem", letterSpacing: "-0.04em" };

  return (
    <a
      className={`highlight-tile highlight-tile--${variant}`}
      href={project.htmlUrl}
      target="_blank"
      rel="noreferrer"
      style={style}
    >
      <div className="highlight-tile__body">
        <p className="proj__eyebrow">{eyebrow}</p>
        <h3 style={{ ...titleStyle, fontFamily: "var(--font-headline)", fontWeight: 700, margin: 0 }}>
          {project.title}
        </h3>
        {project.description ? (
          <p className="proj__desc" style={{ marginBottom: 0 }}>{project.description}</p>
        ) : null}
        {project.tags.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {project.tags.slice(0, variant === "small" ? 2 : 3).map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="proj__meta" style={{ borderTop: "1px solid rgba(69, 70, 82, 0.25)", marginTop: "auto" }}>
        <span className="star">
          <span className="ms ms--fill" style={{ fontSize: 14 }}>star</span>{" "}
          {formatCompactNumber(project.stars)}
        </span>
        <span>
          <span className="ms" style={{ fontSize: 14 }}>call_split</span>{" "}
          {formatCompactNumber(project.forks)}
        </span>
        <span style={{ marginLeft: "auto" }}>Updated {formatDate(project.updatedAt)}</span>
      </div>
    </a>
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

  const featuredCount = folders.filter((f) => f.name === FEATURED_FOLDER_NAME).length;
  useEffect(() => {
    if (featuredCount === 1) return;
    let cancelled = false;
    ensureFeaturedFolder(profile.id)
      .then(() => {
        if (!cancelled) onChange();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, featuredCount]);

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

  function handleAddExternalRepo() {
    const input = window.prompt(
      "GitHub repo to add (owner/name or URL):",
      "",
    );
    if (!input) return;
    const parsed = parseRepoInput(input);
    if (!parsed) {
      window.alert("Couldn't parse that — use owner/name or a github.com URL.");
      return;
    }
    const repoFullName = `${parsed.owner}/${parsed.name}`;
    const featured = folders.find((f) => f.name === FEATURED_FOLDER_NAME);
    run(async () => {
      const project = await fetchExternalRepo(parsed.owner, parsed.name);
      if (!project) {
        window.alert(`Couldn't load ${repoFullName} from GitHub. Is it public?`);
        return;
      }
      await upsertItem(profile.id, repoFullName, {
        folder_id: featured?.id ?? null,
        hidden: false,
        position: 0,
      });
    });
  }

  function handleEditDetails(placed: PlacedProject) {
    const repoFullName = placed.item?.repo_full_name ?? placed.project.name;
    const nextTitle = window.prompt(
      "Project title (leave blank to use the GitHub repo title)",
      placed.item?.title_override ?? placed.project.title,
    );
    if (nextTitle === null) return;
    const nextDescription = window.prompt(
      "Project description (leave blank to use the GitHub description)",
      placed.item?.description_override ?? placed.project.description,
    );
    if (nextDescription === null) return;
    run(() =>
      upsertItem(profile.id, repoFullName, {
        folder_id: placed.item?.folder_id ?? null,
        hidden: placed.item?.hidden ?? false,
        position: placed.item?.position ?? 0,
        title_override: nextTitle.trim() ? nextTitle.trim() : null,
        description_override: nextDescription.trim() ? nextDescription.trim() : null,
      }).then(() => {}),
    );
  }

  function handleRemoveItem(placed: PlacedProject) {
    if (!window.confirm(`Remove "${placed.project.title}" from your portfolio?`)) return;
    const repoFullName = placed.item?.repo_full_name ?? placed.project.name;
    run(() => deleteItem(profile.id, repoFullName));
  }

  const isExternal = (placed: PlacedProject) =>
    (placed.item?.repo_full_name ?? placed.project.name).includes("/");

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
                  <h3>
                    {p.project.title}
                    {isExternal(p) ? (
                      <span
                        className="chip"
                        style={{ marginLeft: 8, verticalAlign: "middle" }}
                      >
                        External
                      </span>
                    ) : null}
                    {p.item?.title_override || p.item?.description_override ? (
                      <span
                        className="chip chip--ghost"
                        style={{ marginLeft: 8, verticalAlign: "middle" }}
                      >
                        Edited
                      </span>
                    ) : null}
                  </h3>
                  <p>{p.project.description}</p>
                  <a href={p.project.htmlUrl} target="_blank" rel="noreferrer">View on GitHub</a>
                </div>
                <div className="user-item__actions">
                  <button type="button" onClick={() => handleReorder(p, -1)}>↑</button>
                  <button type="button" onClick={() => handleReorder(p, 1)}>↓</button>
                  <button type="button" onClick={() => handleEditDetails(p)}>Edit details</button>
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
                  {isExternal(p) ? (
                    <button type="button" onClick={() => handleRemoveItem(p)}>Remove</button>
                  ) : null}
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
          <button type="button" onClick={handleAddExternalRepo}>+ Add external repo</button>
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
