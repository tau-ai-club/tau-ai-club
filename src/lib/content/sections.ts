// Lecture and workshop content: section names and types (safe in server and client code).

export const CONTENT_SECTIONS = ["blurb", "summary", "goals", "takeaways", "commands", "exercises", "resources", "prep"] as const;
export type ContentSection = (typeof CONTENT_SECTIONS)[number];
export type ContentVisibility = "public" | "members";
export type ContentStatus = "draft" | "published";

/** Sections each kind of event gets, in page order. */
export const LECTURE_SECTIONS = ["blurb", "summary", "goals", "takeaways"] as const satisfies readonly ContentSection[];
export const WORKSHOP_SECTIONS = ["prep", "summary", "commands", "exercises", "resources"] as const satisfies readonly ContentSection[];

export type ContentKind = "lecture" | "workshop";
export const sectionsFor = (kind: ContentKind): readonly ContentSection[] =>
  kind === "workshop" ? WORKSHOP_SECTIONS : LECTURE_SECTIONS;

/** Workshops are their own section of the site; every other kind of event is a lecture. */
export const contentKindOf = (eventKind: string): ContentKind => (eventKind === "workshop" ? "workshop" : "lecture");

export type ContentRow = {
  id?: string;
  section: ContentSection;
  body_he: string;
  /** null = Hebrew only for now (shown with a note, never machine-translated). */
  body_en: string | null;
  visibility: ContentVisibility;
  status: ContentStatus;
  updated_at?: string;
};

export type EventFile = { id: string; title_he: string; title_en: string; path?: string; status?: ContentStatus };

/** The text to show for a locale, and whether it's the Hebrew text standing in for English. */
export function bodyFor(row: Pick<ContentRow, "body_he" | "body_en">, locale: string): { text: string; lang: "he" | "en"; fallback: boolean } {
  if (locale !== "he") {
    if (row.body_en && row.body_en.trim()) return { text: row.body_en, lang: "en", fallback: false };
    return { text: row.body_he, lang: "he", fallback: true };
  }
  if (row.body_he.trim()) return { text: row.body_he, lang: "he", fallback: false };
  return { text: row.body_en ?? "", lang: "en", fallback: Boolean(row.body_en) };
}

export const hasBody = (row: Pick<ContentRow, "body_he" | "body_en">) => Boolean(row.body_he.trim() || row.body_en?.trim());
