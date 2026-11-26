"use client";

import { useTranslations } from "next-intl";
import { MATERIAL_KINDS, materialMismatch, type FileFormat, type MaterialKind } from "@/lib/content/sections";
import { MaterialIcon } from "./material-icon";

// The same names as the tiles' tabs, so the admin and the members see one word per kind.
const LABEL = { summary: "fileTabPdf", game: "fileTabLesson", slides: "fileTabSlides", resources: "fileTabResources" } as const;

/** The kind's label ("סיכום", "משחק", "מצגת המרצה", "חומר עזר"). */
export function useMaterialLabel() {
  const t = useTranslations("content");
  return (k: MaterialKind) => t(LABEL[k]);
}

/**
 * "סוג הקובץ" (26.11): the four kinds of event material, each with its icon, as radios named
 * "material". Used in the upload form and in each row of the files list. When the pick doesn't fit
 * the file, it says so right away (the server refuses it with the same words).
 */
export function MaterialPicker({
  value,
  onChange,
  file,
  legend,
  testId,
}: {
  value: MaterialKind;
  onChange: (k: MaterialKind) => void;
  /** What the file is; unknown (nothing picked yet) means no mismatch message. */
  file: FileFormat | null;
  legend: string;
  testId: string;
}) {
  const t = useTranslations("content");
  const label = useMaterialLabel();
  const mismatch = file ? materialMismatch(value, file) : null;
  return (
    <fieldset className="grid min-w-0 gap-2" data-testid={testId}>
      <legend className="mb-1.5 text-sm font-medium text-fg-muted">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {MATERIAL_KINDS.map((k) => (
          <label
            key={k}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm text-fg-muted has-[:checked]:border-brand-purple has-[:checked]:bg-brand-purple/10 has-[:checked]:text-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-purple"
          >
            <input type="radio" name="material" value={k} checked={value === k} onChange={() => onChange(k)} className="accent-brand-purple" />
            <MaterialIcon kind={k} />
            {label(k)}
          </label>
        ))}
      </div>
      {mismatch && (
        <p role="alert" className="text-sm text-destructive" data-testid="material-mismatch">
          {t(mismatch)}
        </p>
      )}
    </fieldset>
  );
}
