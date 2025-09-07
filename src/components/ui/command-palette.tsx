"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { navigationGroups } from "@/components/shell/Sidebar";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const commands = useMemo(() => {
    const items: { label: string; href: string; group: string }[] = [];
    for (const g of navigationGroups) {
      for (const it of g.items) items.push({ label: it.label, href: it.href, group: g.title });
    }
    return items;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 12);
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)).slice(0, 20);
  }, [commands, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm" aria-modal="true" role="dialog" onClick={() => onOpenChange(false)}>
      <div className="mx-auto mt-24 w-[92vw] max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-lg border bg-background shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <input
              autoFocus
              placeholder="Search tools… (Ctrl/Cmd+K)"
              className="w-full h-10 px-3 outline-none bg-transparent"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search commands"
            />
          </div>
          <ul className="max-h-80 overflow-auto py-2">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
            )}
            {filtered.map((c) => (
              <li key={c.href}>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => {
                    router.push(c.href);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{c.label}</span>
                    <span className="text-[11px] text-muted-foreground">{c.group}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

