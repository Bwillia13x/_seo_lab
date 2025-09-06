"use client";
import React, { useEffect } from "react";
import Link from "next/link";

export function HelpOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
      // Keyboard shortcuts: '/' focus search, g d / g h
      if (!open) {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        const isForm = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as any)?.isContentEditable;
        if (!isForm && e.key === '/') {
          e.preventDefault();
          const input = document.getElementById('header-search') as HTMLInputElement | null;
          input?.focus();
        }
        // g d (Dashboard), g h (Home)
        const now = Date.now();
        (window as any).__lastKeyAt = (window as any).__lastKeyAt || 0;
        (window as any).__lastKey = (window as any).__lastKey || '';
        const delta = now - (window as any).__lastKeyAt;
        if (e.key.toLowerCase() === 'g') {
          (window as any).__lastKey = 'g';
          (window as any).__lastKeyAt = now;
        } else if (delta < 800 && (window as any).__lastKey === 'g') {
          if (e.key.toLowerCase() === 'd') {
            window.location.href = '/apps/dashboard';
          } else if (e.key.toLowerCase() === 'h') {
            window.location.href = '/';
          }
          (window as any).__lastKey = '';
          (window as any).__lastKeyAt = 0;
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => onOpenChange(false)}>
      <div className="mx-auto mt-24 w-[92vw] max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-lg border bg-background shadow-xl overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Shortcuts & Tips</h2>
          </div>
          <div className="p-4 grid grid-cols-1 gap-2 text-sm">
            <div><span className="font-mono">Ctrl/Cmd + K</span> — Command palette</div>
            <div><span className="font-mono">/</span> — Focus search</div>
            <div><span className="font-mono">g d</span> — Go to Dashboard</div>
            <div><span className="font-mono">g h</span> — Go Home</div>
            <div><span className="font-mono">?</span> — Toggle this help</div>
            <div className="mt-2 text-muted-foreground">Toggle Simple/Advanced for a guided vs. full-featured experience. Use compact density (Aa icon) to see more data at once.</div>
            <div className="mt-1 space-x-2">
              <span>Quick links:</span>
              <Link href="/status" className="underline">Status</Link>
              <Link href="/guide/trial" className="underline">Trial Guide</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
