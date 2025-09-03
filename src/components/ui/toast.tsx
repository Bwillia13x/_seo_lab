"use client";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ToastDetail } from "@/lib/toast";

type T = { id: number; message: string; variant: ToastDetail['variant'] };

export function ToastProvider() {
  const [toasts, setToasts] = useState<T[]>([]);
  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<ToastDetail>;
      const id = Date.now() + Math.random();
      const t: T = { id, message: ce.detail?.message || "", variant: ce.detail?.variant || 'default' };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
    }
    window.addEventListener('belmont_toast', onToast as any);
    return () => window.removeEventListener('belmont_toast', onToast as any);
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] space-y-2 w-[92vw] max-w-md">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-md border px-4 py-2 shadow bg-background/95 backdrop-blur",
            t.variant === 'success' && 'border-green-300',
            t.variant === 'error' && 'border-red-300',
            t.variant === 'warn' && 'border-amber-300'
          )}
          role="status"
          aria-live="polite"
        >
          <span className="text-sm">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

