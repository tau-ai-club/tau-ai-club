import { getTranslations } from "next-intl/server";
import { Link2, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The two views of the members area, side by side under the title: everyone, and "Connect on
 * LinkedIn" (25.11). Inside /members, not a new top-level nav item.
 */
export async function MembersViews({ current }: { current: "all" | "linkedin" }) {
  const t = await getTranslations("directory");
  const views = [
    { key: "all", href: "/members", label: t("viewAll"), Icon: Users },
    { key: "linkedin", href: "/members/linkedin", label: t("viewLinkedin"), Icon: Link2 },
  ] as const;
  return (
    <nav aria-label={t("viewsLabel")} data-testid="members-views">
      <ul className="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-border bg-bg-deep/50 p-1">
        {views.map(({ key, href, label, Icon }) => {
          const active = key === current;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                data-testid={`members-view-${key}`}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-md px-3.5 text-sm font-semibold transition-colors duration-150",
                  active ? "bg-brand-purple text-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
