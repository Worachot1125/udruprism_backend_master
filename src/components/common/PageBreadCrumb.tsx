// src/components/common/PageBreadcrumb.tsx
import Link from "next/link";
import * as React from "react";

type Crumb = { label: string; href?: string };

type BreadcrumbProps = {
  /** e.g. "Management/Users" or "Management > Users" */
  pageTitle?: string;
  /** Provide explicit crumbs; supersedes pageTitle */
  items?: Crumb[];
  /** Show a "Home" crumb in front */
  showHome?: boolean;
  homeLabel?: string;
  homeHref?: string;
  /** Optional heading text displayed on the left; defaults to the last crumb */
  heading?: string;
  /** Max number of crumbs to show (middle will be collapsed with “…”). Set 0/undefined to disable. */
  maxCrumbs?: number;
};

const Chevron: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    className={`stroke-current ${props.className ?? ""}`}
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Split title on "/", ">", "»" (with optional spaces) */
function splitTitle(t: string): string[] {
  return t.split(/\s*[\/>»]\s*/).filter(Boolean);
}

/** Collapse middle crumbs if exceed max */
function collapseCrumbs(crumbs: Crumb[], max?: number): Crumb[] {
  if (!max || crumbs.length <= max) return crumbs;
  if (max < 3) return [crumbs[0], { label: "…" }, crumbs[crumbs.length - 1]];
  const keepEachSide = Math.floor((max - 1) / 2); // leave one slot for "…"
  const left = crumbs.slice(0, keepEachSide);
  const right = crumbs.slice(-keepEachSide);
  return [...left, { label: "…" }, ...right];
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({
  pageTitle,
  items,
  showHome = true,
  homeLabel = "Home",
  homeHref = "/",
  heading,
  maxCrumbs,
}) => {
  // Derive crumbs
  const derived: Crumb[] = React.useMemo(() => {
    if (Array.isArray(items) && items.length) return items;
    const t = (pageTitle ?? "").trim();
    if (!t) return [];
    return splitTitle(t).map((label) => ({ label }));
  }, [items, pageTitle]);

  const withHome: Crumb[] = showHome
    ? [{ label: homeLabel, href: homeHref }, ...derived]
    : derived;

  const crumbs = React.useMemo(
    () => collapseCrumbs(withHome, maxCrumbs),
    [withHome, maxCrumbs]
  );

  const lastIdx = crumbs.length - 1;
  const headingText =
    heading ?? (derived.length ? derived[derived.length - 1].label : pageTitle ?? "");

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="truncate text-xl font-semibold text-gray-800 dark:text-white/90" title={headingText}>
        {headingText}
      </h2>

      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5">
          {crumbs.map((c, idx) => {
            const isLast = idx === lastIdx;
            const isEllipsis = c.label === "…";
            const baseTextCls = "text-sm truncate";
            const linkCls =
              "inline-flex max-w-[180px] items-center gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300";
            const spanCls = isLast
              ? `inline-flex max-w-[200px] items-center gap-1.5 ${baseTextCls} text-gray-800 dark:text-white/90`
              : `inline-flex max-w-[180px] items-center gap-1.5 ${baseTextCls} text-gray-500 dark:text-gray-400`;

            // Ellipsis (collapsed)
            if (isEllipsis) {
              return (
                <li key={`ellipsis-${idx}`} className="flex items-center">
                  <span className="px-1 text-sm text-gray-400" aria-hidden>
                    …
                  </span>
                  {!isLast && <Chevron />}
                </li>
              );
            }

            return (
              <li key={`${c.href ?? c.label}-${idx}`} className="flex items-center gap-1.5">
                {c.href && !isLast ? (
                  <Link href={c.href} className={`${linkCls} ${baseTextCls}`} title={c.label}>
                    <span className="truncate">{c.label}</span>
                    <Chevron />
                  </Link>
                ) : (
                  <span
                    className={spanCls}
                    aria-current={isLast ? "page" : undefined}
                    title={c.label}
                  >
                    <span className="truncate">{c.label}</span>
                    {!isLast && <Chevron />}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
