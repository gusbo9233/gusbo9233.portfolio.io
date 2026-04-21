import { useEffect, useState, useSyncExternalStore } from "react";
import { signInWithGitHub, signOut, supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import UserPage from "./UserPage";
import HomePage from "./HomePage";
import CvPage from "./CvPage";
import MyPagesPage from "./MyPagesPage";
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

  return (
    <div className={`page-shell${isWidePage ? " page-shell--wide" : ""}`}>
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand__mark" />
          <span>{defaultUsername}</span>
        </a>
        <nav>
          <a href="#home">Home</a>
          <a href={`#u/${defaultUsername}/cv`}>CV</a>
          {myProfile ? (
            <a href="#me">My Pages</a>
          ) : null}
          {session ? (
            <button type="button" className="auth-button" onClick={() => signOut()}>
              Sign out{session.user.user_metadata?.user_name ? ` (${session.user.user_metadata.user_name})` : ""}
            </button>
          ) : (
            <button type="button" className="auth-button" onClick={() => signInWithGitHub()}>
              Sign in with GitHub
            </button>
          )}
        </nav>
      </header>

      <div className="page-content" data-page-kind={page.kind}>
        {page.kind === "cv" ? (
          <CvPage username={page.username} viewerId={viewerId} mode={page.edit ? "edit" : "reader"} />
        ) : page.kind === "me" ? (
          <MyPagesPage profile={myProfile} signedIn={Boolean(session)} />
        ) : page.kind === "user" ? (
          <UserPage username={page.username} viewerId={viewerId} mode={page.edit ? "edit" : "reader"} />
        ) : (
          <HomePage />
        )}
      </div>
    </div>
  );
}
