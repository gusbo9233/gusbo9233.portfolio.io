import { useEffect, useState } from "react";
import { fetchAllProfiles } from "./lib/portfolio";
import type { Profile } from "./lib/portfolio";

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAllProfiles()
      .then((list) => {
        if (active) setProfiles(list);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="user-page">
      <header className="user-hero">
        <div>
          <p className="section-label">Portfolios</p>
          <h1>Choose a profile</h1>
          <p>Pick someone to view their portfolio. Sign in with GitHub to get your own.</p>
        </div>
      </header>

      {error ? <p className="user-folder__empty">Error: {error}</p> : null}

      {profiles === null ? (
        <p>Loading...</p>
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
    </main>
  );
}
