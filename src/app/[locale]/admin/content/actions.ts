"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { adminClient, getViewer } from "@/lib/auth/viewer";
import { revalidatePublicContent, str } from "@/lib/admin/content";
import { CONTENT_SECTIONS, defaultMaterial, fileFormat, isMaterialKind, materialMismatch, type ContentSection, type FileCategory, type FileFormat, type MaterialKind } from "@/lib/content/sections";
import { readLessonUpload } from "@/lib/content/lesson";
import { randomUUID } from "node:crypto";
import { MAX_ACTION_BYTES, MAX_DIRECT_BYTES, STAGED_PREFIX, checkFileBytes, contentTypeFor, isDirectFormat, stagedFormat, stagedPath, storageName } from "@/lib/content/upload";
import type { ActionState } from "@/components/admin/action-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 60000;

function refresh(eventId: string) {
  revalidatePublicContent();
  revalidatePath(`/[locale]/admin/content/${eventId}`, "page");
}

/** Create or update one section of an event (Markdown he/en, audience, draft/published). */
export async function saveSection(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  const t = await getTranslations("content");
  const viewer = await getViewer();

  const eventId = str(fd, "event_id");
  const section = str(fd, "section") as ContentSection;
  if (!UUID.test(eventId) || !(CONTENT_SECTIONS as readonly string[]).includes(section)) return { ok: false, message: t("errorFailed") };
  // Keep the text exactly as written (no trim inside), but treat whitespace-only as empty.
  const raw = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v.replace(/\r\n/g, "\n") : "";
  };
  const bodyHe = raw("body_he").trim() ? raw("body_he").trimEnd() : "";
  const bodyEn = raw("body_en").trim() ? raw("body_en").trimEnd() : null;
  if (bodyHe.length > MAX_BODY || (bodyEn?.length ?? 0) > MAX_BODY) return { ok: false, message: t("errorTooLong") };

  const { error } = await supabase.from("event_content").upsert(
    {
      event_id: eventId,
      section,
      body_he: bodyHe,
      body_en: bodyEn,
      visibility: str(fd, "visibility") === "public" ? "public" : "members",
      status: str(fd, "status") === "published" ? "published" : "draft",
      updated_by: viewer.kind === "member" ? viewer.member.id : null,
    },
    { onConflict: "event_id,section" },
  );
  if (error) {
    console.error("[content] save failed", error.code);
    return { ok: false, message: t("errorFailed") };
  }
  refresh(eventId);
  return { ok: true, message: t("saved") };
}

/**
 * Upload a PDF, or an interactive HTML lesson, to the private `event-files` bucket and list it for
 * members (published). A lesson is stored as text/plain, so Storage never serves it as a page;
 * members open it through /api/lessons/<id>, inside a sandbox (src/lib/content/lesson.ts).
 */
export async function uploadEventFile(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  const t = await getTranslations("content");

  const eventId = str(fd, "event_id");
  const file = fd.get("file");
  if (!UUID.test(eventId) || !(file instanceof File) || file.size === 0) return { ok: false, message: t("fileErrorType") };
  if (file.size > MAX_ACTION_BYTES) return { ok: false, message: t("fileErrorSize") };
  const bytes = new Uint8Array(await file.arrayBuffer());
  let ext: FileFormat;
  let body: Uint8Array = bytes;
  if (/\.pptx$/i.test(file.name)) {
    // The lecturer's slides as PowerPoint (26.11): a real presentation, without macros or embedded programs.
    const deck = checkFileBytes("pptx", bytes);
    if (!deck.ok) return { ok: false, message: t(deck.reason === "unsafe" ? "fileErrorPptxUnsafe" : "fileErrorType") };
    ext = "pptx";
  } else if (/\.pdf$/i.test(file.name)) {
    // A real PDF starts with "%PDF-", whatever the browser says the type is.
    if (!checkFileBytes("pdf", bytes).ok) return { ok: false, message: t("fileErrorType") };
    ext = "pdf";
  } else {
    const lesson = readLessonUpload(file.name, bytes);
    if (!lesson.ok) return { ok: false, message: t(lesson.reason === "size" ? "fileErrorSize" : "fileErrorType") };
    ext = "html";
    body = new TextEncoder().encode(lesson.html);
  }
  // What the uploader says it is (26.11). No pick (an older form) means the file's default.
  const picked = str(fd, "material");
  const material = isMaterialKind(picked) ? picked : defaultMaterial(`x.${ext}`);
  const mismatch = materialMismatch(material, ext);
  if (mismatch) return { ok: false, message: t(mismatch) };

  // One "title" field (24.11: one simple upload form), used for both languages. The older per-language
  // fields still win when a form sends them.
  const title = (k: string) => (str(fd, k) || str(fd, "title")).slice(0, 200) || file.name.slice(0, 200);
  return storeEventFile(supabase, t, { eventId, fileName: file.name, ext, body, material, titleHe: title("title_he"), titleEn: title("title_en") });
}

type Supabase = Awaited<ReturnType<typeof adminClient>>;
type Translate = Awaited<ReturnType<typeof getTranslations<"content">>>;

/** Store checked bytes under the file's final name and list it for members (published). */
async function storeEventFile(
  supabase: Supabase,
  t: Translate,
  f: { eventId: string; fileName: string; ext: FileFormat; body: Uint8Array; material: MaterialKind; titleHe: string; titleEn: string },
): Promise<ActionState> {
  const { data: event } = await supabase.from("events").select("slug").eq("id", f.eventId).maybeSingle();
  if (!event) return { ok: false, message: t("errorFailed") };
  const path = storageName(event.slug, f.fileName, f.ext);
  const up = await supabase.storage.from("event-files").upload(path, f.body, { contentType: contentTypeFor(f.ext), upsert: true });
  if (up.error) {
    console.error("[content] upload failed", up.error.message);
    return { ok: false, message: t("errorFailed") };
  }
  // A game is the HTML itself (kind 'lesson'); its category column stays the default.
  const category: FileCategory = f.material === "game" ? "summary" : f.material;
  const { error } = await supabase
    .from("event_files")
    .upsert({ event_id: f.eventId, path, title_he: f.titleHe, title_en: f.titleEn, status: "published", category }, { onConflict: "path" });
  if (error) {
    console.error("[content] file row failed", error.code);
    return { ok: false, message: t("errorFailed") };
  }
  refresh(f.eventId);
  return { ok: true, message: t("fileUploaded") };
}

/** Staged uploads nobody finished (closed tab, failed check), older than a day: best effort, never blocks. */
async function sweepStaged(supabase: Supabase) {
  const { data } = await supabase.storage.from("event-files").list(STAGED_PREFIX.slice(0, -1), { limit: 100 });
  const old = (data ?? []).filter((o) => o.created_at && Date.now() - Date.parse(o.created_at) > 24 * 3600 * 1000).map((o) => STAGED_PREFIX + o.name);
  if (old.length) await supabase.storage.from("event-files").remove(old);
}

export type DirectStart = { ok: true; url: string; staged: string; contentType: string } | { ok: false; message: string };

/**
 * Step 1 of a PDF or PowerPoint upload (≤ 25 MB, see src/lib/content/upload.ts): checks what the admin
 * says they're uploading, then issues a one-time signed upload URL for a fresh staged object.
 */
export async function startDirectUpload(input: { event_id: string; name: string; size: number; material: string }): Promise<DirectStart> {
  const supabase = await adminClient();
  const t = await getTranslations("content");
  const ext = fileFormat(String(input?.name ?? ""));
  if (!UUID.test(String(input?.event_id)) || !isDirectFormat(ext) || !/\.(pdf|pptx)$/i.test(String(input.name))) return { ok: false, message: t("fileErrorType") };
  const size = Number(input.size);
  if (!Number.isFinite(size) || size <= 0) return { ok: false, message: t("fileErrorType") };
  if (size > MAX_DIRECT_BYTES) return { ok: false, message: t("fileErrorSizeDirect") };
  const material = isMaterialKind(input.material) ? input.material : defaultMaterial(input.name);
  const mismatch = materialMismatch(material, ext);
  if (mismatch) return { ok: false, message: t(mismatch) };
  const { data: event } = await supabase.from("events").select("id").eq("id", input.event_id).maybeSingle();
  if (!event) return { ok: false, message: t("errorFailed") };
  await sweepStaged(supabase).catch(() => {});
  const staged = stagedPath(randomUUID(), ext);
  const { data, error } = await supabase.storage.from("event-files").createSignedUploadUrl(staged);
  if (error || !data?.signedUrl) {
    console.error("[content] signed upload failed", error?.message);
    return { ok: false, message: t("errorFailed") };
  }
  return { ok: true, url: data.signedUrl, staged, contentType: contentTypeFor(ext) };
}

/**
 * Step 3: the browser has put the file at the staged path. Check the object itself on the server
 * (name, real size, real bytes) before it is stored under its final name and listed. The staged
 * object is removed whatever happens.
 */
export async function finishDirectUpload(input: { event_id: string; staged: string; name: string; title: string; material: string }): Promise<ActionState> {
  const supabase = await adminClient();
  const t = await getTranslations("content");
  const staged = String(input?.staged ?? "");
  const ext = stagedFormat(staged);
  const name = String(input?.name ?? "");
  if (!ext || !UUID.test(String(input?.event_id))) return { ok: false, message: t("errorFailed") };
  const drop = () => supabase.storage.from("event-files").remove([staged]);
  try {
    if (fileFormat(name) !== ext) return { ok: false, message: t("fileErrorType") };
    const material = isMaterialKind(input.material) ? input.material : defaultMaterial(name);
    const mismatch = materialMismatch(material, ext);
    if (mismatch) return { ok: false, message: t(mismatch) };
    const { data: blob, error } = await supabase.storage.from("event-files").download(staged);
    if (error || !blob) return { ok: false, message: t("errorFailed") };
    if (blob.size === 0) return { ok: false, message: t("fileErrorType") };
    if (blob.size > MAX_DIRECT_BYTES) return { ok: false, message: t("fileErrorSizeDirect") };
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const check = checkFileBytes(ext, bytes);
    if (!check.ok) return { ok: false, message: t(check.reason === "unsafe" ? "fileErrorPptxUnsafe" : "fileErrorType") };
    const title = String(input.title ?? "").trim().slice(0, 200) || name.slice(0, 200);
    return await storeEventFile(supabase, t, { eventId: input.event_id, fileName: name, ext, body: bytes, material, titleHe: title, titleEn: title });
  } finally {
    await drop();
  }
}

export async function setFileStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  const t = await getTranslations("content");
  const id = str(fd, "id");
  const eventId = str(fd, "event_id");
  if (!UUID.test(id) || !UUID.test(eventId)) return { ok: false, message: t("errorFailed") };
  const { error } = await supabase
    .from("event_files")
    .update({ status: str(fd, "status") === "published" ? "published" : "draft" })
    .eq("id", id);
  if (error) return { ok: false, message: t("errorFailed") };
  refresh(eventId);
  return { ok: true, message: t("saved") };
}

/** Change a file's kind from the files list, without uploading it again. A pick that doesn't fit the file is refused with a message. */
export async function setFileCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  const t = await getTranslations("content");
  const id = str(fd, "id");
  const eventId = str(fd, "event_id");
  const material = str(fd, "material");
  if (!UUID.test(id) || !UUID.test(eventId) || !isMaterialKind(material)) return { ok: false, message: t("errorFailed") };
  const { data: row } = await supabase.from("event_files").select("path").eq("id", id).maybeSingle();
  if (!row) return { ok: false, message: t("errorFailed") };
  const mismatch = materialMismatch(material, fileFormat(row.path));
  if (mismatch) return { ok: false, message: t(mismatch) };
  if (material === "game") return { ok: true, message: t("saved") }; // already a game: nothing to store
  const { error } = await supabase.from("event_files").update({ category: material }).eq("id", id).eq("kind", "pdf");
  if (error) return { ok: false, message: t("errorFailed") };
  refresh(eventId);
  return { ok: true, message: t("saved") };
}

export async function deleteEventFile(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  const t = await getTranslations("content");
  const id = str(fd, "id");
  const eventId = str(fd, "event_id");
  if (!UUID.test(id) || !UUID.test(eventId)) return { ok: false, message: t("errorFailed") };
  const { data: row } = await supabase.from("event_files").select("path").eq("id", id).maybeSingle();
  if (!row) return { ok: false, message: t("errorFailed") };
  // Row first: once it's gone, members can't sign the object even if the removal below fails.
  const { error } = await supabase.from("event_files").delete().eq("id", id);
  if (error) return { ok: false, message: t("errorFailed") };
  await supabase.storage.from("event-files").remove([row.path]);
  refresh(eventId);
  return { ok: true, message: t("saved") };
}
