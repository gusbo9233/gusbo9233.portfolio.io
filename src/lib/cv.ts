import { supabase } from "./supabase";

export interface CvRole {
  title: string;
  description?: string;
  points?: string[];
}

export interface CvExperience {
  company: string;
  location: string;
  period: string;
  context: string;
  note?: string;
  roles: CvRole[];
}

export interface CvEducation {
  degree: string;
  school: string;
  period: string;
  detail?: string;
}

export interface CvContactLink {
  label: string;
  href: string;
}

export interface Cv {
  user_id: string;
  title: string | null;
  location: string | null;
  highlights: string[];
  experience: CvExperience[];
  technical_skills: string[];
  languages: string[];
  education: CvEducation[];
  contact_links: CvContactLink[];
}

const SELECT_COLS =
  "user_id, title, location, highlights, experience, technical_skills, languages, education, contact_links";

export async function fetchCvByUserId(userId: string): Promise<Cv | null> {
  const { data, error } = await supabase
    .from("cvs")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Cv | null) ?? null;
}

export async function fetchCvByUsername(username: string): Promise<Cv | null> {
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (!profile) return null;
  return fetchCvByUserId(profile.id);
}

export async function upsertCv(
  userId: string,
  patch: Partial<Omit<Cv, "user_id">>,
): Promise<Cv> {
  const { data, error } = await supabase
    .from("cvs")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return data as Cv;
}

export function emptyCv(userId: string): Cv {
  return {
    user_id: userId,
    title: null,
    location: null,
    highlights: [],
    experience: [],
    technical_skills: [],
    languages: [],
    education: [],
    contact_links: [],
  };
}
