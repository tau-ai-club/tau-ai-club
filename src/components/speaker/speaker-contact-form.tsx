"use client";

import { useActionState, useState } from "react";
import { CircleCheck, Link2, Mail, Phone, ShieldCheck } from "lucide-react";
import type { ActionState, FormAction } from "@/components/admin/action-form";
import { inputClass, labelClass } from "@/components/admin/styles";
import { cn } from "@/lib/utils";

type Labels = {
  shareEmail: string;
  sharePhone: string;
  shareLinkedin: string;
  linkedinPublic: string;
  email: string;
  phone: string;
  linkedin: string;
  linkedinHint: string;
  membersOnlyNote: string;
  visibleMembers: string;
  consent: string;
  submit: string;
  doneTitle: string;
  doneBody: string;
};

type Key = "email" | "phone" | "linkedin";
const ICONS = { email: Mail, phone: Phone, linkedin: Link2 } as const;

/**
 * Per-field consent: every box starts unticked, a field's input only turns on once its
 * box is ticked, and nothing is sent without the explicit consent box. Each choice is a
 * card that lights up when ticked, so what will be shared is visible at a glance.
 */
export function SpeakerContactForm({ action, token, labels }: { action: FormAction; token: string; labels: Labels }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const [share, setShare] = useState({ email: false, phone: false, linkedin: false });

  if (state?.ok) {
    return (
      <div role="status" data-testid="speaker-form-done" className="flex items-start gap-3.5 border border-border-accent bg-surface p-5">
        <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-brand-purple-soft" />
        <div className="grid gap-1">
          <p className="text-lg font-semibold text-fg">{labels.doneTitle}</p>
          <p className="text-fg-muted">{labels.doneBody}</p>
        </div>
      </div>
    );
  }

  const field = (
    key: Key,
    shareLabel: string,
    inputLabel: string,
    input: React.InputHTMLAttributes<HTMLInputElement>,
    extra?: React.ReactNode,
  ) => {
    const Icon = ICONS[key];
    const on = share[key];
    return (
      <fieldset
        className={cn(
          "grid gap-3 rounded-[3px] border p-4 transition-colors duration-200 sm:p-5",
          on ? "border-border-accent bg-surface" : "border-border bg-bg-deep/30",
        )}
      >
        <legend className="sr-only">{inputLabel}</legend>
        <label className="flex cursor-pointer items-start gap-3 font-medium text-fg">
          <input
            type="checkbox"
            name={`share_${key}`}
            checked={on}
            onChange={(e) => setShare((s) => ({ ...s, [key]: e.target.checked }))}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand-purple"
          />
          <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", on ? "text-brand-purple-soft" : "text-fg-subtle")} />
          <span>{shareLabel}</span>
        </label>
        <div className="grid gap-3 ps-8">
          <label className={labelClass}>
            {inputLabel}
            <input name={key} dir="ltr" disabled={!on} required={on} className={`${inputClass} text-start`} {...input} />
          </label>
          {extra}
          {key !== "linkedin" && <p className="text-xs text-fg-subtle">{labels.visibleMembers}</p>}
        </div>
      </fieldset>
    );
  };

  return (
    <form action={formAction} aria-busy={pending} className="grid gap-3" noValidate={false}>
      <input type="hidden" name="token" value={token} />
      {field("email", labels.shareEmail, labels.email, { type: "email", autoComplete: "email", maxLength: 254 })}
      {field("phone", labels.sharePhone, labels.phone, { type: "tel", autoComplete: "tel", maxLength: 30 })}
      {field(
        "linkedin",
        labels.shareLinkedin,
        labels.linkedin,
        { type: "url", autoComplete: "url", maxLength: 200, placeholder: labels.linkedinHint, "aria-describedby": "li-hint" },
        <label className={cn("flex items-start gap-3 text-sm", share.linkedin ? "cursor-pointer text-fg-muted" : "text-fg-subtle")}>
          <input
            type="checkbox"
            name="linkedin_public"
            disabled={!share.linkedin}
            className="mt-0.5 size-4 shrink-0 accent-brand-purple disabled:cursor-not-allowed"
          />
          {labels.linkedinPublic}
        </label>,
      )}

      <p id="li-hint" className="mt-2 flex items-start gap-2.5 text-sm text-fg-muted">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-purple-soft" />
        {labels.membersOnlyNote}
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-[3px] border border-border-accent bg-brand-purple-deeper/25 p-4 text-[0.9375rem] leading-relaxed text-fg sm:p-5">
        <input type="checkbox" name="consent" required className="mt-1 size-5 shrink-0 cursor-pointer accent-brand-purple" />
        {labels.consent}
      </label>

      {state && !state.ok && (
        <p role="alert" className="rounded-[3px] border border-destructive/50 bg-destructive/10 px-3.5 py-3 text-[0.9375rem] text-fg">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary mt-2 w-full sm:w-fit sm:px-8">
        {labels.submit}
      </button>
    </form>
  );
}
