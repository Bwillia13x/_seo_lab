"use client";
import Link from "next/link";
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
  { href: "/apps/citation-tracker", label: "Citation Tracker", icon: Scissors },
  { href: "/apps/gsc-ctr-miner", label: "GSC CTR Miner", icon: BarChart3 },
  { href: "/apps/link-prospect-kit", label: "Link Prospect Kit", icon: Link2 },
  { href: "/apps/utm-dashboard", label: "UTM & Attribution", icon: Tags },
  { href: "/apps/post-studio", label: "GBP & IG Studio", icon: Img },
  { href: "/apps/gbp-composer", label: "GBP Post Composer", icon: FileText },
  { href: "/apps/rank-grid", label: "Local Rank Grid", icon: MapPin },
  { href: "/apps/seo-brief", label: "SEO Brief & Schema", icon: FileText },
  { href: "/apps/review-link", label: "Review Link Builder", icon: QrCode },
  { href: "/apps/utm-qr", label: "UTM & QR Builder", icon: LinkIcon },
  { href: "/apps/rfm-crm", label: "RFM Micro CRM", icon: Users },
  { href: "/apps/slot-yield", label: "Slot-Yield Analyzer", icon: Clock },
  { href: "/apps/queuetime", label: "QueueTime AI", icon: Clock },
  { href: "/apps/meta-planner", label: "Title/Meta Planner", icon: FileText },
  { href: "/apps/post-oracle", label: "Post Oracle", icon: MessageSquare },
  {
    href: "/apps/review-composer",
    label: "Review Composer",
    icon: MessageSquare,
  },
  { href: "/apps/link-map", label: "Link Map", icon: MapPin },
  { href: "/apps/noshow-shield", label: "No-Show Shield", icon: AlertTriangle },
  { href: "/apps/addon-recommender", label: "Add-On Recommender", icon: Plus },
  {
    href: "/apps/rankgrid-watcher",
    label: "RankGrid Watcher",
    icon: TrendingUp,
  },
  { href: "/apps/neighbor-signal", label: "Neighbor Signal", icon: Radar },
  { href: "/apps/referral-qr", label: "Referral QR", icon: QrCode },
];

function NavItem({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: any;
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

export function Sidebar() {
  return (
    <aside className="border-r bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4">
        <div className="font-semibold text-base tracking-tight">Belmont</div>
        <div className="text-xs text-muted-foreground">SEO Lab</div>
      </div>
      <nav className="px-2 space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} />
        ))}
      </nav>
      <div className="mt-auto p-3" />
    </aside>
  );
}
