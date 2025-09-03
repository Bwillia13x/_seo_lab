"use client";

import { Sidebar } from "./Sidebar";
import Link from "next/link";
import { Search, Sun, MoonStar, Phone, MapPin, Brain, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import Image from "next/image";
import { AIDiagnostics } from "@/components/ui/ai-diagnostics";
import { logEvent } from "@/lib/analytics";
import { ToastProvider } from "@/components/ui/toast";

export default function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [dark, setDark] = useState(false);
  const [simple, setSimple] = useState(false);
  const [phoneTel, setPhoneTel] = useState(BELMONT_CONSTANTS.PHONE_TEL);
  const [mapUrl, setMapUrl] = useState(BELMONT_CONSTANTS.MAP_URL);
  const [showAI, setShowAI] = useState(false);
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
      try {
        const ph = window.localStorage.getItem("belmont_onboarding_phone");
        const addr = window.localStorage.getItem("belmont_onboarding_address");
        const storedKey = window.localStorage.getItem("belmont_openai_key");
        const envKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY as string | undefined;
        if (!storedKey && envKey) {
          try { window.localStorage.setItem("belmont_openai_key", envKey); } catch {}
        }
        if (ph) {
          const digits = ph.replace(/[^0-9+]/g, "");
          setPhoneTel(`tel:${digits}`);
        }
        if (addr) {
          setMapUrl(`https://maps.google.com/?q=${encodeURIComponent(addr)}`);
        }
      } catch {}
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
  function toggleAI() {
    setShowAI((s) => {
      const next = !s;
      try { logEvent(next ? "ai_diag_open" : "ai_diag_close"); } catch {}
      return next;
    });
  }
  return (
    <div className="min-h-screen grid lg:grid-cols-[280px_1fr]">
      <Sidebar simple={simple} />
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-sm">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-sm md:text-base hover:opacity-80 transition-opacity"
            >
              <Image
                src="/images/PRAIRIESIGNALLOGO.png"
                alt="Prairie Signal"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="hidden sm:inline">Belmont SEO Lab</span>
              <span className="sm:hidden">SEO Lab</span>
            </Link>

            <div className="ml-auto flex items-center gap-1">
              {/* Quick Actions - Only show on larger screens */}
              <div className="hidden lg:flex items-center gap-1 rounded-full bg-secondary/50 px-1 py-1">
                <a
                  href={phoneTel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full hover:bg-accent transition-colors"
                  aria-label="Call for assistance"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Assistance</span>
                </a>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full hover:bg-accent transition-colors"
                  aria-label="Find The Belmont Barbershop on map"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Map</span>
                </a>
              </div>

              {/* Search - Only show when not in simple mode */}
              {!simple && (
                <div className="relative hidden md:block">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="Search tools…"
                    aria-label="Search tools"
                    className="h-10 w-[220px] pl-9 pr-3 rounded-full border bg-background/60 focus:bg-background transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button
                  aria-label="Toggle Simple Mode"
                  className="h-10 px-3 inline-flex items-center justify-center rounded-md border hover:bg-accent text-xs font-medium transition-colors focus-ring"
                  onClick={toggleSimple}
                  title="Simple Mode"
                >
                  {simple ? "Simple" : "Advanced"}
                </button>
                <button
                  aria-label="Toggle theme"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-md border hover:bg-accent transition-colors focus-ring"
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
          </div>
        </header>
        <main className="p-4 md:p-6 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
        <ToastProvider />
        {/* Floating Help Actions */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex flex-col items-end gap-3">
            <a
              href="mailto:info@thebelmontbarber.ca"
              className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-background/90 backdrop-blur shadow-lg hover:bg-accent transition-all duration-200 text-sm font-medium hover:shadow-xl"
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
            <div className="flex gap-2">
              <button
                onClick={toggleAI}
                aria-label="Open AI diagnostics"
                title="AI diagnostics"
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 focus-ring transition-all duration-200"
              >
                <Brain className="h-5 w-5" />
              </button>
              <a
                href={phoneTel}
                className="inline-flex items-center justify-center h-12 w-12 rounded-full belmont-accent text-white shadow-lg hover:shadow-xl hover:scale-105 focus-ring transition-all duration-200"
                aria-label="Call for assistance"
                title="Call for assistance"
              >
                <Phone className="h-5 w-5" />
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 focus-ring transition-all duration-200"
                aria-label="Find The Belmont Barbershop on map"
                title="Find us on map"
              >
                <MapPin className="h-5 w-5" />
              </a>
            </div>
          </div>
          {showAI && (
            <div className="mt-3 w-[360px] max-w-[92vw]">
              <div className="relative">
                <button
                  onClick={toggleAI}
                  aria-label="Close AI diagnostics"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border shadow flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
                <AIDiagnostics />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
