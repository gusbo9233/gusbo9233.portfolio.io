import type { Project } from "./lib/github";
import { formatCompactNumber, formatDate } from "./lib/github";

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
}

export function ProjectCard({ project, featured = false }: ProjectCardProps) {
  const eyebrow = project.language || (project.tags[0] ?? "Repository");

  return (
    <a
      className={`proj${featured ? " proj--featured" : ""}`}
      href={project.htmlUrl}
      target="_blank"
      rel="noreferrer"
    >
      <p className="proj__eyebrow">{eyebrow}</p>
      <h3
        className="proj__title"
        style={{ fontSize: featured ? "2rem" : "1.4rem" }}
      >
        {project.title}
      </h3>
      {project.description ? (
        <p className="proj__desc">{project.description}</p>
      ) : null}

      {project.tags.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {project.tags.slice(0, 3).map((tag) => (
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
