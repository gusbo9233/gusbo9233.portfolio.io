import { useEffect, useState } from "react";
import type { Profile } from "./lib/portfolio";
import type { Cv } from "./lib/cv";
import {
  getCachedCvPageData,
  invalidateCvPageData,
  loadCvPageData,
  prefetchUserPageData,
} from "./lib/pageData";
import CvEdit from "./CvEdit";
import UserTabs from "./UserTabs";

interface CvPageProps {
  username: string;
  viewerId: string | null;
  mode?: "reader" | "edit";
}

interface Loaded {
  profile: Profile;
  cv: Cv | null;
}

export default function CvPage({ username, viewerId, mode = "reader" }: CvPageProps) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "not_found" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: Loaded }
  >(() => {
    const cached = getCachedCvPageData(username);
    return cached ? { kind: "ready", data: cached } : { kind: "loading" };
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const cached = getCachedCvPageData(username);
    if (cached) {
      setState({ kind: "ready", data: cached });
    } else {
      setState({ kind: "loading" });
    }

    (async () => {
      try {
        const data = await loadCvPageData(username, { force: version > 0 });
        if (!data) {
          if (active) setState({ kind: "not_found" });
          return;
        }
        if (!active) return;
        setState({ kind: "ready", data });
        prefetchUserPageData(username);
      } catch (err) {
        if (active) setState({ kind: "error", message: (err as Error).message });
      }
    })();
    return () => {
      active = false;
    };
  }, [username, version]);

  const reload = () => {
    invalidateCvPageData(username);
    setVersion((v) => v + 1);
  };

  if (state.kind === "loading") return <main className="cv-page"><p>Loading...</p></main>;
  if (state.kind === "not_found") return <main className="cv-page"><p>No user "{username}" found.</p></main>;
  if (state.kind === "error") return <main className="cv-page"><p>Error: {state.message}</p></main>;

  const { profile, cv } = state.data;
  const isOwner = viewerId === profile.id;

  if (mode === "edit" && isOwner) {
    return <CvEdit profile={profile} cv={cv} onSaved={reload} />;
  }
  return <CvReader profile={profile} cv={cv} isOwner={isOwner} />;
}

function CvReader({ profile, cv, isOwner }: { profile: Profile; cv: Cv | null; isOwner: boolean }) {
  const hasContact = Boolean(cv && (cv.contact_links.length > 0 || cv.location));

  return (
    <main className="user-page cv-page cv-page--reader tabbed-page">
      <UserTabs username={profile.username} active="cv" />

      {!cv ? (
        <p className="user-folder__empty">{profile.display_name || profile.username} hasn't published a CV yet.</p>
      ) : (
        <CvBody cv={cv} showContact={hasContact} />
      )}
    </main>
  );
}

function CvBody({ cv, showContact }: { cv: Cv; showContact: boolean }) {
  return (
    <section className="cv-layout">
      <aside className="cv-sidebar">
        {showContact ? (
          <section className="cv-section cv-sidebar__section">
            <p className="section-label">Contact</p>
            <h2>Reach out</h2>
            <div className="cv-contact cv-contact--sidebar">
              {cv.contact_links.map((link) => (
                <a
                  key={link.href + link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  {link.label}
                </a>
              ))}
              {cv.location ? <span>{cv.location}</span> : null}
            </div>
          </section>
        ) : null}

        {cv.technical_skills.length > 0 || cv.languages.length > 0 ? (
          <section className="cv-section cv-sidebar__section">
            <p className="section-label">Programming & Languages</p>
            {cv.technical_skills.length > 0 ? (
              <>
                <h2>Technical</h2>
                <div className="skill-cloud cv-skill-cloud" aria-label="Technical skills">
                  {cv.technical_skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </>
            ) : null}
            {cv.languages.length > 0 ? (
              <>
                <h2 className="cv-subheading">Languages</h2>
                <div className="language-list">
                  {cv.languages.map((language) => (
                    <span key={language}>{language}</span>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {cv.education.length > 0 ? (
          <section className="cv-section cv-sidebar__section">
            <p className="section-label">Education</p>
            <h2>Studies</h2>
            <div className="education-list">
              {cv.education.map((item, i) => (
                <article key={`${item.degree}-${i}`}>
                  <h3>{item.degree}</h3>
                  <p>{item.school}, {item.period}</p>
                  {item.detail ? <p>{item.detail}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </aside>

      <div className="cv-main">
        {cv.title ? (
          <p className="section-label" style={{ marginTop: "0.5rem" }}>{cv.title}</p>
        ) : null}

        {cv.highlights.length > 0 ? (
          <section className="cv-section cv-summary">
            <div>
              <p className="section-label">Snapshot</p>
              <h2>{cv.title || "Summary"}</h2>
            </div>
            <div className="cv-highlight-list">
              {cv.highlights.map((h, i) => (
                <p key={i}>{h}</p>
              ))}
            </div>
          </section>
        ) : null}

        {cv.experience.length > 0 ? (
          <section className="cv-section">
            <div className="cv-section__header">
              <p className="section-label">Experience</p>
              <h2>AI/IT Projects</h2>
            </div>
            <div className="timeline">
              {cv.experience.map((job, i) => (
                <article className="timeline-item" key={`${job.company}-${job.period}-${i}`}>
                  <div className="timeline-item__meta">
                    <span>{job.period}</span>
                    <strong>{job.location}</strong>
                  </div>
                  <div className="timeline-item__body">
                    <h3>{job.company}</h3>
                    <p>{job.context}</p>
                    {job.note ? <p>{job.note}</p> : null}
                    {job.roles.map((role, j) => (
                      <div className="timeline-role" key={`${role.title}-${j}`}>
                        <p className="timeline-item__role">{role.title}</p>
                        {role.description ? <p>{role.description}</p> : null}
                        {role.points?.length ? (
                          <ul>
                            {role.points.map((point, k) => (
                              <li key={k}>{point}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
