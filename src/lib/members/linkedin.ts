import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMemberDirectory, type DirectoryMember } from "@/lib/members/directory";
import { linkedinUrl } from "@/lib/members/linkedin-url";

export type LinkedinMember = Omit<DirectoryMember, "photo_url"> & { photo_url: string | null; linkedin: string };

/**
 * "Connect on LinkedIn" (25.11): the club members with a LinkedIn link on their profile, without
 * the viewer. Nothing new is exposed: the people are member_directory() (members only, active
 * members only) and the link is the one member pages already show members (profiles is readable
 * by members only, RLS "members read profiles"). Only the linkedin key is read, never the other
 * links, and never an email or phone. null on an error.
 */
export async function getLinkedinMembers(supabase: SupabaseClient, viewerId: string): Promise<LinkedinMember[] | null> {
  const directory = await getMemberDirectory(supabase);
  if (!directory) return null;
  const { data, error } = await supabase.from("profiles").select("member_id, linkedin:links->>linkedin");
  if (error || !Array.isArray(data)) return null;
  const byMember = new Map<string, string>();
  for (const row of data as { member_id: string; linkedin: unknown }[]) {
    const url = linkedinUrl(row.linkedin);
    if (url) byMember.set(row.member_id, url);
  }
  return directory.filter((m) => m.id !== viewerId && byMember.has(m.id)).map((m) => ({ ...m, linkedin: byMember.get(m.id)! }));
}
