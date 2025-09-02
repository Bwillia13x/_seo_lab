"use client";

import { Sidebar } from "./Sidebar";
import Link from "next/link";
import { Search, Sun, MoonStar, Phone, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import Image from "next/image";

export default function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [dark, setDark] = useState(false);
  const [simple, setSimple] = useState(false);
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setDark(isDark);
      const hasStored =
        typeof window !== "undefined" &&
        window.localStorage.getItem("belmont_simple_mode");
      const stored =
        typeof window !== "undefined" && hasStored ? String(hasStored) : null;
      const isSimple = stored ? stored === "1" : true; // default ON on first visit
      setSimple(isSimple);
      document.documentElement.classList.toggle("simple", isSimple);
      if (!stored) {
        try {
          window.localStorage.setItem("belmont_simple_mode", "1");
        } catch {}
      }
    }
  }, []);
  function toggleTheme() {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  }
  function toggleSimple() {
    if (typeof document === "undefined") return;
    setSimple((s) => {
      const next = !s;
      document.documentElement.classList.toggle("simple", next);
      try {
        window.localStorage.setItem("belmont_simple_mode", next ? "1" : "0");
      } catch {}
      return next;
    });
  }
  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr]">
      <Sidebar simple={simple} />
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 bg-[linear-gradient(180deg,hsla(268,100%,97%,0.8)_0%,hsla(0,0%,100%,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(35,31,57,0.6)_0%,rgba(0,0,0,0)_100%)]">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-sm md:text-base"
            >
              <Image
                src="/images/PRAIRIESIGNALLOGO.png"
                alt="Prairie Signal"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              Belmont SEO Lab
            </Link>
            <div className="ml-auto flex items-center gap-2 rounded-full bg-secondary/70 px-2 py-1">
              {/* Belmont Quick Actions */}
              <a
                href={BELMONT_CONSTANTS.PHONE_TEL}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border hover:bg-accent transition-colors"
                aria-label="Call for assistance"
              >
                <Phone className="h-3.5 w-3.5" />
                Assistance
              </a>
              <a
                href={BELMONT_CONSTANTS.MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border hover:bg-accent transition-colors"
                aria-label="Find The Belmont Barbershop on map"
              >
                <MapPin className="h-3.5 w-3.5" />
                Map
              </a>
              {!simple && (
                <div className="relative hidden md:block">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="Search tools…"
                    className="h-9 w-[200px] pl-8 pr-3 rounded-full border bg-background/60"
                  />
                </div>
              )}
              <button
                aria-label="Toggle Simple Mode"
                className="h-9 px-3 inline-flex items-center justify-center rounded-md border hover:bg-accent text-xs"
                onClick={toggleSimple}
                title="Simple Mode"
              >
                {simple ? "Simple On" : "Simple Off"}
              </button>
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
        {/* Floating Help Button */}
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex flex-col items-end gap-2">
            <a
              href="mailto:info@thebelmontbarber.ca"
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background/70 backdrop-blur hover:bg-accent transition-colors text-sm"
              aria-label="Email support"
            >
              <Image
                src="/images/PRAIRIESIGNALLOGO.png"
                alt="Prairie Signal"
                width={16}
                height={16}
                className="h-4 w-4"
              />
              Need help? Email support
            </a>
            <a
              href="tel:403-618-6113"
              className="inline-flex items-center justify-center h-11 w-11 rounded-full belmont-accent text-white shadow-lg hover:opacity-90 focus-ring"
              aria-label="Call for assistance"
              title="Call for assistance"
            >
              <Phone className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
