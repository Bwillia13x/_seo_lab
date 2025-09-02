"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Download,
  Upload,
  Copy,
  RefreshCw,
  Settings,
  Paintbrush,
  Play,
  HelpCircle,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { BELMONT_CONSTANTS } from "@/lib/constants";

// ---------- Types ----------
type Post = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  utmUrl: string;
  channel: "GBP" | "Instagram";
  theme: string;
};

type Biz = {
  name: string;
  area: string;
  booking: string;
  ig: string;
  services: string[];
  offer?: string;
  weekdayPerk?: string;
};

// ---------- Defaults ----------
const DEFAULT_BIZ: Biz = {
  name: "The Belmont Barbershop",
  area: "Bridgeland/Riverside, Calgary",
  booking: "https://thebelmontbarber.ca/book",
  ig: "@thebelmontbarber",
  services: [
    "Men's Haircut",
    "Skin Fade",
    "Beard Trim",
    "Hot Towel Shave",
    "Kids Cut",
  ],
  offer: "$5 off weekday mornings (10–12)",
  weekdayPerk: "Walk‑ins welcome when chairs free",
};

const THEMES = [
  {
    key: "offer",
    name: "Limited‑time Offer",
    hint: "Short‑term perk, weekday window",
  },
  {
    key: "style",
    name: "Style Spotlight",
    hint: "Feature a cut/fade/beard with tips",
  },
  {
    key: "neigh",
    name: "Neighbourhood Shout‑out",
    hint: "Local anchor, community tone",
  },
  {
    key: "hours",
    name: "Hours / Booking",
    hint: "Clarity + booking frictionless",
  },
];

const SIZES = [
  { key: "ig_portrait", name: "Instagram Portrait", w: 1080, h: 1350 },
  { key: "ig_square", name: "Instagram Square", w: 1080, h: 1080 },
  { key: "gbp_photo", name: "GBP Photo", w: 1200, h: 900 },
];

// ---------- Utilities ----------
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthCode() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function buildUrl(base: string, p: Record<string, string | undefined>) {
  try {
    const url = new URL(base);
    Object.entries(p).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== "")
        url.searchParams.set(k, String(v));
    });
    return url.toString();
  } catch {
    return base;
  }
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function wrapWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  const lines: string[] = [];
  for (let n = 0; n < words.length; n++) {
    const test = (line ? line + " " : "") + words[n];
    const m = ctx.measureText(test).width;
    if (m > maxWidth && n > 0) {
      lines.push(line);
      line = words[n];
    } else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, x, yy + i * lineHeight));
  return y + lines.length * lineHeight;
}
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// ---------- Copy engines ----------
function makeHashtags(area: string, services: string[]) {
  const base = [
    "bridgeland",
    "riverside",
    "calgary",
    "yyc",
    "barber",
    "barbershop",
    "menshair",
    "fades",
    "beard",
    "hotshave",
  ];
  const svc = services
    .slice(0, 3)
    .map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  return Array.from(new Set([...base, ...svc]))
    .slice(0, 12)
    .map((x) => "#" + x);
}

function postTemplate(
  theme: string,
  biz: Biz
): { title: string; body: string } {
  const area = biz.area.split(",")[0] || "Bridgeland";
  if (theme === "offer") {
    return {
      title: `Weekday Mornings: Fresh Fades, ${biz.offer || "$ off"} ✂️`,
      body: `Beat the rush in ${area}. Our chairs are calm from 10–12, and ${biz.offer || "weekday mornings are quieter for quick turnarounds"}. Need a precise skin fade, a tidy beard trim, or a classic cut before work? We've got you.\n\nBook in two taps — no DMs: ${biz.booking}. Walk‑ins welcome when chairs are free.\n\nWe're a short stroll from Bridgeland LRT with easy street parking. See you soon.`,
    };
  }
  if (theme === "style") {
    return {
      title: `Skin Fade Focus — Clean lines that last`,
      body: `Today's spotlight: the low skin fade. It sits neat under a cap, grows out clean, and pairs well with a subtle beard line‑up. Ask for a tighter taper at the nape if you want extra longevity between visits.\n\nBook a fade or beard trim at ${biz.name} — ${biz.area}. ${biz.weekdayPerk || "Walk‑ins welcome when chairs free."} Reserve: ${biz.booking}.`,
    };
  }
  if (theme === "neigh") {
    return {
      title: `Hello, neighbours in ${area} 👋`,
      body: `We're proud to call ${area} home — steps from coffee, the river path, and the LRT. If you're new to the area, drop by for a consult or quick tidy‑up. We'll get you on a first‑name basis with your barber and your best haircut.\n\nOnline booking is always live: ${biz.booking}.`,
    };
  }
  // hours
  return {
    title: `Open this week — book in minutes`,
    body: `Hours: Mon–Fri 10–7 · Sat–Sun 10–5.\n\nSkip the phone tag — use online booking and pick your barber and time. If the chairs are free, we'll take walk‑ins.\n\nReserve now: ${biz.booking}.`,
  };
}

function makePost(theme: string, channel: "GBP" | "Instagram", biz: Biz): Post {
  const { title, body } = postTemplate(theme, biz);
  const hashtags = makeHashtags(biz.area, biz.services);
  const utm =
    channel === "GBP"
      ? buildUrl(biz.booking, {
          utm_source: "google",
          utm_medium: "gbp",
          utm_campaign: "belmont_" + monthCode(),
          utm_content: "post_" + todayISO(),
          utm_region: biz.area.toLowerCase().includes("bridgeland")
            ? "bridgeland"
            : "calgary",
        })
      : buildUrl(biz.booking, {
          utm_source: "instagram",
          utm_medium: "social",
          utm_campaign: "belmont_" + monthCode(),
          utm_content: "post_" + todayISO(),
          utm_region: biz.area.toLowerCase().includes("bridgeland")
            ? "bridgeland"
            : "calgary",
        });
  const bodyWithCTA =
    channel === "Instagram"
      ? `${body}\n\n${hashtags.slice(0, 10).join(" ")}`
      : body;
  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    title,
    body: bodyWithCTA,
    hashtags,
    utmUrl: utm,
    channel,
    theme,
  };
}

// ---------- Image Composer ----------
function useImageComposer() {
  const [sizeKey, setSizeKey] = useState<string>("ig_portrait");
  const [bgColor, setBgColor] = useState<string>("#0f172a");
  const [fgColor, setFgColor] = useState<string>("#ffffff");
  const [accentColor, setAccentColor] = useState<string>("#94a3b8");
  const [title, setTitle] = useState<string>("Fresh Fades in Bridgeland");
  const [subtitle, setSubtitle] = useState<string>(
    "Book in minutes · Walk‑ins when chairs free"
  );
  const [footer, setFooter] = useState<string>(
    "Belmont — Bridgeland/Riverside"
  );
  const [handle, setHandle] = useState<string>("@thebelmontbarber");
  const [radius, setRadius] = useState<number>(48);
  const [overlayAlpha, setOverlayAlpha] = useState<number>(0.25);
  const [imgSrc, setImgSrc] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function size() {
    return SIZES.find((s) => s.key === sizeKey) || SIZES[0];
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setImgSrc(result);
      }
    };
    r.readAsDataURL(f);
  }

  function render() {
    const c = canvasRef.current;
    if (!c) return;

    const sizeObj = size();
    const { w, h } = { w: sizeObj.w, h: sizeObj.h };
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    // background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    // bg image
    if (imgSrc) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        drawRoundedRect(ctx, 0, 0, w, h, radius);
        ctx.clip();
        // cover
        const iw = img.width,
          ih = img.height;
        const scale = Math.max(w / iw, h / ih);
        const dw = iw * scale,
          dh = ih * scale;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.restore();
        // overlay
        ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
        ctx.fillRect(0, 0, w, h);
        // text
        drawText();
      };
      img.src = imgSrc;
    } else {
      // no image, draw gradient stripes
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, bgColor);
      g.addColorStop(1, accentColor);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${overlayAlpha * 0.5})`;
      ctx.fillRect(0, 0, w, h);
      drawText();
    }

    function drawText() {
      const pad = Math.max(24, Math.round(Math.min(w, h) * 0.05));
      const maxW = w - pad * 2;
      ctx.textBaseline = "top";
      // title
      ctx.fillStyle = fgColor;
      ctx.font = `700 ${Math.round(w * 0.08)}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
      const titleY = pad;
      const nextY = wrapWords(
        ctx,
        title,
        pad,
        titleY,
        maxW,
        Math.round(w * 0.09)
      );
      // subtitle
      ctx.fillStyle = accentColor;
      ctx.font = `500 ${Math.round(w * 0.038)}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
      const subtitleY = nextY + Math.round(w * 0.02);
      wrapWords(ctx, subtitle, pad, subtitleY, maxW, Math.round(w * 0.05));
      // footer band
      const bandH = Math.round(h * 0.12);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, h - bandH, w, bandH);
      ctx.fillStyle = fgColor;
      ctx.font = `600 ${Math.round(w * 0.045)}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
      ctx.fillText(footer, pad, h - bandH + Math.round(bandH * 0.25));
      ctx.fillStyle = accentColor;
      ctx.font = `500 ${Math.round(w * 0.035)}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
      ctx.fillText(
        handle,
        pad,
        h - bandH + Math.round(bandH * 0.25) + Math.round(w * 0.06)
      );
    }
  }

  function exportPNG() {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const s = SIZES.find((s) => s.key === sizeKey)!;
      saveBlob(blob, `belmont-${s.key}-${todayISO()}.png`);
    }, "image/png");
  }

  useEffect(() => {
    render();
  }, [
    sizeKey,
    bgColor,
    fgColor,
    accentColor,
    title,
    subtitle,
    footer,
    handle,
    radius,
    overlayAlpha,
    imgSrc,
  ]);

  return {
    canvasRef,
    sizeKey,
    setSizeKey,
    bgColor,
    setBgColor,
    fgColor,
    setFgColor,
    accentColor,
    setAccentColor,
    title,
    setTitle,
    subtitle,
    setSubtitle,
    footer,
    setFooter,
    handle,
    setHandle,
    radius,
    setRadius,
    overlayAlpha,
    setOverlayAlpha,
    onUpload,
    exportPNG,
    render,
  };
}

// ---------- Main Component ----------
export default function Page() {
  const [biz, setBiz] = useState<Biz>(DEFAULT_BIZ);
  const [posts, setPosts] = useState<Post[]>([]);
  const [copied, setCopied] = useState<string>("");

  const composer = useImageComposer();

  function copy(text: string, tag: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function genAll() {
    const order = ["offer", "style", "neigh", "hours"];
    const gbp = order.map((t) => makePost(t, "GBP", biz));
    const ig = order.map((t) => makePost(t, "Instagram", biz));
    setPosts([...gbp, ...ig]);
  }

  function exportPostsTxt() {
    const blocks = posts.map(
      (p) =>
        `# ${p.channel} — ${p.title}\nURL: ${p.utmUrl}\nTheme: ${p.theme}\n\n${p.body}`
    );
    const txt = blocks.join("\n\n---\n\n");
    saveBlob(
      new Blob([txt], { type: "text/plain;charset=utf-8;" }),
      `belmont-posts-${todayISO()}.txt`
    );
  }

  // Alt text generator
  function altTextFrom(post: Post) {
    const svc =
      post.theme === "style"
        ? "skin fade"
        : (biz.services[0] || "men's haircut").toLowerCase();
    const area = biz.area.split(",")[0] || "Bridgeland";
    return `Barber performing a ${svc} at ${biz.name} in ${area}. Clean lines, natural lighting, welcoming shop interior.`;
  }

  // Self‑tests
  type Test = { name: string; passed: boolean; details?: string };
  const tests: Test[] = useMemo(() => {
    const t: Test[] = [];
    const cntGBP = posts.filter((p) => p.channel === "GBP").length;
    t.push({
      name: "Generated ≥4 GBP posts",
      passed: cntGBP >= 4,
      details: String(cntGBP),
    });
    const cntIG = posts.filter((p) => p.channel === "Instagram").length;
    t.push({
      name: "Generated ≥4 IG posts",
      passed: cntIG >= 4,
      details: String(cntIG),
    });
    const lenOk = posts.every((p) => {
      const w = p.body.split(/\s+/).filter(Boolean).length;
      return p.channel === "GBP" ? w >= 150 && w <= 300 : w >= 60;
    });
    t.push({ name: "GBP 150–300 words, IG ≥60 words", passed: lenOk });
    return t;
  }, [posts]);
  const passCount = tests.filter((x) => x.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Social Media Studio"
        subtitle="Generate weekly GBP posts + IG captions with Belmont branding and Book Now CTAs."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBiz(DEFAULT_BIZ);
                setPosts([]);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={genAll}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Belmont Posts
            </Button>
            <a
              href={BELMONT_CONSTANTS.BOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Book Now
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Posts"
          value={posts.length}
          hint="Generated this week"
        />
        <KPICard label="Images" value={0} hint="Exported" />
        <KPICard label="Platforms" value="GBP + IG" hint="Supported" />
        <KPICard
          label="Status"
          value={passCount === tests.length ? "Ready" : "Needs Work"}
          hint="System online"
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList>
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="context">Business</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="designer">Designer</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* How To - First Tab */}
        <TabsContent value="howto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                How to Use the Social Media Studio
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-6">
              <div>
                <h3 className="font-semibold text-base mb-3">
                  🎨 What This Tool Does
                </h3>
                <p className="mb-3">
                  This tool helps you create professional social media content
                  for The Belmont Barbershop. It generates ready-to-post content
                  for both Google Business Profile (GBP) and Instagram, plus
                  creates custom images you can use with your posts.
                </p>
                <p>
                  Think of it as your personal content creator that understands
                  Belmont's brand voice and creates posts that attract customers
                  to your Bridgeland barbershop.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  🌟 Why Social Media Matters for Belmont
                </h3>
                <p className="text-muted-foreground">
                  In today's world, people discover local businesses through
                  their phones and social media. Here's why this tool is
                  important for Belmont:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-3">
                  <li>
                    <strong>Google Business Profile posts</strong> appear
                    directly in Google Maps and search results when people look
                    for barbers in Calgary
                  </li>
                  <li>
                    <strong>Instagram posts</strong> showcase Belmont's work and
                    personality to potential customers
                  </li>
                  <li>
                    <strong>Custom images</strong> make your posts stand out and
                    look professional
                  </li>
                  <li>
                    <strong>Consistent branding</strong> helps customers
                    recognize Belmont across all platforms
                  </li>
                  <li>
                    <strong>Booking links</strong> in every post make it easy
                    for customers to schedule appointments
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  📋 Step-by-Step Instructions
                </h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <strong>Start Here:</strong> Click "Load Belmont Sample" to
                    see example posts and get familiar with the tool. This loads
                    Belmont's business information automatically.
                  </li>
                  <li>
                    <strong>Customize Your Content:</strong> In the "Business"
                    tab, you can adjust Belmont's details, add special offers,
                    or change the tone of the posts.
                  </li>
                  <li>
                    <strong>Generate Posts:</strong> Click "Generate Belmont
                    Posts" to create 4 Google Business Profile posts and 4
                    Instagram captions. Each set includes different themes to
                    keep your content variety interesting.
                  </li>
                  <li>
                    <strong>Create Custom Images:</strong> Go to the "Designer"
                    tab to make professional images. Upload a photo, customize
                    colors and text, then export PNG files sized perfectly for
                    Instagram or Google Business Profile.
                  </li>
                  <li>
                    <strong>Copy and Export:</strong> Use the "Exports" tab to
                    copy all the booking links at once or download a text file
                    with all your generated content.
                  </li>
                  <li>
                    <strong>Post on Social Media:</strong> Copy the generated
                    posts and images, then publish them on Google Business
                    Profile and Instagram. The booking links will automatically
                    track where your customers come from.
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  🎯 Best Practices for Belmont Posts
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">
                        📅
                      </span>
                      <span>
                        Post regularly - aim for 2-3 posts per week to stay
                        visible to customers
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">
                        🏷️
                      </span>
                      <span>
                        Use local keywords like "Bridgeland barber", "Calgary
                        men's haircut", "Riverside grooming"
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">
                        💼
                      </span>
                      <span>
                        Always include Belmont's booking link so customers can
                        easily schedule appointments
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">
                        📱
                      </span>
                      <span>
                        Add high-quality photos of Belmont's shop, your work, or
                        happy customers
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">
                        ⏰
                      </span>
                      <span>
                        Post during peak times when customers are likely
                        searching for barber services
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">
                        🎨
                      </span>
                      <span>
                        Use Belmont's signature colors (navy blue, white, and
                        gold accents) in your images
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  🏷️ Understanding Post Types
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Google Business Profile (GBP):</strong>
                    <p className="text-muted-foreground mt-1">
                      Posts that appear in Google Maps and search results. Keep
                      them helpful and local. No hashtags needed - focus on
                      customer benefits and clear calls-to-action.
                    </p>
                  </div>
                  <div>
                    <strong>Instagram Posts:</strong>
                    <p className="text-muted-foreground mt-1">
                      Visual content for Belmont's Instagram feed. Include
                      relevant hashtags and more personality. These build
                      Belmont's brand and attract the right customers.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  📊 Post Themes Explained
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Offer
                    </Badge>
                    <div>
                      <strong>Limited-Time Offers:</strong>
                      <span className="text-muted-foreground ml-2">
                        Promote specials, weekday discounts, or seasonal deals
                        to drive immediate bookings
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Style
                    </Badge>
                    <div>
                      <strong>Style Spotlights:</strong>
                      <span className="text-muted-foreground ml-2">
                        Showcase specific services like skin fades, beard trims,
                        or hot towel shaves
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Neigh
                    </Badge>
                    <div>
                      <strong>Neighborhood Content:</strong>
                      <span className="text-muted-foreground ml-2">
                        Build community connections and mention local landmarks
                        near Belmont
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Hours
                    </Badge>
                    <div>
                      <strong>Hours & Booking:</strong>
                      <span className="text-muted-foreground ml-2">
                        Remind customers about Belmont's hours and encourage
                        online booking
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  🎨 Image Designer Tips
                </h3>
                <p className="text-muted-foreground mb-3">
                  The image designer creates professional graphics sized
                  perfectly for social media:
                </p>
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm">
                  <ul className="space-y-1">
                    <li>
                      <strong>Instagram Portrait:</strong> 1080x1350px - perfect
                      for Instagram feed posts
                    </li>
                    <li>
                      <strong>Instagram Square:</strong> 1080x1080px - great for
                      Instagram Stories and highlights
                    </li>
                    <li>
                      <strong>GBP Photo:</strong> 1200x900px - optimized for
                      Google Business Profile posts
                    </li>
                  </ul>
                  <p className="mt-2 text-xs">
                    Upload Belmont photos, customize with your branding, and
                    export ready-to-use images.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">💡 Pro Tips</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>
                    <strong>Consistency is key:</strong> Use similar colors and
                    fonts across all Belmont's social media
                  </li>
                  <li>
                    <strong>Include a call-to-action:</strong> Every post should
                    encourage customers to book or visit
                  </li>
                  <li>
                    <strong>Track your results:</strong> Use the UTM links to
                    see which posts drive the most bookings
                  </li>
                  <li>
                    <strong>Engage with comments:</strong> Respond to customer
                    questions and comments on your posts
                  </li>
                  <li>
                    <strong>Quality over quantity:</strong> Better to have 5
                    great posts than 50 mediocre ones
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Context */}
        <TabsContent value="context">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Business Inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label>Name</Label>
                  <Input
                    value={biz.name}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>IG handle</Label>
                  <Input
                    value={biz.ig}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, ig: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Area (for local flavor)</Label>
                  <Input
                    value={biz.area}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, area: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Booking URL</Label>
                  <Input
                    value={biz.booking}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, booking: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Weekday perk text</Label>
                  <Input
                    value={biz.offer}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, offer: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Services (comma‑separated)</Label>
                  <Input
                    value={biz.services.join(", ")}
                    onChange={(e) =>
                      setBiz((b) => ({
                        ...b,
                        services: e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts */}
        <TabsContent value="posts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Generated Posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {posts.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Click "Generate Posts" to create four GBP posts and four
                  Instagram captions.
                </div>
              )}
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Body</TableHead>
                      <TableHead>UTM URL</TableHead>
                      <TableHead>Theme</TableHead>
                      <TableHead>Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.channel}</TableCell>
                        <TableCell className="min-w-[180px]">
                          {p.title}
                        </TableCell>
                        <TableCell className="min-w-[360px] text-sm whitespace-pre-wrap">
                          {p.body}
                        </TableCell>
                        <TableCell className="min-w-[240px]">
                          <Input value={p.utmUrl} readOnly />
                        </TableCell>
                        <TableCell>{p.theme}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copy(
                                `# ${p.channel}: ${p.title}\n\n${p.body}\n\n${p.utmUrl}`,
                                `copy-${i}`
                              )
                            }
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          {copied === `copy-${i}` && (
                            <Badge className="ml-2">Copied</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Designer */}
        <TabsContent value="designer">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Image Composer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={composer.title}
                    onChange={(e) => composer.setTitle(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Subtitle</Label>
                  <Input
                    value={composer.subtitle}
                    onChange={(e) => composer.setSubtitle(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Footer</Label>
                  <Input
                    value={composer.footer}
                    onChange={(e) => composer.setFooter(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Handle</Label>
                  <Input
                    value={composer.handle}
                    onChange={(e) => composer.setHandle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="image-size">Size</Label>
                  <select
                    id="image-size"
                    title="Select image size"
                    className="w-full h-9 border rounded-md px-2"
                    value={composer.sizeKey}
                    onChange={(e) => composer.setSizeKey(e.target.value)}
                  >
                    {SIZES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Corner radius</Label>
                  <Input
                    type="number"
                    min={0}
                    max={96}
                    value={composer.radius}
                    onChange={(e) =>
                      composer.setRadius(
                        clamp(parseInt(e.target.value || "0"), 0, 96)
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Overlay strength</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={composer.overlayAlpha}
                    onChange={(e) =>
                      composer.setOverlayAlpha(
                        clamp(parseFloat(e.target.value || "0"), 0, 1)
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Background color</Label>
                  <Input
                    type="color"
                    value={composer.bgColor}
                    onChange={(e) => composer.setBgColor(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Text color</Label>
                  <Input
                    type="color"
                    value={composer.fgColor}
                    onChange={(e) => composer.setFgColor(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Accent color</Label>
                  <Input
                    type="color"
                    value={composer.accentColor}
                    onChange={(e) => composer.setAccentColor(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="file"
                    id="bgimg"
                    accept="image/*"
                    className="hidden"
                    onChange={composer.onUpload}
                  />
                  <label htmlFor="bgimg">
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Background
                    </Button>
                  </label>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4 items-start">
                <div>
                  <canvas
                    ref={composer.canvasRef}
                    className="w-full border rounded-lg"
                    style={{
                      aspectRatio: `${SIZES.find((s) => s.key === composer.sizeKey)?.w || 1}/${SIZES.find((s) => s.key === composer.sizeKey)?.h || 1}`,
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={composer.exportPNG}>
                      <Download className="h-4 w-4 mr-2" />
                      Export PNG
                    </Button>
                    <Button variant="outline" onClick={composer.render}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re‑render
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">
                    Alt text suggestion
                  </div>
                  <Textarea
                    readOnly
                    className="h-40"
                    value={
                      posts[0]
                        ? altTextFrom(posts[0])
                        : "Upload an image and generate posts first to see a tailored alt‑text."
                    }
                  />
                  <div className="text-xs text-muted-foreground mt-2">
                    Tip: Keep alt text factual (who/what/where). Avoid hashtag
                    stuffing.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exports */}
        <TabsContent value="exports">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Exports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportPostsTxt}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Posts (.txt)
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    copy(posts.map((p) => p.utmUrl).join("\n"), "urls")
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All URLs
                </Button>
                {copied === "urls" && <Badge>Copied</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                PNG exports are sized to platform presets; text export contains
                both GBP and Instagram copy with UTM links.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                Self‑tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.passed ? "PASS" : "FAIL"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.details || ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-2 text-xs text-muted-foreground">
                {passCount}/{tests.length} passed
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
