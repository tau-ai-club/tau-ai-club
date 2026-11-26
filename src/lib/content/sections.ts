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

/** What a PDF is (DECISIONS 26.11): Ido's summary (the default), the lecturer's slides, or resources. An HTML lesson is always a game. */
export const FILE_CATEGORIES = ["summary", "slides", "resources"] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];
export const isFileCategory = (v: unknown): v is FileCategory => typeof v === "string" && (FILE_CATEGORIES as readonly string[]).includes(v);
/**
 * What the uploader says a file is (26.11): the four kinds of event material. A game is an HTML lesson
 * (event_files.kind = 'lesson'); the other three are PDFs (event_files.category). Nothing is fixed
 * silently: a pick that doesn't fit the file is refused with a message (fileKindMismatch*).
 */
export const MATERIAL_KINDS = ["summary", "game", "slides", "resources"] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];
export const isMaterialKind = (v: unknown): v is MaterialKind => typeof v === "string" && (MATERIAL_KINDS as readonly string[]).includes(v);
/** The default for a chosen file: HTML is a game, a PDF is a summary (so Ido does nothing extra). */
export const defaultMaterial = (fileName: string): MaterialKind => (/\.html?$/i.test(fileName) ? "game" : "summary");
/** null when the pick fits the file; otherwise which message to show. */
export const materialMismatch = (kind: MaterialKind, file: "pdf" | "html"): "fileKindMismatchGame" | "fileKindMismatchPdf" | null =>
  file === "pdf" ? (kind === "game" ? "fileKindMismatchGame" : null) : kind === "game" ? null : "fileKindMismatchPdf";
/** A stored file's kind, for the picker and the tag. */
export const materialOf = (f: Pick<EventFile, "kind" | "category">): MaterialKind => (f.kind === "lesson" ? "game" : (f.category ?? "summary"));
export type EventFile = { id: string; title_he: string; title_en: string; kind?: "pdf" | "lesson"; category?: FileCategory; path?: string; status?: ContentStatus };

/** The text to show for a locale, and whether it's the Hebrew text standing in for English. */
export function bodyFor(row: Pick<ContentRow, "body_he" | "body_en">, locale: string): { text: string; lang: "he" | "en"; fallback: boolean } {
  if (locale === "en") {
    if (row.body_en && row.body_en.trim()) return { text: row.body_en, lang: "en", fallback: false };
    return { text: row.body_he, lang: "he", fallback: true };
  }
  if (row.body_he.trim()) return { text: row.body_he, lang: "he", fallback: false };
  return { text: row.body_en ?? "", lang: "en", fallback: Boolean(row.body_en) };
}

export const hasBody = (row: Pick<ContentRow, "body_he" | "body_en">) => Boolean(row.body_he.trim() || row.body_en?.trim());

/**
 * Event content is files only (DECISIONS 24.11): admins upload PDF summaries and HTML lessons, and the
 * text-section editors are hidden. Text already published still shows on the pages; sections with no
 * text are left out instead of standing as "coming soon" rows. Set this to true to bring the editors
 * (and the per-section placeholders) back; no data was removed.
 */
export const TEXT_SECTIONS_ENABLED = false;

/** The text sections the admin editor shows for an event: none while content is files only. */
export const editableSectionsFor = (kind: ContentKind, enabled: boolean = TEXT_SECTIONS_ENABLED): readonly ContentSection[] =>
  enabled ? sectionsFor(kind) : [];
