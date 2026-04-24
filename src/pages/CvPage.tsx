import { useEffect, useState } from "react";
import type { Profile } from "../lib/portfolio";
import type { Cv } from "../lib/cv";
import {
  getCachedCvPageData,
  invalidateCvPageData,
  loadCvPageData,
  prefetchUserPageData,
} from "../lib/pageData";
import CvEdit from "../CvEdit";
import UserTabs from "../components/UserTabs";

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

  if (state.kind === "loading") return <main className="cv-page" style={{ padding: "3rem" }}><p>Loading…</p></main>;
  if (state.kind === "not_found") return <main className="cv-page" style={{ padding: "3rem" }}><p>No user "{username}" found.</p></main>;
  if (state.kind === "error") return <main className="cv-page" style={{ padding: "3rem" }}><p>Error: {state.message}</p></main>;

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
    <main className="cv-page cv-page--reader tabbed-page">
      <UserTabs username={profile.username} active="cv" />

      {/* CV Hero */}
      <div className="cv-hero">
        <div>
          <p className="blueprint blueprint--warm" style={{ marginBottom: 8 }}>Curriculum Vitae</p>
          <h1>
            {profile.display_name || profile.username}
            {cv?.title ? (
              <><br /><em style={{ color: "var(--primary)", fontStyle: "italic", fontSize: "0.7em" }}>{cv.title}</em></>
            ) : null}
          </h1>
          {cv?.location && (
            <p className="lede" style={{ marginBottom: 28 }}>{cv.location}</p>
          )}
          {isOwner && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <a href={`#u/${profile.username}/cv/edit`} className="btn btn--primary">
                <span className="ms" style={{ fontSize: 18 }}>edit</span>
                Edit CV
              </a>
            </div>
          )}
        </div>

        {hasContact && cv ? (
          <div className="cv-contact">
            <p className="blueprint blueprint--muted">Direct Line</p>
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
        ) : null}
      </div>

      {!cv ? (
        <p className="user-folder__empty">{profile.display_name || profile.username} hasn't published a CV yet.</p>
      ) : (
        <CvBody cv={cv} />
      )}
    </main>
  );
}

function CvBody({ cv }: { cv: Cv }) {
  return (
    <div className="cv-layout">
      <aside className="cv-sidebar">
        {cv.technical_skills.length > 0 && (
          <section className="cv-section cv-sidebar__section">
            <p className="blueprint">Core Stack</p>
            <h2>Technical skills</h2>
            <div className="skill-cloud">
              {cv.technical_skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </section>
        )}

        {cv.languages.length > 0 && (
          <section className="cv-section cv-sidebar__section">
            <p className="blueprint blueprint--warm">Languages</p>
            <h2>Spoken</h2>
            <div className="skill-cloud lang-cloud">
              {cv.languages.map((language) => (
                <span key={language}>{language}</span>
              ))}
            </div>
          </section>
        )}

        {cv.education.length > 0 && (
          <section className="cv-section cv-sidebar__section">
            <p className="blueprint">Education</p>
            <h2>Formal</h2>
            <div className="timeline">
              {cv.education.map((item, i) => (
                <article key={`${item.degree}-${i}`} className="timeline-item" style={{ gridTemplateColumns: "1fr" }}>
                  <div>
                    <h3>{item.degree}</h3>
                    <p className="timeline-item__role">{item.school}</p>
                    {item.period ? <p style={{ color: "var(--warm)", fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: 14 }}>{item.period}</p> : null}
                    {item.detail ? <p>{item.detail}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </aside>

      <div className="cv-main">
        {cv.highlights.length > 0 && (
          <section className="cv-section cv-summary">
            <div>
              <p className="blueprint">Summary</p>
              <h2>{cv.title || "Overview"}</h2>
            </div>
            <div className="cv-highlight-list">
              {cv.highlights.map((h, i) => (
                <p key={i}>{h}</p>
              ))}
            </div>
          </section>
        )}

        {cv.experience.length > 0 && (
          <section className="cv-section">
            <div className="cv-section__header">
              <p className="blueprint blueprint--warm">Experience</p>
              <h2>Selected engagements</h2>
            </div>
            <div className="timeline">
              {cv.experience.map((job, i) => (
                <article className="timeline-item" key={`${job.company}-${job.period}-${i}`}>
                  <div className="timeline-item__meta">
                    <span>{job.period}</span>
                    <div>{job.location}</div>
                  </div>
                  <div>
                    <h3>{job.company}</h3>
                    {job.context ? <p style={{ marginBottom: 8 }}>{job.context}</p> : null}
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
        )}
      </div>
    </div>
  );
}
