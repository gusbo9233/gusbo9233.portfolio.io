import { useState, useTransition } from "react";
import type { Profile } from "./lib/portfolio";
import { emptyCv, upsertCv } from "./lib/cv";
import UserTabs from "./UserTabs";
import type {
  Cv,
  CvContactLink,
  CvEducation,
  CvExperience,
  CvRole,
} from "./lib/cv";

interface CvEditProps {
  profile: Profile;
  cv: Cv | null;
  onSaved: () => void;
}

type Draft = Omit<Cv, "user_id">;

function toDraft(cv: Cv | null, userId: string): Draft {
  const base = cv ?? emptyCv(userId);
  const { user_id: _unused, ...draft } = base;
  return draft;
}

export default function CvEdit({ profile, cv, onSaved }: CvEditProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(cv, profile.id));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertCv(profile.id, draft);
        onSaved();
        window.location.hash = `#u/${profile.username}/cv`;
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <main className="user-page cv-page cv-edit">
      <header className="user-hero">
        <div>
          <p className="section-label">Editing CV</p>
          <h1>{profile.display_name || profile.username}</h1>
          <p className="user-hero__username">@{profile.username}</p>
        </div>
        <div className="user-hero__actions">
          <button type="button" className="auth-button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </button>
          <a href={`#u/${profile.username}/cv`}>Cancel</a>
        </div>
      </header>
      <UserTabs username={profile.username} active="cv" />

      {error ? <p className="user-folder__empty">Error: {error}</p> : null}

      <section className="cv-section">
        <p className="section-label">Header</p>
        <label className="cv-edit__field">
          <span>Title</span>
          <input
            type="text"
            value={draft.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <label className="cv-edit__field">
          <span>Location</span>
          <input
            type="text"
            value={draft.location ?? ""}
            onChange={(e) => update("location", e.target.value)}
          />
        </label>
      </section>

      <StringListEditor
        label="Highlights"
        items={draft.highlights}
        onChange={(next) => update("highlights", next)}
        placeholder="One-line highlight"
        multiline
      />

      <StringListEditor
        label="Technical skills"
        items={draft.technical_skills}
        onChange={(next) => update("technical_skills", next)}
        placeholder="e.g. Python"
      />

      <StringListEditor
        label="Languages"
        items={draft.languages}
        onChange={(next) => update("languages", next)}
        placeholder="e.g. English (fluent)"
      />

      <ContactLinksEditor
        links={draft.contact_links}
        onChange={(next) => update("contact_links", next)}
      />

      <EducationEditor
        items={draft.education}
        onChange={(next) => update("education", next)}
      />

      <ExperienceEditor
        items={draft.experience}
        onChange={(next) => update("experience", next)}
      />

      <div className="user-hero__actions">
        <button type="button" className="auth-button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </button>
        <a href={`#u/${profile.username}/cv`}>Cancel</a>
      </div>
    </main>
  );
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <section className="cv-section cv-edit__list">
      <div className="cv-edit__list-header">
        <p className="section-label">{label}</p>
        <button type="button" onClick={() => onChange([...items, ""])}>+ Add</button>
      </div>
      {items.length === 0 ? <p className="user-folder__empty">Empty.</p> : null}
      {items.map((value, idx) => (
        <div className="cv-edit__row" key={idx}>
          {multiline ? (
            <textarea
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((v, i) => (i === idx ? e.target.value : v)))}
            />
          ) : (
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((v, i) => (i === idx ? e.target.value : v)))}
            />
          )}
          <div className="cv-edit__row-actions">
            <button type="button" onClick={() => onChange(moveItem(items, idx, idx - 1))}>↑</button>
            <button type="button" onClick={() => onChange(moveItem(items, idx, idx + 1))}>↓</button>
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))}>Remove</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function ContactLinksEditor({
  links,
  onChange,
}: {
  links: CvContactLink[];
  onChange: (next: CvContactLink[]) => void;
}) {
  function patch(idx: number, patch: Partial<CvContactLink>) {
    onChange(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  return (
    <section className="cv-section cv-edit__list">
      <div className="cv-edit__list-header">
        <p className="section-label">Contact links</p>
        <button type="button" onClick={() => onChange([...links, { label: "", href: "" }])}>+ Add</button>
      </div>
      {links.map((link, idx) => (
        <div className="cv-edit__row" key={idx}>
          <input
            type="text"
            placeholder="Label"
            value={link.label}
            onChange={(e) => patch(idx, { label: e.target.value })}
          />
          <input
            type="text"
            placeholder="URL (https://, mailto:, tel:)"
            value={link.href}
            onChange={(e) => patch(idx, { href: e.target.value })}
          />
          <div className="cv-edit__row-actions">
            <button type="button" onClick={() => onChange(moveItem(links, idx, idx - 1))}>↑</button>
            <button type="button" onClick={() => onChange(moveItem(links, idx, idx + 1))}>↓</button>
            <button type="button" onClick={() => onChange(links.filter((_, i) => i !== idx))}>Remove</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function EducationEditor({
  items,
  onChange,
}: {
  items: CvEducation[];
  onChange: (next: CvEducation[]) => void;
}) {
  function patch(idx: number, p: Partial<CvEducation>) {
    onChange(items.map((e, i) => (i === idx ? { ...e, ...p } : e)));
  }
  return (
    <section className="cv-section cv-edit__list">
      <div className="cv-edit__list-header">
        <p className="section-label">Education</p>
        <button
          type="button"
          onClick={() => onChange([...items, { degree: "", school: "", period: "" }])}
        >
          + Add
        </button>
      </div>
      {items.map((item, idx) => (
        <div className="cv-edit__block" key={idx}>
          <input
            type="text"
            placeholder="Degree"
            value={item.degree}
            onChange={(e) => patch(idx, { degree: e.target.value })}
          />
          <input
            type="text"
            placeholder="School"
            value={item.school}
            onChange={(e) => patch(idx, { school: e.target.value })}
          />
          <input
            type="text"
            placeholder="Period"
            value={item.period}
            onChange={(e) => patch(idx, { period: e.target.value })}
          />
          <textarea
            placeholder="Detail (optional)"
            value={item.detail ?? ""}
            onChange={(e) => patch(idx, { detail: e.target.value || undefined })}
          />
          <div className="cv-edit__row-actions">
            <button type="button" onClick={() => onChange(moveItem(items, idx, idx - 1))}>↑</button>
            <button type="button" onClick={() => onChange(moveItem(items, idx, idx + 1))}>↓</button>
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))}>Remove</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function ExperienceEditor({
  items,
  onChange,
}: {
  items: CvExperience[];
  onChange: (next: CvExperience[]) => void;
}) {
  function patch(idx: number, p: Partial<CvExperience>) {
    onChange(items.map((j, i) => (i === idx ? { ...j, ...p } : j)));
  }
  function patchRoles(idx: number, roles: CvRole[]) {
    patch(idx, { roles });
  }
  return (
    <section className="cv-section cv-edit__list">
      <div className="cv-edit__list-header">
        <p className="section-label">Experience</p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              { company: "", location: "", period: "", context: "", roles: [] },
            ])
          }
        >
          + Add
        </button>
      </div>
      {items.map((job, idx) => (
        <div className="cv-edit__block cv-edit__experience" key={idx}>
          <input
            type="text"
            placeholder="Company"
            value={job.company}
            onChange={(e) => patch(idx, { company: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            value={job.location}
            onChange={(e) => patch(idx, { location: e.target.value })}
          />
          <input
            type="text"
            placeholder="Period (e.g. Jun 2025–Dec 2025)"
            value={job.period}
            onChange={(e) => patch(idx, { period: e.target.value })}
          />
          <textarea
            placeholder="Context"
            value={job.context}
            onChange={(e) => patch(idx, { context: e.target.value })}
          />
          <textarea
            placeholder="Note (optional)"
            value={job.note ?? ""}
            onChange={(e) => patch(idx, { note: e.target.value || undefined })}
          />
          <RolesEditor roles={job.roles} onChange={(roles) => patchRoles(idx, roles)} />
          <div className="cv-edit__row-actions">
            <button type="button" onClick={() => onChange(moveItem(items, idx, idx - 1))}>↑</button>
            <button type="button" onClick={() => onChange(moveItem(items, idx, idx + 1))}>↓</button>
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))}>Remove job</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function RolesEditor({
  roles,
  onChange,
}: {
  roles: CvRole[];
  onChange: (next: CvRole[]) => void;
}) {
  function patch(idx: number, p: Partial<CvRole>) {
    onChange(roles.map((r, i) => (i === idx ? { ...r, ...p } : r)));
  }
  function patchPoints(idx: number, points: string[]) {
    patch(idx, { points });
  }
  return (
    <div className="cv-edit__roles">
      <div className="cv-edit__list-header">
        <p className="section-label">Roles</p>
        <button type="button" onClick={() => onChange([...roles, { title: "" }])}>+ Add role</button>
      </div>
      {roles.map((role, idx) => (
        <div className="cv-edit__block" key={idx}>
          <input
            type="text"
            placeholder="Role title"
            value={role.title}
            onChange={(e) => patch(idx, { title: e.target.value })}
          />
          <textarea
            placeholder="Description (optional — used when there are no bullet points)"
            value={role.description ?? ""}
            onChange={(e) => patch(idx, { description: e.target.value || undefined })}
          />
          <div className="cv-edit__points">
            <div className="cv-edit__list-header">
              <p className="section-label">Bullet points</p>
              <button
                type="button"
                onClick={() => patchPoints(idx, [...(role.points ?? []), ""])}
              >
                + Add point
              </button>
            </div>
            {(role.points ?? []).map((point, pIdx) => (
              <div className="cv-edit__row" key={pIdx}>
                <textarea
                  value={point}
                  onChange={(e) =>
                    patchPoints(idx, (role.points ?? []).map((v, i) => (i === pIdx ? e.target.value : v)))
                  }
                />
                <div className="cv-edit__row-actions">
                  <button
                    type="button"
                    onClick={() => patchPoints(idx, moveItem(role.points ?? [], pIdx, pIdx - 1))}
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => patchPoints(idx, moveItem(role.points ?? [], pIdx, pIdx + 1))}
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => patchPoints(idx, (role.points ?? []).filter((_, i) => i !== pIdx))}
                  >Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="cv-edit__row-actions">
            <button type="button" onClick={() => onChange(moveItem(roles, idx, idx - 1))}>↑</button>
            <button type="button" onClick={() => onChange(moveItem(roles, idx, idx + 1))}>↓</button>
            <button type="button" onClick={() => onChange(roles.filter((_, i) => i !== idx))}>Remove role</button>
          </div>
        </div>
      ))}
    </div>
  );
}
