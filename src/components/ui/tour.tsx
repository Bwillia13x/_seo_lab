"use client";
import React, { useEffect, useState } from "react";

type Step = { title: string; body: string };

export function Tour({ id, steps }: { id: string; steps: Step[] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Do not auto-open in automated test environments
    const isWebDriver = (navigator as any)?.webdriver === true;
    if (isWebDriver) return;
    try {
      const seen = window.localStorage.getItem(`tour_${id}`);
      if (!seen) setOpen(true);
    } catch {}
  }, [id]);

  function close(done: boolean) {
    setOpen(false);
    try { window.localStorage.setItem(`tour_${id}`, done ? "done" : "skip"); } catch {}
  }

  if (!open || steps.length === 0) return null;
  const step = steps[Math.min(idx, steps.length - 1)];
  const isLast = idx >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => close(false)}>
      <div className="mx-auto mt-20 w-[92vw] max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-lg border bg-background shadow-xl overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold">Quick Tour</h2>
          </div>
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.body}</p>
          </div>
          <div className="p-3 flex items-center justify-between border-t text-sm">
            <button className="px-3 py-2 rounded-md border hover:bg-accent" onClick={() => close(false)}>Don’t show again</button>
            <div className="flex items-center gap-2">
              {idx > 0 && (
                <button className="px-3 py-2 rounded-md border hover:bg-accent" onClick={() => setIdx((i) => Math.max(0, i - 1))}>Back</button>
              )}
              {!isLast ? (
                <button className="px-3 py-2 rounded-md border hover:bg-accent" onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}>Next</button>
              ) : (
                <button className="px-3 py-2 rounded-md border hover:bg-accent" onClick={() => close(true)}>Done</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

