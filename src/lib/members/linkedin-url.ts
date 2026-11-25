/** Only a real LinkedIn address opens from the list (https, linkedin.com or a subdomain). */
export function linkedinUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.hostname !== "linkedin.com" && !u.hostname.endsWith(".linkedin.com")) return null;
    u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}
