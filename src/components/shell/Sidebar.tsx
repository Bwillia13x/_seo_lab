"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Scissors,
  BarChart3,
  Link2,
  Tags,
  Image as Img,
  Clock,
  FileText,
  MessageSquare,
  MapPin,
  AlertTriangle,
  Plus,
  TrendingUp,
  Radar,
  QrCode,
  Link as LinkIcon,
  Users,
  Menu,
  X,
} from "lucide-react";

export const navigationGroups = [
  {
    title: "Getting Started",
    items: [
      { href: "/", label: "Home", icon: null },
      { href: "/apps/dashboard", label: "Dashboard", icon: TrendingUp },
      { href: "/apps/onboarding", label: "Onboarding", icon: Radar },
    ],
  },
  {
    title: "Content Creation",
    items: [
      { href: "/apps/gbp-composer", label: "Google Posts Writer", icon: FileText },
      { href: "/apps/post-studio", label: "Social Media Studio", icon: Img },
      { href: "/apps/post-oracle", label: "Content Calendar", icon: MessageSquare },
      { href: "/apps/neighbor-signal", label: "Local Content Ideas", icon: Radar },
    ],
  },
  {
    title: "Marketing & Tracking",
    items: [
      { href: "/apps/utm-dashboard", label: "Campaign Links", icon: Tags },
      { href: "/apps/utm-qr", label: "QR Code Maker", icon: LinkIcon },
      { href: "/apps/referral-qr", label: "Staff Referral Codes", icon: QrCode },
      { href: "/apps/review-link", label: "Review Request Links", icon: QrCode },
    ],
  },
  {
    title: "Customer Management",
    items: [
      { href: "/apps/review-composer", label: "Review Responses", icon: MessageSquare },
      { href: "/apps/rfm-crm", label: "Customer Analysis", icon: Users },
      { href: "/apps/noshow-shield", label: "Appointment Reminders", icon: AlertTriangle },
      { href: "/apps/addon-recommender", label: "Service Suggestions", icon: Plus },
    ],
  },
  {
    title: "Search Performance",
    items: [
      { href: "/apps/gsc-ctr-miner", label: "Search Performance", icon: BarChart3 },
      { href: "/apps/rank-grid", label: "Search Rankings", icon: MapPin },
      { href: "/apps/rankgrid-watcher", label: "Ranking Monitor", icon: TrendingUp },
      { href: "/apps/slot-yield", label: "Service Profits", icon: Clock },
      { href: "/apps/queuetime", label: "Busy Times Predictor", icon: Clock },
    ],
  },
  {
    title: "Local Partnerships",
    items: [
      { href: "/apps/link-prospect-kit", label: "Partner Finder", icon: Link2 },
      { href: "/apps/link-map", label: "Partnership Map", icon: MapPin },
    ],
  },
  {
    title: "Website Optimization",
    items: [
      { href: "/apps/seo-brief", label: "Website Guide", icon: FileText },
      { href: "/apps/meta-planner", label: "Page Titles & Descriptions", icon: FileText },
      { href: "/apps/citation-tracker", label: "Business Listings Check", icon: Scissors },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/status", label: "Status", icon: AlertTriangle },
      { href: "/guide/trial", label: "Trial Guide", icon: FileText },
    ],
  },
];

function NavItem({
  href,
  label,
  Icon,
  onClick,
}: {
  readonly href: string;
  readonly label: string;
  readonly Icon: any;
  readonly onClick?: () => void;
}) {
  return (
    <Link
      key={href}
      href={href}
      onClick={onClick}
      className="group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
    >
      {Icon && (
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      )}
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export function Sidebar({ simple = false }: { readonly simple?: boolean }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen && !(event.target as Element).closest('.sidebar-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Focus trap when mobile menu is open
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const root = sidebarRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (active === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-md border bg-background/90 backdrop-blur shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside ref={sidebarRef} className={`sidebar-container border-r bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:translate-x-0 transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed lg:static inset-y-0 left-0 z-40 w-72 lg:w-auto`}>
        <div className="p-4 border-b lg:border-b-0">
          <div className="flex items-center gap-2">
            <Image
              src="/images/PRAIRIESIGNALLOGO.png"
              alt="Prairie Signal"
              width={20}
              height={20}
              className="h-5 w-5"
            />
            <div>
              <div className="font-semibold text-base tracking-tight">
                Belmont
              </div>
              <div className="text-xs text-muted-foreground">SEO Lab</div>
            </div>
          </div>
        </div>
      <nav className="px-2 space-y-4" aria-label="Primary Navigation" role="navigation">
        {navigationGroups.map((group, groupIndex) => {
          const simpleHide = new Set([
            "/apps/queuetime",
            "/apps/slot-yield",
            "/apps/rfm-crm",
            "/apps/noshow-shield",
            "/apps/addon-recommender",
          ]);
          const items = simple
            ? group.items.filter((it) => !simpleHide.has(it.href))
            : group.items;
          if (!items.length) return null;
          return (
            <div key={group.title} className="space-y-2">
              {group.title !== "Getting Started" && (
                <div className="px-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </h3>
                </div>
              )}
              <div className="space-y-1">
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                <div key={href} className="space-y-0.5">
                  <NavItem
                    href={href}
                    label={label}
                    Icon={Icon}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  {/* Active indicator */}
                  <div className={`h-[2px] mx-3 ${active ? 'bg-primary/60' : 'bg-transparent'}`} />
                  {simple && group.title === "Marketing & Tracking" && (
                    <div className="pl-10 pr-3 text-[11px] text-muted-foreground">
                      {label === "Campaign Links" &&
                        "Create links that tell you where customers came from."}
                      {label === "QR Code Maker" &&
                        "Make a square barcode people can scan with their phone."}
                      {label === "Review Request Links" &&
                        "Send people straight to your review page."}
                      {label === "Staff Referral Codes" &&
                        "Create QR codes for staff referral rewards."}
                    </div>
                  )}
                  {simple && group.title === "Content Creation" && (
                    <div className="pl-10 pr-3 text-[11px] text-muted-foreground">
                      {label === "Google Posts Writer" &&
                        "Write a short, clear update for Google."}
                      {label === "Social Media Studio" &&
                        "Draft simple posts for Facebook/Instagram."}
                      {label === "Content Calendar" &&
                        "Plan and schedule your weekly posts."}
                      {label === "Local Content Ideas" &&
                        "See what content works best for Bridgeland."}
                    </div>
                  )}
                  {simple && group.title === "Search Performance" && (
                    <div className="pl-10 pr-3 text-[11px] text-muted-foreground">
                      {label === "Search Performance" &&
                        "See how people find you on Google."}
                      {label === "Search Rankings" &&
                        "Check where you appear in Google Maps."}
                      {label === "Ranking Monitor" &&
                        "Get automatic updates on ranking changes."}
                      {label === "Service Profits" &&
                        "See which services make the most money."}
                      {label === "Busy Times Predictor" &&
                        "Predict when you'll be busiest."}
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
          );
        })}
      </nav>
      <div className="mt-auto p-3" />
    </aside>

    {/* Mobile Overlay */}
    {isMobileMenuOpen && (
      <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30" />
    )}
    </>
  );
}
