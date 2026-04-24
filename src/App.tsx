import { useEffect, useState, useSyncExternalStore } from "react";
import { signInWithGitHub, signOut, supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import UserPage from "./pages/UserPage";
import HomePage from "./pages/HomePage";
import CvPage from "./pages/CvPage";
import MyPagesPage from "./pages/MyPagesPage";
import { fetchMyProfile } from "./lib/portfolio";
import type { Profile } from "./lib/portfolio";

const defaultUsername = import.meta.env.VITE_GITHUB_USERNAME || "gusbo9233";

type Page =
  | { kind: "home" }
  | { kind: "me" }
  | { kind: "user"; username: string; edit: boolean }
  | { kind: "cv"; username: string; edit: boolean };

function parsePage(hash: string): Page {
  if (hash === "#me") return { kind: "me" };
  if (hash === "#cv") return { kind: "cv", username: defaultUsername, edit: false };
  const cvMatch = hash.match(/^#u\/([^/?#]+)\/cv(\/edit)?$/);
  if (cvMatch) {
    return { kind: "cv", username: decodeURIComponent(cvMatch[1]), edit: Boolean(cvMatch[2]) };
  }
  const userMatch = hash.match(/^#u\/([^/?#]+)(\/edit)?$/);
  if (userMatch) {
    return { kind: "user", username: decodeURIComponent(userMatch[1]), edit: Boolean(userMatch[2]) };
  }
  return { kind: "home" };
}

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
function getHashSnapshot() {
  return window.location.hash;
}
function useCurrentPage(): Page {
  const hash = useSyncExternalStore(subscribeHash, getHashSnapshot, () => "");
  return parsePage(hash);
}

export default function App() {
  const page = useCurrentPage();
  const [session, setSession] = useState<Session | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setMyProfile(null);
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load(attempt = 0): Promise<void> {
      const profile = await fetchMyProfile(session!.user.id).catch(() => null);
      if (!active) return;
      if (profile) {
        setMyProfile(profile);
        return;
      }
      if (attempt < 3) {
        timer = setTimeout(() => load(attempt + 1), 500);
      }
    }
    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [session]);

  const viewerId = session?.user.id ?? null;
  const isWidePage = page.kind === "cv" || page.kind === "user";

  const navLinks = [
    { href: "#home", label: "Home", active: page.kind === "home" },
    { href: `#u/${defaultUsername}/cv`, label: "CV", active: page.kind === "cv" },
    ...(myProfile ? [{ href: "#me", label: "My Pages", active: page.kind === "me" }] : []),
  ];

  return (
    <>
      <nav className="nav">
        <div className="shell shell--wide nav__inner">
          <a className="brand" href="#home">
            <span className="brand__mark" />
            <span>{defaultUsername}</span>
          </a>
          <div className="nav__links">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`nav__link${link.active ? " nav__link--active" : ""}`}
              >
                {link.label}
              </a>
            ))}
            {session ? (
              <button
                type="button"
                className="btn btn--ghost"
                style={{ fontSize: 13, padding: "10px 18px" }}
                onClick={() => signOut()}
              >
                Sign out{session.user.user_metadata?.user_name ? ` · ${session.user.user_metadata.user_name}` : ""}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--hire"
                onClick={() => signInWithGitHub()}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="page-content" data-page-kind={page.kind}>
        {page.kind === "cv" ? (
          <div className={`page-shell${isWidePage ? " page-shell--wide" : ""}`}>
            <CvPage username={page.username} viewerId={viewerId} mode={page.edit ? "edit" : "reader"} />
          </div>
        ) : page.kind === "me" ? (
          <div className="page-shell">
            <MyPagesPage profile={myProfile} signedIn={Boolean(session)} />
          </div>
        ) : page.kind === "user" ? (
          <div className={`page-shell${isWidePage ? " page-shell--wide" : ""}`}>
            <UserPage username={page.username} viewerId={viewerId} mode={page.edit ? "edit" : "reader"} />
          </div>
        ) : (
          <HomePage />
        )}
      </div>

      <footer className="foot">
        <div className="shell shell--wide foot__inner">
          <a className="brand" href="#home">
            <span className="brand__mark" />
            <span>{defaultUsername}</span>
          </a>
          <div className="foot__links">
            <a href="#home">Home</a>
            <a href={`#u/${defaultUsername}/cv`}>CV</a>
          </div>
          <p className="foot__meta">Portfolio · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </>
  );
}
