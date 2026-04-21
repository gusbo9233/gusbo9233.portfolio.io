import type { Profile } from "./lib/portfolio";

interface MyPagesPageProps {
  profile: Profile | null;
  signedIn: boolean;
}

export default function MyPagesPage({ profile, signedIn }: MyPagesPageProps) {
  if (!signedIn) {
    return (
      <main className="user-page">
        <header className="user-hero">
          <div>
            <p className="section-label">My Pages</p>
            <h1>Sign in to manage your pages</h1>
            <p>Once you sign in with GitHub, you can edit your projects page and CV from here.</p>
          </div>
        </header>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="user-page">
        <header className="user-hero">
          <div>
            <p className="section-label">My Pages</p>
            <h1>Preparing your workspace</h1>
            <p>Your profile is still loading. This page will be ready in a moment.</p>
          </div>
        </header>
      </main>
    );
  }

  return (
    <main className="user-page">
      <header className="user-hero">
        <div>
          <p className="section-label">My Pages</p>
          <h1>{profile.display_name || profile.username}</h1>
          <p>Manage what visitors see and jump straight into editing.</p>
        </div>
      </header>

      <div className="profile-grid my-pages-grid">
        <section className="profile-card my-pages-card">
          <div className="profile-card__body">
            <p className="section-label">Portfolio</p>
            <h3>Projects page</h3>
            <p className="profile-card__bio">Organize folders, hide repos, and control how your work is presented.</p>
          </div>
          <div className="my-pages-card__actions">
            <a className="auth-button" href={`#u/${profile.username}/edit`}>Edit Projects</a>
            <a href={`#u/${profile.username}`}>View Projects</a>
          </div>
        </section>

        <section className="profile-card my-pages-card">
          <div className="profile-card__body">
            <p className="section-label">CV</p>
            <h3>Resume page</h3>
            <p className="profile-card__bio">Update contact details, summary, education, skills, and experience.</p>
          </div>
          <div className="my-pages-card__actions">
            <a className="auth-button" href={`#u/${profile.username}/cv/edit`}>Edit CV</a>
            <a href={`#u/${profile.username}/cv`}>View CV</a>
          </div>
        </section>
      </div>
    </main>
  );
}
