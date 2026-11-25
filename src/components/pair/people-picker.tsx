"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { MemberAvatar, smallBtn, cn } from "@/components/pair/site-ui";

export type PickerPerson = { id: string; name: string; photoSrc: string | null; luma: boolean; checked: boolean };

/**
 * pAIr's "who is coming?" grid: one tick per member, plus "everyone" / "clear". Plain checkboxes
 * named `member`, so the form works without JS; the counter and the two buttons need JS.
 */
export function PeoplePicker({
  people,
  disabled,
  labels,
}: {
  people: PickerPerson[];
  disabled: boolean;
  labels: { all: string; none: string; count: string; luma: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(people.filter((p) => p.checked).length);
  const setAll = (on: boolean) => {
    ref.current?.querySelectorAll<HTMLInputElement>("input[name=member]").forEach((i) => (i.checked = on));
    setCount(on ? people.length : 0);
  };
  return (
    <div className="grid gap-3" ref={ref}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted" aria-live="polite">
          {labels.count.replace("{n}", String(count))}
        </p>
        {!disabled && (
          <div className="flex gap-2">
            <button type="button" className={smallBtn} onClick={() => setAll(true)}>
              {labels.all}
            </button>
            <button type="button" className={smallBtn} onClick={() => setAll(false)}>
              {labels.none}
            </button>
          </div>
        )}
      </div>
      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(12rem,1fr))]">
        {people.map((p) => (
          <li key={p.id}>
            <label
              className={cn(
                "group flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-bg-deep/45 px-2.5 py-2 transition-colors duration-150 hover:border-border-strong",
                "has-[:checked]:border-brand-purple has-[:checked]:bg-brand-purple/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-purple",
                disabled && "cursor-not-allowed opacity-70",
              )}
            >
              <input
                type="checkbox"
                name="member"
                value={p.id}
                defaultChecked={p.checked}
                disabled={disabled}
                className="peer sr-only"
                onChange={(e) => {
                  // Read the box now: React runs the updater later, when e.currentTarget is already null.
                  const on = e.currentTarget.checked;
                  setCount((n) => n + (on ? 1 : -1));
                }}
              />
              <MemberAvatar name={p.name} src={p.photoSrc} size={32} />
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-sm font-medium text-fg">{p.name}</span>
                {p.luma && <span className="text-xs text-fg-subtle">{labels.luma}</span>}
              </span>
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-sm border border-border-strong text-transparent peer-checked:border-brand-purple peer-checked:bg-brand-purple peer-checked:text-on-purple"
              >
                <Check className="size-3.5" />
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
