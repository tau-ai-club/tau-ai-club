"use client";

import { startTransition, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { memberNextEvent } from "./member-next-event-action";

// Same hint as the header's member links (src/components/site/member-nav.tsx): a non-HttpOnly
// `tau_member=1` cookie set at login. It only decides whether to ask; the server decides what to show.
const subscribe = () => () => {};
const hasMemberHint = () => /(?:^|;\s*)tau_member=1(?:;|$)/.test(document.cookie);

/**
 * The home page's slot for the members' Next event card (design review item 5).
 *
 * The server render, and every guest, gets `children` (what guests see today), so the cached
 * HTML holds no schedule. In a browser with the member hint, it asks the server once for the
 * card (`memberNextEvent`, which checks membership in the database) and shows it in place of
 * `children`. The card itself is server-rendered and has no entrance animation. A non-member,
 * an error, or no answer leaves `children` as they are. Guests send no request at all.
 */
export function MemberNextEvent({ children, pending }: { children?: ReactNode; pending?: ReactNode }) {
  const member = useSyncExternalStore(subscribe, hasMemberHint, () => false);
  const locale = useLocale();
  const [card, setCard] = useState<ReactNode>(null);
  // Set when the request has settled with no card (not a member, an error), so `pending`
  // gives the space back to `children`.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!member) return;
    let live = true;
    startTransition(async () => {
      try {
        const result = await memberNextEvent(locale);
        if (live && result) startTransition(() => setCard(result));
        else if (live) giveBack();
      } catch {
        // Keep the guest view.
        if (live) giveBack();
      }
    });
    return () => {
      live = false;
    };
    // No card after all (not a member, an error): drop the page's member mark, so the guest
    // layout (the honeycomb on wide screens, no placeholder) comes back.
    function giveBack() {
      delete document.documentElement.dataset.memberHint;
      setSettled(true);
    }
  }, [member, locale]);

  // Layout (design review item 5, part 2). The page marks <html data-member-hint> before its first
  // paint (MEMBER_HINT_SCRIPT in next-event-placeholder.tsx, from the same cookie), and CSS then shows `pending` in place of
  // `children`. So a member sees the card's frame from the first paint, and the card lands in it
  // without moving anything. The card has no entrance animation. Guests never see `pending`.
  if (card) return <div className="grid min-h-[37rem] lg:min-h-[38.75rem]">{card}</div>;
  if (!pending) return children;
  // Settled with no card: the same tree as while waiting, minus `pending`. Returning `children`
  // bare here would remount them, and a keyboard user who had already tabbed into them (e.g. the
  // hero's "meet the speakers" link) would lose focus to <body>.
  return (
    <>
      {children && <div className={settled ? "contents" : "contents [[data-member-hint]_&]:hidden"}>{children}</div>}
      {!settled && <div className="hidden [[data-member-hint]_&]:grid">{pending}</div>}
    </>
  );
}

