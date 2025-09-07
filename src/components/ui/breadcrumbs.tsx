"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function prettify(segment: string) {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = (pathname || "/").split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const crumbs = [
    { href: "/", label: "Home" },
    ...parts.map((p, i) => ({
      href: "/" + parts.slice(0, i + 1).join("/"),
      label: prettify(p),
    })),
  ];
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      {crumbs.map((c, i) => (
        <span key={c.href}>
          {i > 0 && <span className="mx-1">/</span>}
          {i < crumbs.length - 1 ? (
            <Link href={c.href} className="hover:underline">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-foreground">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

