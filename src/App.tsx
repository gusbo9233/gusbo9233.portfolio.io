import { useEffect, useState } from "react";
import { signInWithGitHub, signOut, supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import UserPage from "./UserPage";
import HomePage from "./HomePage";
import { fetchMyProfile } from "./lib/portfolio";
import type { Profile } from "./lib/portfolio";

const defaultUsername = import.meta.env.VITE_GITHUB_USERNAME || "gusbo9233";

type Page =
  | { kind: "home" }
  | { kind: "cv" }
  | { kind: "user"; username: string };

const cvHighlights = [
  "Co-developed award-winning program, streamlined processes, and collaborated in 8–10 person teams.",
  "Managed applications throughout full lifecycle—from development to deployment and maintenance.",
];

const cvExperience = [
  {
    company: "Concentrix",
    location: "Warszawa, Poland",
    period: "Jun 2025–Dec 2025",
    context:
      "2,000+ customers across all major sectors, including iconic Fortune Global 500 brands.",
    roles: [
      {
        title: "Technical Customer Support",
        points: [
          "Supported (75–150 calls/week) Swedish telecom company Allente (merger: Canal Digital, Viasat Consumer).",
        ],
      },
    ],
  },
  {
    company: "Infor",
    location: "Linköping",
    period: "Sep 2023–Feb 2024",
    context:
      "60,000+ customers worldwide. Global leader in business cloud software products for industry-specific markets.",
    roles: [
      {
        title: "Software Developer",
        points: [
          "Worked on debugging and developing sales part of M3 ERP system.",
          "Used Java and SQL to fix issues and implement new features to improve system.",
        ],
      },
    ],
  },
  {
    company: "Norditech",
    location: "Jönköping",
    period: "Sep 2021–May 2022",
    context:
      "IT consulting specializing in AI, machine learning, process optimization of mechanical industry, and data analysis.",
    note:
      'Hired by small startup (6 people), which was later awarded for "Young Innovators" and "Incubator of the Year."',
    roles: [
      {
        title: "Software Developer",
        points: [
          "Co-developed awarded inventory warehouse program for 147 MSEK revenue industrial machinery manufacturing company. Program controlled cameras in warehouse and took pictures of labels. Based on pictures, program performed inventory tasks.",
          "Wrote Python scripts for machine vision projects using OpenCV and ROS.",
        ],
      },
    ],
  },
  {
    company: "Tetra Pak",
    location: "Lund",
    period: "2019–2022",
    context:
      "Listed market leader (30%–35% of global aseptic packaging market) with 24,000 employees worldwide.",
    roles: [
      {
        title: "IT Worker, Jun 2022–Aug 2022",
        description:
          "Studied Agile methods, Azure, and PowerShell. Worked on 2 teams in India and Brazil: Communication Solutions and Adoption & Collaboration Solutions, supporting global sites with infoscreen management and other tasks.",
      },
      {
        title: "IT Worker, Jun 2021–Aug 2021",
        points: [
          "Maintained Tetra Pak website using Adobe Experience Manager. Updated content and fixed issues.",
          "Migrated all processing insights pages to tetrapak.com; built and edited content in Adobe.",
          "Edited Tetra Pak product information in SAP Hybris (PIM) and images and animations in Photoshop.",
        ],
      },
      {
        title: "IT Worker, Jun 2020–Aug 2020",
        points: [
          "Initiated and developed automation for image processing (cropping, renaming, and smart upscaling with AI).",
          "Migrated Tetra Pak website from SharePoint to Adobe as part of 8-person team.",
        ],
      },
      {
        title: "IT Worker, Jun 2019–Aug 2019",
        points: [
          "Initiated and wrote program that streamlined process of cleaning up customer data in SAP.",
          "Updated machine names in database (part of Smart Sales project; CRM, CPQ, and marketing automation).",
          "Made tetrapak.com and customer portals more attractive and customized; added features.",
        ],
      },
    ],
  },
];

const cvTechnicalSkills = [
  "Python",
  "Java",
  "SQL",
  "TypeScript",
  "REST API",
  "C++",
  "HTML",
];

const cvLanguages = [
  "English (fluent)",
  "Swedish (native)",
  "German (light conversation)",
];

const cvEducation = [
  {
    degree: "BSc in Computer Science",
    school: "Linköping University",
    period: "2017–2025",
    detail:
      'Student thesis: "Interactive Visualisation of Medical Patient Data" (working prototype for Karolinska Institute)',
  },
  {
    degree: "BSc in Economics",
    school: "Linköping University",
    period: "2022–2025",
  },
];

const cvContactLinks = [
  { label: "+46 76 166 14 28", href: "tel:+46761661428" },
  { label: "github.com/gusbo9233", href: "https://github.com/gusbo9233" },
  { label: "linkedin.com/in/gustav-boberg", href: "https://linkedin.com/in/gustav-boberg" },
  { label: "gusbo923@gmail.com", href: "mailto:gusbo923@gmail.com" },
];

interface CvRole {
  title: string;
  description?: string;
  points?: string[];
}

interface CvExperienceItem {
  company: string;
  location: string;
  period: string;
  context: string;
  note?: string;
  roles: CvRole[];
}

function getPageFromHash(): Page {
  const hash = window.location.hash;
  if (hash === "#cv") return { kind: "cv" };
  const userMatch = hash.match(/^#u\/([^/?#]+)/);
  if (userMatch) return { kind: "user", username: decodeURIComponent(userMatch[1]) };
  return { kind: "home" };
}

function CvPage() {
  return (
    <main className="cv-page">
      <section className="cv-hero">
        <div>
          <p className="section-label">Curriculum Vitae</p>
          <h1>Gustav Boberg</h1>
          <p>Software Developer</p>
        </div>
        <aside className="cv-contact">
          {cvContactLinks.map((link) => (
            <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined}>
              {link.label}
            </a>
          ))}
          <span>Lund</span>
        </aside>
      </section>

      <section className="cv-section cv-summary">
        <div>
          <p className="section-label">Snapshot</p>
          <h2>Software Developer</h2>
        </div>
        <div className="cv-highlight-list">
          {cvHighlights.map((highlight) => (
            <p key={highlight}>{highlight}</p>
          ))}
        </div>
      </section>

      <section className="cv-section">
        <div className="cv-section__header">
          <p className="section-label">Experience</p>
          <h2>AI/IT Projects</h2>
        </div>
        <div className="timeline">
          {(cvExperience as CvExperienceItem[]).map((job) => (
            <article className="timeline-item" key={`${job.company}-${job.period}`}>
              <div className="timeline-item__meta">
                <span>{job.period}</span>
                <strong>{job.location}</strong>
              </div>
              <div className="timeline-item__body">
                <h3>{job.company}</h3>
                <p>{job.context}</p>
                {job.note ? <p>{job.note}</p> : null}
                {job.roles.map((role) => (
                  <div className="timeline-role" key={role.title}>
                    <p className="timeline-item__role">{role.title}</p>
                    {role.description ? <p>{role.description}</p> : null}
                    {role.points?.length ? (
                      <ul>
                        {role.points.map((point) => (
                          <li key={point}>{point}</li>
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

      <section className="cv-grid">
        <div className="cv-section">
          <p className="section-label">Programming & Languages</p>
          <h2>Technical</h2>
          <div className="skill-cloud cv-skill-cloud" aria-label="CV technical skills">
            {cvTechnicalSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          <h2 className="cv-subheading">Languages</h2>
          <div className="language-list">
            {cvLanguages.map((language) => (
              <span key={language}>{language}</span>
            ))}
          </div>
        </div>

        <div className="cv-section">
          <p className="section-label">Education</p>
          <h2>Studies</h2>
          <div className="education-list">
            {cvEducation.map((item) => (
              <article key={item.degree}>
                <h3>{item.degree}</h3>
                <p>{item.school}, {item.period}</p>
                {item.detail ? <p>{item.detail}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(() => getPageFromHash());
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
    async function load(attempt = 0): Promise<void> {
      const profile = await fetchMyProfile(session!.user.id).catch(() => null);
      if (!active) return;
      if (profile) {
        setMyProfile(profile);
        return;
      }
      if (attempt < 3) {
        setTimeout(() => load(attempt + 1), 500);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    function handleHashChange() {
      setPage(getPageFromHash());
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const viewerId = session?.user.id ?? null;

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand__mark" />
          <span>{defaultUsername}</span>
        </a>
        <nav>
          <a href="#home">Home</a>
          <a href="#cv">CV</a>
          {myProfile ? (
            <a href={`#u/${myProfile.username}`}>My page</a>
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

      {page.kind === "cv" ? (
        <CvPage />
      ) : page.kind === "user" ? (
        <UserPage username={page.username} viewerId={viewerId} />
      ) : (
        <HomePage />
      )}
    </div>
  );
}
