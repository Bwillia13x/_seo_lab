"use client";

import { Sidebar } from "./Sidebar";
import Link from "next/link";
import { Search, Sun, MoonStar } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setDark(isDark);
    }
  }, []);
  function toggleTheme() {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  }
  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
            <Link
              href="/"
              className="font-semibold tracking-tight text-sm md:text-base"
            >
              Belmont SEO Lab
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search tools…"
                  className="h-9 w-[260px] pl-8 pr-3 rounded-md border bg-background/60"
                />
              </div>
              <button
                aria-label="Toggle theme"
                className="h-9 w-9 inline-flex items-center justify-center rounded-md border hover:bg-accent"
                onClick={toggleTheme}
              >
                {dark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <MoonStar className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
