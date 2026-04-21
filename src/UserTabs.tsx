import type { MouseEvent } from "react";
import { prefetchCvPageData, prefetchUserPageData } from "./lib/pageData";

interface UserTabsProps {
  username: string;
  active: "projects" | "cv";
}

function navigateWithTransition(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.defaultPrevented
  ) {
    return;
  }

  event.preventDefault();

  if (window.location.hash === href) {
    return;
  }

  const documentWithTransition = document as Document & {
    startViewTransition?: (update: () => void | Promise<void>) => void;
  };

  if (documentWithTransition.startViewTransition) {
    documentWithTransition.startViewTransition(() => {
      window.location.hash = href;
    });
    return;
  }

  window.location.hash = href;
}

export default function UserTabs({ username, active }: UserTabsProps) {
  const projectsHref = `#u/${username}`;
  const cvHref = `#u/${username}/cv`;
  const prefetchProjects = () => prefetchUserPageData(username);
  const prefetchCv = () => prefetchCvPageData(username);

  return (
    <nav className="user-tabs" aria-label="Page sections">
      <a
        href={projectsHref}
        className={`user-tabs__tab${active === "projects" ? " user-tabs__tab--active" : ""}`}
        aria-current={active === "projects" ? "page" : undefined}
        onClick={(event) => navigateWithTransition(event, projectsHref)}
        onMouseEnter={prefetchProjects}
        onFocus={prefetchProjects}
      >
        Projects
      </a>
      <a
        href={cvHref}
        className={`user-tabs__tab${active === "cv" ? " user-tabs__tab--active" : ""}`}
        aria-current={active === "cv" ? "page" : undefined}
        onClick={(event) => navigateWithTransition(event, cvHref)}
        onMouseEnter={prefetchCv}
        onFocus={prefetchCv}
      >
        CV
      </a>
    </nav>
  );
}
