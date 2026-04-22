import { useEffect, useState } from "react";
import { fetchAllProfiles } from "./lib/portfolio";
import type { Profile } from "./lib/portfolio";

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAllProfiles()
      .then((list) => { if (active) setProfiles(list); })
      .catch((err: Error) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  return (
    <section className="shell shell--wide" style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
      <header style={{ maxWidth: 780, marginBottom: "3rem" }}>
        <p className="blueprint blueprint--warm" style={{ marginBottom: 12 }}>Portfolios</p>
        <h1 className="display" style={{ marginBottom: 20 }}>
          Choose a <em>profile</em>.
        </h1>
        <p className="lede">
          Pick someone to view their portfolio. Sign in with GitHub to get your own.
        </p>
      </header>

      {error ? (
        <div className="status-panel status-panel--error" style={{ marginBottom: "1.5rem" }}>
          Error: {error}
        </div>
      ) : null}

      {profiles === null ? (
        <p className="user-folder__empty">Loading…</p>
      ) : profiles.length === 0 ? (
        <p className="user-folder__empty">No profiles yet.</p>
      ) : (
        <div className="profile-grid">
          {profiles.map((p) => (
            <a key={p.id} className="profile-card" href={`#u/${p.username}`}>
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="profile-card__avatar" />
              ) : (
                <div className="profile-card__avatar profile-card__avatar--placeholder" />
              )}
              <div className="profile-card__body">
                <h3>{p.display_name || p.username}</h3>
                <p className="profile-card__handle">@{p.username}</p>
                {p.bio ? <p className="profile-card__bio">{p.bio}</p> : null}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
