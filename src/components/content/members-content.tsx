"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, LockKeyhole } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { MembersContent } from "@/app/api/events/[slug]/content/route";
import { bodyFor, type ContentSection } from "@/lib/content/sections";
import { SectionBlock } from "./section-block";

type State = { phase: "loading" } | { phase: "error" } | { phase: "done"; data: MembersContent };

/**
 * The members-only part of a lecture page. The page is cached HTML that is the same for
 * everyone, so this text is fetched after load from a no-store endpoint that returns
 * nothing to guests (RLS decides). Guests see a sign-in prompt instead.
 */
export function MembersContent({ slug, order, path }: { slug: string; order: readonly ContentSection[]; path: string }) {
  const t = useTranslations("content");
  const locale = useLocale();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let live = true;
    fetch(`/api/events/${encodeURIComponent(slug)}/content`, { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<MembersContent>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => live && setState({ phase: "done", data }))
      .catch(() => live && setState({ phase: "error" }));
    return () => {
      live = false;
    };
  }, [slug]);

  if (state.phase === "loading") {
    return (
      <p role="status" className="text-fg-subtle" data-testid="members-content-loading">
        {t("loading")}
      </p>
    );
  }
  if (state.phase === "error") {
    return (
      <p role="alert" className="text-fg-muted">
        {t("loadError")}
      </p>
    );
  }

  const { data } = state;
  if (data.viewer !== "member") {
    return (
      <div className="grid gap-3 rounded-lg border border-border-accent bg-surface p-5 sm:p-6" data-testid="members-locked">
        <p className="flex items-center gap-2 font-semibold text-fg">
          <LockKeyhole aria-hidden className="size-4 shrink-0 text-brand-purple-soft" />
          {t("lockedTitle")}
        </p>
        <p className="max-w-[60ch] text-fg-muted">{data.viewer === "outsider" ? t("lockedOutsider") : t("lockedBody")}</p>
        {data.viewer === "guest" && (
          <Link href={{ pathname: "/login", query: { next: path } }} className="btn btn-primary w-full sm:w-fit">
            {t("lockedSignIn")}
          </Link>
        )}
      </div>
    );
  }

  const sections = order
    .map((s) => data.sections.find((x) => x.section === s))
    .filter((x): x is MembersContent["sections"][number] => Boolean(x && (x.body_he.trim() || x.body_en?.trim())));

  return (
    <div className="grid gap-10" data-testid="members-content">
      {sections.length === 0 && data.files.length === 0 && <p className="text-fg-subtle">{t("summaryComing")}</p>}
      {sections.map((s) => (
        <SectionBlock
          key={s.section}
          section={s.section}
          title={t(`section_${s.section}`)}
          body={bodyFor(s, locale)}
          hebrewOnly={{ label: t("hebrewOnly"), hint: t("hebrewOnlyHint") }}
        />
      ))}
      {data.files.length > 0 && (
        <section aria-labelledby="section-files" data-testid="section-files">
          <h2 id="section-files" className="text-2xl font-bold text-fg">
            {t("files")}
          </h2>
          <ul className="mt-4 grid gap-2">
            {data.files.map((f) => {
              const title = locale !== "he" ? f.title_en : f.title_he;
              return (
                <li key={f.id}>
                  {/* A plain link: the route answers with a short-lived signed URL. */}
                  <a href={`/api/files/${f.id}`} className="btn btn-ghost w-full justify-start sm:w-fit" data-testid="file-download">
                    <Download aria-hidden className="size-4" />
                    {t("download", { title })}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
