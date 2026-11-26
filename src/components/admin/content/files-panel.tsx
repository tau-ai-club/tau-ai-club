"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { dangerBtn, hintClass, inputClass, labelClass, panelClass, panelTitle, smallBtn } from "@/components/admin/styles";
import { FilePicker } from "@/components/admin/file-picker";
import { deleteEventFile, setFileCategory, setFileStatus, uploadEventFile } from "@/app/[locale]/admin/content/actions";
import { defaultMaterial, fileFormat, materialMismatch, materialOf, type EventFile, type FileFormat, type MaterialKind } from "@/lib/content/sections";
import { isDirectFormat } from "@/lib/content/upload";
import { directUpload } from "./direct-upload";
import { MaterialIcon } from "./material-icon";
import { MaterialPicker, useMaterialLabel } from "./material-picker";
import { cn } from "@/lib/utils";

/** The event's files in the private bucket (PDFs and interactive HTML lessons): upload one at a time, then show/hide or delete. */
export function FilesPanel({ eventId, files }: { eventId: string; files: Required<EventFile>[] }) {
  const t = useTranslations("content");
  const label = useMaterialLabel();
  // "סוג הקובץ" (26.11) shows once a file is chosen, preselected from it: HTML is a game, a PDF a summary.
  const [picked, setPicked] = useState<FileFormat | null>(null);
  const [material, setMaterial] = useState<MaterialKind>("summary");
  // Whenever the form resets (React resets it after each upload attempt), the chosen file is gone, so
  // the choice goes too. "reset" doesn't bubble: listen while it passes down (capture).
  const formBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = formBox.current;
    const clear = () => setPicked(null);
    el?.addEventListener("reset", clear, true);
    return () => el?.removeEventListener("reset", clear, true);
  }, []);
  // PDFs and decks (≤ 25 MB) skip the Server Action and go straight to Storage (direct-upload.ts);
  // HTML lessons go through the form's action as before. Caught on the way down (capture), before
  // React's form action, which skips a submit whose default was prevented.
  const [direct, setDirect] = useState<{ busy: boolean; pct: number; ok: boolean; message: string } | null>(null);
  useEffect(() => {
    const el = formBox.current;
    if (!el) return;
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const file = (form.elements.namedItem("file") as HTMLInputElement | null)?.files?.[0];
      if (!file || !isDirectFormat(fileFormat(file.name))) return;
      e.preventDefault();
      const fd = new FormData(form);
      setDirect({ busy: true, pct: 0, ok: true, message: "" });
      void directUpload(
        { eventId, file, material: String(fd.get("material") ?? ""), title: String(fd.get("title") ?? "") },
        { tooBig: t("fileErrorSizeDirect"), failed: t("errorFailed"), interrupted: t("fileErrorUpload") },
        (pct) => setDirect((d) => (d ? { ...d, pct } : d)),
      ).then((r) => {
        setDirect({ busy: false, pct: 0, ok: r.ok, message: r.message });
        if (r.ok) form.reset();
      });
    };
    el.addEventListener("submit", onSubmit, true);
    return () => el.removeEventListener("submit", onSubmit, true);
  }, [eventId, t]);
  // A pick that doesn't fit the file: the picker says why, and the button waits for a fitting pick.
  const uploadMismatch = picked ? materialMismatch(material, picked) : null;
  return (
    <section aria-labelledby="files-title" className={cn(panelClass, "grid gap-4 p-5 sm:p-6")} data-testid="files-panel">
      <div className="grid gap-1">
        <h2 id="files-title" className={panelTitle}>
          {t("filesTitle")}
        </h2>
        <p className={hintClass}>{t("filesBody")}</p>
      </div>

      {/* One simple form, used once per file (24.11): pick a PDF or an HTML lesson, give it a title, upload. */}
      <div ref={formBox}>
        <ActionForm action={uploadEventFile} resetOnSuccess className="grid gap-3">
          <input type="hidden" name="event_id" value={eventId} />
          <label
            className={labelClass}
            onChange={(e) => {
              const input = e.target as unknown as HTMLInputElement;
              if (input.name !== "file") return;
              const name = input.files?.[0]?.name ?? "";
              setPicked(name ? fileFormat(name) : null);
              setMaterial(defaultMaterial(name));
            }}
          >
            {t("fileChoose")}
            <FilePicker name="file" accept="application/pdf,.pdf,text/html,.html,.htm,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx" required />
          </label>
          {picked && <MaterialPicker value={material} onChange={setMaterial} file={picked} legend={t("fileCategory")} testId="file-category" />}
          <label className={labelClass}>
            {t("fileTitle")}
            <input name="title" dir="auto" maxLength={200} className={inputClass} />
            <span className={hintClass}>{t("fileTitleHint")}</span>
          </label>
          <button type="submit" disabled={uploadMismatch !== null || direct?.busy === true} className="btn btn-primary h-11 w-full px-4 disabled:opacity-50 sm:w-fit">
            {t("fileUpload")}
          </button>
        </ActionForm>
        {direct && (direct.busy || direct.message) && (
          <p
            role={direct.busy || direct.ok ? "status" : "alert"}
            className={cn("mt-3 text-sm", direct.busy || direct.ok ? "text-fg-muted" : "text-destructive")}
            data-testid="direct-upload-status"
          >
            {direct.busy ? (
              <>
                {t("fileUploading")} <bdi dir="ltr">{direct.pct}%</bdi>
              </>
            ) : (
              direct.message
            )}
          </p>
        )}
      </div>

      <div className="grid gap-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-fg">{t("filesUploaded")}</h3>
        {files.length === 0 ? (
          <p className="text-sm text-fg-subtle">{t("fileNone")}</p>
        ) : (
          <ul className="grid gap-2">
            {files.map((f) => (
              <li key={f.id} data-testid="event-file" data-kind={f.kind} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <span className="flex min-w-0 items-center gap-2">
                  <MaterialIcon kind={materialOf(f)} className="size-5" />
                  <span className="grid min-w-0">
                    <span className="truncate text-fg">{f.title_he}</span>
                    <bdi dir="ltr" className="truncate font-mono text-xs text-fg-subtle">
                      {f.path}
                    </bdi>
                  </span>
                  <Tag>{label(materialOf(f))}</Tag>
                  <Tag tone={f.status === "published" ? "next" : "neutral"}>{t(f.status === "published" ? "fileShown" : "fileHidden")}</Tag>
                </span>
                <span className="flex flex-wrap gap-2">
                  {f.kind === "lesson" && f.status === "published" && (
                    <Link href={`/lessons/${f.id}`} className={smallBtn} data-testid="lesson-preview">
                      {t("filePreview")}
                    </Link>
                  )}
                  <ActionForm action={setFileStatus}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="event_id" value={eventId} />
                    <input type="hidden" name="status" value={f.status === "published" ? "draft" : "published"} />
                    <button type="submit" className={smallBtn}>
                      {t(f.status === "published" ? "fileUnpublish" : "filePublish")}
                    </button>
                  </ActionForm>
                  <ActionForm action={deleteEventFile} confirmText={t("fileDeleteConfirm")}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="event_id" value={eventId} />
                    <button type="submit" className={dangerBtn}>
                      {t("fileDelete")}
                    </button>
                  </ActionForm>
                </span>
                <FileKindChange file={f} eventId={eventId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Status tag (same look as the public tags; event-bits is server-only). */
function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "next" | "neutral" }) {
  return <span className={cn("tag", tone === "next" && "tag-next")}>{children}</span>;
}

/**
 * Change a file's kind later (26.11), folded away under its row: the same picker as the upload form.
 * A pick that doesn't fit the file says so and the server refuses it; nothing is fixed silently.
 */
function FileKindChange({ file, eventId }: { file: Required<EventFile>; eventId: string }) {
  const t = useTranslations("content");
  const current = materialOf(file);
  const [value, setValue] = useState<MaterialKind>(current);
  return (
    <details className="basis-full" data-testid="file-kind-change">
      <summary className="cursor-pointer text-sm text-brand-purple-soft">{t("fileKindChange")}</summary>
      <ActionForm action={setFileCategory} stayOpen className="mt-3 grid gap-3">
        <input type="hidden" name="id" value={file.id} />
        <input type="hidden" name="event_id" value={eventId} />
        <MaterialPicker
          value={value}
          onChange={setValue}
          file={fileFormat(file.path)}
          legend={t("fileCategory")}
          testId="file-kind-picker"
        />
        <button
          type="submit"
          className={cn(smallBtn, "w-fit disabled:opacity-50")}
          disabled={value === current || materialMismatch(value, fileFormat(file.path)) !== null}
          data-testid="file-kind-save"
        >
          {t("fileKindSave")}
        </button>
      </ActionForm>
    </details>
  );
}
