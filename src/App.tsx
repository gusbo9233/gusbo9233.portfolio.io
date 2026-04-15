import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  fetchGitHubData,
  formatCompactNumber,
  formatDate,
} from "./lib/github";
import type { GitHubProfile, Project } from "./lib/github";

const githubUsername = import.meta.env.VITE_GITHUB_USERNAME || "gusbo9233";

interface AppState {
  status: "loading" | "ready" | "error";
  projects: Project[];
  profile: GitHubProfile | null;
  error: string;
}

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
}

function ProjectCard({ project, featured = false }: ProjectCardProps) {
  return (
    <article className={`project-card${featured ? " featured" : ""}`}>
      <div className="project-card__top">
        <div>
          <p className="project-card__eyebrow">
            {project.language || "Multi-stack"}
          </p>
          <h3>{project.title}</h3>
        </div>
        <a href={project.htmlUrl} target="_blank" rel="noreferrer">
          Source
        </a>
      </div>
      <p className="project-card__description">{project.description}</p>
      <div className="tag-list">
        {project.tags.slice(0, 4).map((tag) => (
          <span key={`${project.id}-${tag}`}>{tag}</span>
        ))}
      </div>
      <div className="project-card__meta">
        <span>{project.language || "No primary language"}</span>
        <span>{formatCompactNumber(project.stars)} stars</span>
        <span>Updated {formatDate(project.updatedAt)}</span>
      </div>
      <div className="project-card__actions">
        {project.homepage ? (
          <a href={project.homepage} target="_blank" rel="noreferrer">
            Live preview
          </a>
        ) : (
          <span className="project-card__muted">No live demo linked</span>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("All");
  const [state, setState] = useState<AppState>({
    status: "loading",
    projects: [],
    profile: null,
    error: "",
  });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      setState((current) => ({ ...current, status: "loading", error: "" }));
    });

    fetchGitHubData(githubUsername)
      .then((result) => {
        if (!isActive) {
          return;
        }

        setState({
          status: "ready",
          projects: result.projects,
          profile: result.profile,
          error: "",
        });
      })
      .catch((error: Error) => {
        if (!isActive) {
          return;
        }

        setState({
          status: "error",
          projects: [],
          profile: null,
          error: error.message,
        });
      });

    return () => {
      isActive = false;
    };
  }, []);

  const languages = ["All"];
  state.projects.forEach((project) => {
    if (project.language && !languages.includes(project.language)) {
      languages.push(project.language);
    }
  });

  const filteredProjects = state.projects.filter((project) => {
    const matchesQuery =
      !deferredQuery ||
      `${project.title} ${project.description} ${project.tags.join(" ")}`
        .toLowerCase()
        .includes(deferredQuery.toLowerCase());

    const matchesLanguage = language === "All" || project.language === language;

    return matchesQuery && matchesLanguage;
  });

  const featuredProjects = filteredProjects.slice(0, 3);
  const projectCount = filteredProjects.length;
  const totalStars = state.projects.reduce(
    (sum, project) => sum + project.stars,
    0,
  );

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function handleLanguageChange(event: ChangeEvent<HTMLSelectElement>) {
    setLanguage(event.target.value);
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" />
          <span>{githubUsername}</span>
        </div>
        <nav>
          <a href="#projects">Projects</a>
          <a href="#about">About</a>
          <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <p className="section-label">React Portfolio</p>
            <h1>
              Building a portfolio that stays in sync with your GitHub work.
            </h1>
            <p className="hero__lede">
              This site pulls public repositories from GitHub, highlights your
              strongest work, and can optionally enrich each repo with a
              lightweight <code>portfolio.yaml</code> file for better titles,
              descriptions, and tags.
            </p>
            <div className="hero__actions">
              <a href="#projects">Browse projects</a>
              <a
                className="hero__secondary"
                href={`https://github.com/${githubUsername}`}
                target="_blank"
                rel="noreferrer"
              >
                Open GitHub profile
              </a>
            </div>
          </div>

          <aside className="hero__panel">
            <p className="section-label">Live Snapshot</p>
            <div className="stat-grid">
              <div>
                <span>Repositories</span>
                <strong>{state.profile?.public_repos ?? "--"}</strong>
              </div>
              <div>
                <span>Followers</span>
                <strong>{state.profile?.followers ?? "--"}</strong>
              </div>
              <div>
                <span>Total stars</span>
                <strong>{state.status === "ready" ? formatCompactNumber(totalStars) : "--"}</strong>
              </div>
              <div>
                <span>Curated projects</span>
                <strong>{state.status === "ready" ? state.projects.length : "--"}</strong>
              </div>
            </div>
            <div className="hero__panel-footer">
              <p>{state.profile?.bio || "GitHub-powered developer portfolio."}</p>
            </div>
          </aside>
        </section>

        <section className="about" id="about">
          <div className="about__card">
            <p className="section-label">How it works</p>
            <h2>Minimal maintenance, better storytelling.</h2>
            <p>
              Repositories are fetched live from the GitHub API. If a repo
              contains a <code>portfolio.yaml</code>, this portfolio uses it to
              override the default repo title and description and to add custom
              tags.
            </p>
          </div>
          <div className="about__steps">
            <div>
              <span>01</span>
              <p>Fetch profile and repositories from GitHub.</p>
            </div>
            <div>
              <span>02</span>
              <p>Read optional metadata from each repository manifest.</p>
            </div>
            <div>
              <span>03</span>
              <p>Render a searchable gallery with live stats and links.</p>
            </div>
          </div>
        </section>

        <section className="projects" id="projects">
          <div className="projects__header">
            <div>
              <p className="section-label">Selected Work</p>
              <h2>Repository-backed projects</h2>
            </div>
            <div className="projects__controls">
              <input
                aria-label="Search projects"
                type="search"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search by title, tag, or description"
              />
              <select
                aria-label="Filter by language"
                value={language}
                onChange={handleLanguageChange}
              >
                {languages.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state.status === "loading" ? (
            <div className="status-panel">
              <p>Loading repositories from GitHub...</p>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="status-panel status-panel--error">
              <p>{state.error}</p>
              <p>
                If you hit GitHub rate limits, add a proxy or authenticated
                token-backed endpoint later.
              </p>
            </div>
          ) : null}

          {state.status === "ready" ? (
            <>
              <div className="projects__summary">
                <p>
                  Showing <strong>{projectCount}</strong> projects for{" "}
                  <strong>{githubUsername}</strong>.
                </p>
              </div>

              <div className="featured-grid">
                {featuredProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    featured={index === 0}
                  />
                ))}
              </div>

              <div className="project-grid">
                {filteredProjects.slice(3).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
