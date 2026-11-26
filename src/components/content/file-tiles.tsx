import type { ComponentType, ReactNode } from "react";
import type { EventFile } from "@/lib/content/sections";
import { cn } from "@/lib/utils";

/**
 * The member files on a lecture or workshop page, as tiles with a tab (DECISIONS 25.11, option A
 * in files-look; four kinds, DECISIONS 26.11).
 *
 * - An interactive lesson (HTML) is the game: the one purple tile, something to open and play, at
 *   /lessons/<id> (a sandboxed frame).
 * - A PDF is one of three calm kinds by its `category`: Ido's summary, the lecturer's slides, or
 *   supporting material. A missing category means summary, so older rows and Ido's uploads stay
 *   summaries. Tab, icon and line tell them apart. A PDF downloads through /api/files (a
 *   short-lived signed URL).
 * - The order is fixed: summary, game, slides, resources, keeping upload order within a kind.
 *
 * The whole tile is one link. Its accessible name is the full sentence ("הורדת …" / "שיעור
 * אינטראקטיבי: …"), so a screen reader hears one clear action, not the tab, title and button apart.
 * Works in both server and client components (no hooks). The lesson link component is passed in
 * (file-link.tsx gives it the locale-aware Link), so this file has no Next imports and tests can
 * render it on its own.
 */
export type FileKey =
  | "download" | "downloadSlides" | "downloadResources" | "openLesson"
  | "fileTabPdf" | "fileTabLesson" | "fileTabSlides" | "fileTabResources"
  | "fileMetaPdf" | "fileMetaLesson" | "fileMetaSlides" | "fileMetaResources"
  | "fileCtaPdf" | "fileCtaLesson"
  | "fileMetaSlidesPptx" | "downloadSlidesPptx";
export type T = (key: FileKey, values?: { title: string }) => string;
export type LinkLike = "a" | ComponentType<{ href: string; className?: string; "aria-label"?: string; "data-testid"?: string; children?: ReactNode }>;

/** What a PDF is. The data passes it in; HTML is always a game, whatever it says. */
export type FileCategory = "summary" | "slides" | "resources";
/**
 * A file as the tiles read it: the shared EventFile, plus its category and file format once the
 * data carries them. A .pptx is always the lecturer's slides; it downloads like a PDF (the site
 * can't show it), and its tile says PowerPoint instead of PDF.
 */
export type TileFile = EventFile & { category?: string | null; format?: string | null };
export type TileKind = "summary" | "lesson" | "slides" | "resources";

const ORDER: readonly TileKind[] = ["summary", "lesson", "slides", "resources"];

export function kindOf(f: TileFile): TileKind {
  if (f.kind === "lesson") return "lesson";
  if (f.format === "pptx") return "slides";
  return f.category === "slides" || f.category === "resources" ? f.category : "summary";
}

const isPptx = (f: TileFile) => f.kind !== "lesson" && f.format === "pptx";

/** Summary, game, slides, resources; the order they came in within each kind. */
export function orderFiles<F extends TileFile>(files: readonly F[]): F[] {
  return files
    .map((f, i) => ({ f, i }))
    .sort((a, b) => ORDER.indexOf(kindOf(a.f)) - ORDER.indexOf(kindOf(b.f)) || a.i - b.i)
    .map((x) => x.f);
}

const COPY: Record<TileKind, { tab: FileKey; meta: FileKey; cta: FileKey; name: FileKey }> = {
  summary: { tab: "fileTabPdf", meta: "fileMetaPdf", cta: "fileCtaPdf", name: "download" },
  lesson: { tab: "fileTabLesson", meta: "fileMetaLesson", cta: "fileCtaLesson", name: "openLesson" },
  slides: { tab: "fileTabSlides", meta: "fileMetaSlides", cta: "fileCtaPdf", name: "downloadSlides" },
  resources: { tab: "fileTabResources", meta: "fileMetaResources", cta: "fileCtaPdf", name: "downloadResources" },
};

// Pixel glyphs on the logo's grid, like the home page's card icons: "#" lit (brand purple), "+" dim.
const GLYPHS: Record<TileKind, readonly string[]> = {
  // A page with lines of text: the summary.
  summary: [".######..", ".#....##.", ".#.....#.", ".#+++++#.", ".#.....#.", ".#++++.#.", ".#.....#.", ".#+++..#.", ".#######."],
  // A screen with a play sign: the interactive lesson.
  lesson: ["+++++++++", "+.......+", "+..#....+", "+..##...+", "+..###..+", "+..##...+", "+..#....+", "+.......+", "+++++++++"],
  // A projector screen on a stand, with a rising bar chart: the lecturer's slides.
  slides: ["#########", ".+++++++.", ".+....#+.", ".+..#.#+.", ".+#.#.#+.", ".+++++++.", "....#....", "...#.#...", "..#...#.."],
  // A toolbox: supporting material.
  resources: [".........", "...###...", "...#.#...", "#########", "#+++++++#", "####+####", "#+++++++#", "#+++++++#", "#########"],
};

/**
 * One kind's pixel icon, for reuse (e.g. the kind picker in the files editor). Decorative
 * (aria-hidden): put the kind's name in words next to it. Size it with className (default 44px).
 */
export function FileKindIcon({ kind, className }: { kind: TileKind; className?: string }) {
  const rows = GLYPHS[kind];
  return (
    <svg aria-hidden viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" className={cn("block size-11 shrink-0", className)}>
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c === "#" ? "var(--brand-purple)" : "var(--logo-block)"} />
          ),
        ),
      )}
    </svg>
  );
}
export const SummaryIcon = ({ className }: { className?: string }) => <FileKindIcon kind="summary" className={className} />;
export const GameIcon = ({ className }: { className?: string }) => <FileKindIcon kind="lesson" className={className} />;
export const SlidesIcon = ({ className }: { className?: string }) => <FileKindIcon kind="slides" className={className} />;
export const ResourcesIcon = ({ className }: { className?: string }) => <FileKindIcon kind="resources" className={className} />;

export function FileTiles({ files, locale, t, LessonLink }: { files: readonly TileFile[]; locale: string; t: T; LessonLink: LinkLike }) {
  return (
    <ul className="mt-10 grid gap-x-4 gap-y-10 sm:grid-cols-2" data-testid="file-tiles">
      {orderFiles(files).map((f) => (
        <li key={f.id} className="min-w-0" data-kind={kindOf(f)}>
          <FileTile file={f} title={locale === "en" ? f.title_en : f.title_he} locale={locale} t={t} LessonLink={LessonLink} />
        </li>
      ))}
    </ul>
  );
}

function FileTile({ file, title, locale, t, LessonLink }: { file: TileFile; title: string; locale: string; t: T; LessonLink: LinkLike }) {
  const kind = kindOf(file);
  const copy = isPptx(file) ? { ...COPY.slides, meta: "fileMetaSlidesPptx" as const, name: "downloadSlidesPptx" as const } : COPY[kind];
  const lesson = kind === "lesson";
  const en = locale === "en";
  const body = (
    <>
      {/* The tab: a folder tab on the tile's start corner, reaching 1px over the tile's top border so the
          two read as one piece. Pixel caps in English, Plex in Hebrew. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-px -start-px inline-flex -translate-y-full items-center gap-1.5 rounded-t-md border border-b-0 px-3 pt-1 pb-0.5 leading-[1.4] whitespace-nowrap",
          en ? "font-pixel text-[0.625rem] tracking-[0.16em] uppercase" : "text-[0.8125rem] font-medium",
          lesson ? "border-brand-purple bg-brand-purple text-fg" : "border-border-strong bg-bg-raised text-fg-muted",
        )}
      >
        <span className="size-1.5 bg-current" />
        {t(copy.tab)}
      </span>
      <span className="flex min-w-0 items-center gap-4">
        <FileKindIcon kind={kind} />
        <span className="grid min-w-0 gap-1">
          <span className="text-[1.1875rem] leading-tight font-semibold break-words text-fg">{title}</span>
          <span className={cn("text-sm", lesson ? "text-brand-purple-soft" : "text-fg-subtle")}>{t(copy.meta)}</span>
        </span>
      </span>
      <span
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border px-4 text-[0.9375rem] font-semibold transition-colors sm:w-fit sm:justify-self-start",
          lesson
            ? "border-brand-purple bg-brand-purple text-fg group-hover:bg-brand-purple-deeper"
            : "border-border-strong text-fg group-hover:border-brand-purple",
        )}
      >
        {lesson ? (
          // A play sign points the same way in both languages: never mirrored.
          <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="currentColor">
            <path d="M2 1h2v1h2v1h2v1h2v1h1v2h-1v1H8v1H6v1H4v1H2z" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="currentColor">
            <path d="M7 2h2v8h2v2H9v2H7v-2H5v-2h2z" />
          </svg>
        )}
        {t(copy.cta)}
      </span>
    </>
  );
  const tile = cn(
    "group relative grid gap-4 border p-5 shadow-[var(--highlight-top)] transition-colors",
    "rounded-se-lg rounded-ee-lg rounded-es-lg", // square start-top corner: the tab sits there
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple",
    lesson
      ? "border-brand-purple bg-[linear-gradient(160deg,color-mix(in_oklab,var(--brand-purple)_22%,var(--bg-raised)),var(--bg-raised)_70%)]"
      : "border-border-strong bg-bg-raised hover:border-brand-purple/60",
  );
  const name = t(copy.name, { title });

  if (lesson) {
    return (
      <LessonLink href={`/lessons/${file.id}`} aria-label={name} className={tile} data-testid="lesson-open">
        {body}
      </LessonLink>
    );
  }
  return (
    <a href={`/api/files/${file.id}`} aria-label={name} className={tile} data-testid="file-download">
      {body}
    </a>
  );
}
