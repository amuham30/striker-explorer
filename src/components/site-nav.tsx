"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TableProperties, Scale, Trophy, Circle, TrendingUp } from "lucide-react";

const LINKS = [
  { href: "/", label: "Browse", Icon: TableProperties },
  { href: "/compare", label: "Compare", Icon: Scale },
  { href: "/value-map", label: "Value Map", Icon: TrendingUp },
  { href: "/ballondor", label: "Ballon d'Or", Icon: Trophy },
  { href: "/barca", label: "Barça Fit", Icon: Circle, blaugrana: true },
];

/** Shared app navigation — tokenized, active-state aware, AA contrast. */
export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="flex w-fit items-center gap-1 rounded-xl border border-line bg-panel p-1 text-sm"
    >
      {LINKS.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 transition-colors duration-150 ${
              active
                ? "bg-gold/15 font-medium text-gold"
                : "text-ink-dim hover:bg-panel-2 hover:text-ink"
            }`}
          >
            <span aria-hidden="true" className="mr-1.5 inline-flex items-center">
              {l.blaugrana ? (
                <span className="flex items-center -space-x-1">
                  <Circle size={10} className="fill-[#004d98] text-[#004d98]" />
                  <Circle size={10} className="fill-[#a50044] text-[#a50044]" />
                </span>
              ) : (
                <l.Icon size={14} aria-hidden="true" />
              )}
            </span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Consistent page header block. Nav lives in the sticky app bar (layout.tsx)
    so it never moves between routes — spatial memory stays intact. */
export function PageHeader({
  kicker,
  title,
  lead,
}: {
  kicker?: string;
  title: string;
  lead?: React.ReactNode;
}) {
  return (
    <header className="mb-8 animate-rise">
      {kicker && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/90">
          {kicker}
        </p>
      )}
      <h1 className="mt-1 font-display text-4xl font-semibold uppercase tracking-wide text-ink md:text-5xl">
        {title}
      </h1>
      {lead && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-dim">
          {lead}
        </p>
      )}
    </header>
  );
}