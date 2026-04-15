import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  fetchGitHubData,
  formatCompactNumber,
  formatDate,
} from "./lib/github";
import type { GitHubProfile, Project } from "./lib/github";

const githubUsername = import.meta.env.VITE_GITHUB_USERNAME || "gusbo9233";
const emailAddress = "gusbo923@gmail.com";

type Page = "home" | "cv";

const skills = [
  "React",
  "TypeScript",
  "Vite",
  "API integrations",
  "Responsive UI",
  "GitHub workflows",
];

const focusAreas = [
  {
    title: "Frontend Craft",
    description:
      "I like turning ideas into fast, focused interfaces with React, TypeScript, and thoughtful interaction details.",
  },
  {
    title: "Practical Builds",
    description:
      "My projects lean toward useful tools, clean deployment flows, and code that is easy to revisit later.",
  },
  {
    title: "Always Learning",
    description:
      "This portfolio updates from GitHub because I want the page to grow naturally with the things I am building.",
  },
];

const cvHighlights = [
  "Co-developed an award-winning inventory warehouse program for an industrial machinery company.",
  "Managed application work across the full lifecycle, from development to deployment and maintenance.",
  "Worked in international teams across Sweden, Poland, India, and Brazil.",
];

const cvExperience = [
  {
    company: "Concentrix",
    location: "Warszawa, Poland",
    period: "Jun 2025-Dec 2025",
    role: "Technical Customer Support",
    context:
      "2,000+ customers across major sectors, including Fortune Global 500 brands.",
    points: [
      "Supported a Swedish telecom company, Allente, across 75-150 customer calls per week.",
      "Handled customer-facing troubleshooting in a high-volume technical support environment.",
    ],
  },
  {
    company: "Infor",
    location: "Linkoping",
    period: "Sep 2023-Feb 2024",
    role: "Software Developer",
    context:
      "Global business cloud software provider with 60,000+ customers worldwide.",
    points: [
      "Debugged and developed the sales part of the M3 ERP system.",
      "Used Java and SQL to fix issues and implement new features.",
    ],
  },
  {
    company: "Norditech",
    location: "Jonkoping",
    period: "Sep 2021-May 2022",
    role: "Software Developer",
    context:
      "AI, machine learning, process optimization, and data analysis consultancy.",
    points: [
      "Co-developed an awarded inventory warehouse program using camera-based label recognition.",
      "Wrote Python scripts for machine vision projects using OpenCV and ROS.",
    ],
  },
  {
    company: "Tetra Pak",
    location: "Lund",
    period: "2019-2022",
    role: "IT Worker",
    context:
      "Global market leader in aseptic packaging with 24,000 employees worldwide.",
    points: [
      "Worked with Agile methods, Azure, PowerShell, Adobe Experience Manager, SAP Hybris, and Photoshop.",
      "Migrated website content, maintained product information, and supported global communication teams.",
      "Built automation for image processing and streamlined SAP customer data cleanup workflows.",
    ],
  },
];

const cvEducation = [
  {
    degree: "BSc in Computer Science",
    school: "Linkoping University",
    period: "2017-2025",
    detail:
      'Student thesis: "Interactive Visualisation of Medical Patient Data" for Karolinska Institute.',
  },
  {
    degree: "BSc in Economics",
    school: "Linkoping University",
    period: "2022-2025",
  },
];

function getPageFromHash(): Page {
  return window.location.hash === "#cv" ? "cv" : "home";
}

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

function CvPage() {
  return (
    <main className="cv-page">
      <section className="cv-hero">
        <div>
          <p className="section-label">Curriculum Vitae</p>
          <h1>Gustav Boberg</h1>
          <p>
            Software developer with experience across product development,
            support, automation, ERP systems, machine vision, and web content
            platforms.
          </p>
        </div>
        <aside className="cv-contact">
          <a href={`mailto:${emailAddress}`}>{emailAddress}</a>
          <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer">
            github.com/{githubUsername}
          </a>
          <a href="https://linkedin.com/in/gustav-boberg" target="_blank" rel="noreferrer">
            linkedin.com/in/gustav-boberg
          </a>
          <span>Lund, Sweden</span>
        </aside>
      </section>

      <section className="cv-section cv-summary">
        <div>
          <p className="section-label">Snapshot</p>
          <h2>Experience that connects software, operations, and users.</h2>
        </div>
        <div className="cv-highlight-list">
          {cvHighlights.map((highlight) => (
            <p key={highlight}>{highlight}</p>
          ))}
        </div>
      </section>

      <section className="cv-section">
        <div className="cv-section__header">
          <p className="section-label">Experience</p>
          <h2>AI/IT Projects</h2>
        </div>
        <div className="timeline">
          {cvExperience.map((job) => (
            <article className="timeline-item" key={`${job.company}-${job.period}`}>
              <div className="timeline-item__meta">
                <span>{job.period}</span>
                <strong>{job.location}</strong>
              </div>
              <div className="timeline-item__body">
                <h3>{job.company}</h3>
                <p className="timeline-item__role">{job.role}</p>
                <p>{job.context}</p>
                <ul>
                  {job.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cv-grid">
        <div className="cv-section">
          <p className="section-label">Technical</p>
          <h2>Programming</h2>
          <div className="skill-cloud cv-skill-cloud" aria-label="CV technical skills">
            {["Python", "Java", "SQL", "TypeScript", "REST API", "C++", "HTML"].map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>

        <div className="cv-section">
          <p className="section-label">Education</p>
          <h2>Studies</h2>
          <div className="education-list">
            {cvEducation.map((item) => (
              <article key={item.degree}>
                <h3>{item.degree}</h3>
                <p>{item.school} · {item.period}</p>
                {item.detail ? <p>{item.detail}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cv-section cv-languages">
        <p className="section-label">Languages</p>
        <div className="language-list">
          <span>Swedish: native</span>
          <span>English: fluent</span>
          <span>German: light conversation</span>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(() => getPageFromHash());
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
    function handleHashChange() {
      setPage(getPageFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

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
        <a className="brand" href="#home">
          <span className="brand__mark" />
          <span>{githubUsername}</span>
        </a>
        <nav>
          <a href="#home">Home</a>
          <a href="#profile">Profile</a>
          <a href="#projects">Projects</a>
          <a href="#cv">CV</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      {page === "cv" ? <CvPage /> : (
      <main id="home">
        <section className="hero">
          <div className="hero__copy">
            <p className="section-label">Personal Portfolio</p>
            <h1>
              Hi, I am Gustav. I build polished web experiences with React.
            </h1>
            <p className="hero__lede">
              I enjoy creating clean, responsive interfaces and small developer
              tools that solve real problems. This page is my home base: part
              introduction, part project archive, and part snapshot of what I am
              exploring right now.
            </p>
            <div className="hero__actions">
              <a href="#projects">See my work</a>
              <a
                className="hero__secondary"
                href={`mailto:${emailAddress}`}
              >
                Contact me
              </a>
            </div>
          </div>

          <aside className="hero__panel">
            <p className="section-label">At a glance</p>
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
              <p>
                {state.profile?.bio ||
                  "Frontend-focused developer building with React, TypeScript, and curiosity."}
              </p>
            </div>
          </aside>
        </section>

        <section className="profile-strip" id="profile">
          <div className="profile-card">
            <p className="section-label">Profile</p>
            <h2>Developer, maker, and careful finisher.</h2>
            <p>
              I am drawn to projects where design, code, and usefulness meet. I
              care about how an interface feels, how the code is organized, and
              whether someone can actually use the thing without friction.
            </p>
          </div>
          <div className="skill-cloud" aria-label="Skills">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>

        <section className="about" id="about">
          <div className="about__card">
            <p className="section-label">About</p>
            <h2>I like building things that feel simple on the surface.</h2>
            <p>
              The best products hide complexity without ignoring it. I try to
              bring that mindset into my work: clear structure, reliable
              behavior, and enough personality that the result does not feel
              generic.
            </p>
          </div>
          <div className="about__steps focus-list">
            {focusAreas.map((area, index) => (
              <div key={area.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{area.title}</h3>
                  <p>{area.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-panel" id="contact">
          <div>
            <p className="section-label">Contact</p>
            <h2>Have an idea, project, or collaboration in mind?</h2>
            <p>
              I am always happy to talk about web projects, portfolio ideas,
              frontend craft, or ways to turn a rough concept into something
              people can use.
            </p>
          </div>
          <div className="contact-panel__actions">
            <a href={`mailto:${emailAddress}`}>Email me</a>
            <a
              className="contact-panel__secondary"
              href={`https://github.com/${githubUsername}`}
              target="_blank"
              rel="noreferrer"
            >
              View GitHub
            </a>
          </div>
        </section>

        <section className="github-note">
          <div>
            <p className="section-label">Live Projects</p>
            <h2>My project list updates from GitHub.</h2>
            <p>
              Public repositories are fetched from the GitHub API. If a repo has
              a <code>portfolio.yaml</code>, the site can use it for a more
              polished title, description, and custom tags.
            </p>
          </div>
          <div className="github-note__steps">
            <div>
              <span>01</span>
              <p>Fetch profile and repositories.</p>
            </div>
            <div>
              <span>02</span>
              <p>Enrich selected work with custom metadata.</p>
            </div>
            <div>
              <span>03</span>
              <p>Render searchable, live project cards.</p>
            </div>
          </div>
        </section>

        <section className="projects" id="projects">
          <div className="projects__header">
            <div>
              <p className="section-label">Selected Work</p>
              <h2>Projects from my GitHub</h2>
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
      )}
    </div>
  );
}
