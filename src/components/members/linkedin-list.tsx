"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Check } from "lucide-react";
import { MemberAvatar } from "@/components/members/member-avatar";
import { cn } from "@/lib/utils";

export type LinkedinRow = { id: string; full_name: string; subline: string; photo: string | null; linkedin: string };

/**
 * The "Connect on LinkedIn" list (25.11). LinkedIn has no allowed way to send requests for you,
 * so this makes doing it by hand quick: open a profile in a new tab, connect there, mark it done.
 * The marks are this viewer's own and stay in this browser (localStorage, keyed by member id):
 * nothing about who connected with whom is sent anywhere or stored on the server.
 */
export function LinkedinList({ viewerId, rows }: { viewerId: string; rows: LinkedinRow[] }) {
  const t = useTranslations("directory");
  const key = `tau-linkedin-done:${viewerId}`;
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      // Loading saved marks after hydration (localStorage isn't readable on the server).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setDone(saved.filter((x): x is string => typeof x === "string"));
    } catch {
      // No storage (private window, blocked): the list still works, marks just aren't kept.
    }
  }, [key]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const ids = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const count = done.filter((id) => ids.has(id)).length;
  const pct = rows.length ? Math.round((count / rows.length) * 100) : 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2" data-testid="linkedin-progress">
        <p className="text-sm text-fg-muted" aria-live="polite">
          {t.rich("linkedinProgress", { done: count, total: rows.length, b: (c) => <bdi className="font-semibold text-fg">{c}</bdi> })}
        </p>
        <div
          role="progressbar"
          aria-label={t("linkedinProgressLabel")}
          aria-valuemin={0}
          aria-valuemax={rows.length}
          aria-valuenow={count}
          className="h-2 overflow-hidden rounded-full border border-border bg-bg-deep"
        >
          <div className="h-full rounded-full bg-brand-purple transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="grid gap-2.5" data-testid="linkedin-list">
        {rows.map((m) => {
          const isDone = done.includes(m.id);
          const boxId = `li-done-${m.id}`;
          return (
            <li
              key={m.id}
              data-testid="linkedin-row"
              data-done={isDone ? "true" : "false"}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border bg-bg-raised p-3.5 transition-opacity duration-200 sm:flex-nowrap sm:p-4",
                isDone ? "border-border opacity-55" : "border-brand-purple/40",
              )}
            >
              <div className="flex min-w-0 flex-1 basis-56 items-center gap-3.5">
                <MemberAvatar name={m.full_name} src={m.photo} size={44} />
                <div className="grid min-w-0 gap-0.5">
                  <span className={cn("font-semibold break-words text-fg", isDone && "line-through decoration-fg-subtle")}>
                    <bdi>{m.full_name}</bdi>
                  </span>
                  {m.subline && <span className="text-sm break-words text-fg-subtle">{m.subline}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 ms-auto">
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={cn("btn h-10 px-4 text-sm", isDone ? "btn-ghost" : "btn-primary")}
                  data-testid="linkedin-open"
                >
                  {t("linkedinOpen")}
                  <ArrowUpRight aria-hidden className="rtl:-scale-x-100" />
                  <span className="sr-only">{t("linkedinOpenSr", { name: m.full_name })}</span>
                </a>
                <label
                  htmlFor={boxId}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm text-fg-muted has-[:checked]:border-brand-purple/60 has-[:checked]:text-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-purple"
                >
                  <input id={boxId} type="checkbox" className="peer sr-only" checked={isDone} onChange={() => toggle(m.id)} data-testid="linkedin-done" />
                  <span aria-hidden className="flex size-4 items-center justify-center rounded border border-border-strong peer-checked:border-brand-purple peer-checked:bg-brand-purple">
                    {isDone && <Check className="size-3 text-fg" />}
                  </span>
                  {isDone ? t("linkedinDone") : t("linkedinMark")}
                  <span className="sr-only">: {m.full_name}</span>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-fg-subtle">{t("linkedinLocalNote")}</p>
    </div>
  );
}
