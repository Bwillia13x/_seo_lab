"use client";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: null },
  {
    href: "/apps/citation-tracker",
    label: "Business Listings Check",
    icon: Scissors,
  },
  { href: "/apps/gsc-ctr-miner", label: "Search Performance", icon: BarChart3 },
  { href: "/apps/link-prospect-kit", label: "Partner Finder", icon: Link2 },
  { href: "/apps/utm-dashboard", label: "Campaign Links", icon: Tags },
  { href: "/apps/post-studio", label: "Social Media Studio", icon: Img },
  { href: "/apps/gbp-composer", label: "Google Posts Writer", icon: FileText },
  { href: "/apps/rank-grid", label: "Search Rankings", icon: MapPin },
  { href: "/apps/seo-brief", label: "Website Guide", icon: FileText },
  { href: "/apps/review-link", label: "Review Request Links", icon: QrCode },
  { href: "/apps/utm-qr", label: "QR Code Maker", icon: LinkIcon },
  { href: "/apps/rfm-crm", label: "Customer Analysis", icon: Users },
  { href: "/apps/slot-yield", label: "Service Profits", icon: Clock },
  { href: "/apps/queuetime", label: "Busy Times Predictor", icon: Clock },
  {
    href: "/apps/meta-planner",
    label: "Page Titles & Descriptions",
    icon: FileText,
  },
  { href: "/apps/post-oracle", label: "Content Calendar", icon: MessageSquare },
  {
    href: "/apps/review-composer",
    label: "Review Responses",
    icon: MessageSquare,
  },
  { href: "/apps/link-map", label: "Partnership Map", icon: MapPin },
  {
    href: "/apps/noshow-shield",
    label: "Appointment Reminders",
    icon: AlertTriangle,
  },
  { href: "/apps/addon-recommender", label: "Service Suggestions", icon: Plus },
  {
    href: "/apps/rankgrid-watcher",
    label: "Ranking Monitor",
    icon: TrendingUp,
  },
  { href: "/apps/neighbor-signal", label: "Local Content Ideas", icon: Radar },
  { href: "/apps/referral-qr", label: "Staff Referral Codes", icon: QrCode },
];

function NavItem({
  href,
  label,
  Icon,
}: {
  readonly href: string;
  readonly label: string;
  readonly Icon: any;
}) {
  return (
    <Link
      key={href}
      href={href}
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
  return (
    <aside className="border-r bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4">
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
      <nav className="px-2 space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <div key={href} className="space-y-0.5">
            <NavItem href={href} label={label} Icon={Icon} />
            {simple && (
              <div className="pl-10 pr-3 text-[11px] text-muted-foreground">
                {label === "Campaign Links" &&
                  "Create links that tell you where customers came from."}
                {label === "QR Code Maker" &&
                  "Make a square barcode people can scan with their phone."}
                {label === "Review Request Links" &&
                  "Send people straight to your review page."}
                {label === "Search Results Analyzer" &&
                  "See how people find you on Google."}
                {label === "Google Posts Writer" &&
                  "Write a short, clear update for Google."}
                {label === "Social Media Studio" &&
                  "Draft simple posts for Facebook/Instagram."}
                {label === "Local Search Rankings" &&
                  "Check where you appear in Google Maps."}
                {label === "Partner Finder" &&
                  "Find nearby businesses to work with."}
                {label === "Website Improvement Guide" &&
                  "Plain steps to tidy your website."}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="mt-auto p-3" />
    </aside>
  );
}
