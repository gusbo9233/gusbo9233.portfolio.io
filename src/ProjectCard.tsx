import type { Project } from "./lib/github";
import { formatCompactNumber, formatDate } from "./lib/github";

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
}

export function ProjectCard({ project, featured = false }: ProjectCardProps) {
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
