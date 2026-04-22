import { supabase } from "./supabase";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_username: string | null;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  position: number;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  repo_full_name: string;
  position: number;
  hidden: boolean;
  title_override: string | null;
  description_override: string | null;
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, github_username")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, github_username")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, github_username")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchFolders(userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("id, user_id, name, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchItems(userId: string): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("id, user_id, folder_id, repo_full_name, position, hidden, title_override, description_override")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertItem(
  userId: string,
  repoFullName: string,
  patch: {
    folder_id?: string | null;
    hidden?: boolean;
    position?: number;
    title_override?: string | null;
    description_override?: string | null;
  },
): Promise<PortfolioItem> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .upsert(
      { user_id: userId, repo_full_name: repoFullName, ...patch },
      { onConflict: "user_id,repo_full_name" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(userId: string, repoFullName: string): Promise<void> {
  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("user_id", userId)
    .eq("repo_full_name", repoFullName);
  if (error) throw error;
}

export async function createFolder(
  userId: string,
  name: string,
  position: number,
): Promise<Folder> {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const FEATURED_FOLDER_NAME = "Featured works";

const featuredFolderInflight = new Map<string, Promise<Folder>>();

export async function ensureFeaturedFolder(userId: string): Promise<Folder> {
  const pending = featuredFolderInflight.get(userId);
  if (pending) return pending;

  const work = (async (): Promise<Folder> => {
    const { data: matches, error } = await supabase
      .from("folders")
      .select("id, user_id, name, position")
      .eq("user_id", userId)
      .eq("name", FEATURED_FOLDER_NAME)
      .order("position", { ascending: true });
    if (error) throw error;

    if (matches && matches.length > 0) {
      const [keep, ...dupes] = matches;
      if (dupes.length > 0) {
        const dupeIds = dupes.map((d) => d.id);
        await supabase
          .from("portfolio_items")
          .update({ folder_id: keep.id })
          .in("folder_id", dupeIds);
        await supabase.from("folders").delete().in("id", dupeIds);
      }
      return keep;
    }

    const { data: all } = await supabase
      .from("folders")
      .select("position")
      .eq("user_id", userId);
    const nextPosition = (all ?? []).reduce((max, f) => Math.max(max, f.position + 1), 0);
    return createFolder(userId, FEATURED_FOLDER_NAME, nextPosition);
  })();

  featuredFolderInflight.set(userId, work);
  try {
    return await work;
  } finally {
    featuredFolderInflight.delete(userId);
  }
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("folders").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function setFolderPosition(id: string, position: number): Promise<void> {
  const { error } = await supabase.from("folders").update({ position }).eq("id", id);
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw error;
}

export async function addItem(
  userId: string,
  repoFullName: string,
  folderId: string | null,
  position: number,
): Promise<PortfolioItem> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .insert({
      user_id: userId,
      repo_full_name: repoFullName,
      folder_id: folderId,
      position,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeItem(id: string): Promise<void> {
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
  if (error) throw error;
}

export async function moveItem(
  id: string,
  folderId: string | null,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from("portfolio_items")
    .update({ folder_id: folderId, position })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "display_name" | "bio">>,
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}
