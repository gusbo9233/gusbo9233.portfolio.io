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
    .select("id, user_id, folder_id, repo_full_name, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
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

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("folders").update({ name }).eq("id", id);
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
