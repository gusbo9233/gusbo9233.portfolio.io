import type { Project } from "./lib/github";
import { formatCompactNumber, formatDate } from "./lib/github";

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
  compact?: boolean;
}

export function ProjectCard({ project, featured = false, compact = false }: ProjectCardProps) {
  const eyebrow = project.language || (project.tags[0] ?? "Repository");
  const visibleTags = compact ? project.tags.slice(0, 2) : project.tags.slice(0, 3);

  return (
    <a
      className={`proj${featured ? " proj--featured" : ""}${compact ? " proj--compact" : ""}`}
      href={project.htmlUrl}
      target="_blank"
      rel="noreferrer"
    >
      <p className="proj__eyebrow">{eyebrow}</p>
      <h3
        className="proj__title"
        style={{ fontSize: featured ? "2rem" : compact ? "1.1rem" : "1.4rem" }}
      >
        {project.title}
      </h3>
      {project.description ? (
        <p className="proj__desc">{project.description}</p>
      ) : null}

      {visibleTags.length > 0 ? (
        <div className="proj__tags">
          {visibleTags.map((tag) => (
            <span className="chip" key={`${project.id}-${tag}`}>{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="proj__meta">
        {project.language ? (
          <span>
            <span className="proj__dot" style={{ background: "var(--primary)" }} />
            {project.language}
          </span>
        ) : null}
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
