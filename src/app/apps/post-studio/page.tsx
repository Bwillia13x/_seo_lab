"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  Sparkles,
  Brain,
  Calendar,
  BarChart3,
  Share2,
  Target,
  TrendingUp,
  Hash,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  BookOpen,
  Trash2,
  CheckCircle2,
  Zap,
  Clock,
} from "lucide-react";
// Using server-managed AI via aiChatSafe
import { aiChatSafe } from "@/lib/ai";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { BELMONT_CONSTANTS } from "@/lib/constants";

// ---------- Enhanced Types ----------
type Post = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  utmUrl: string;
  channel: "GBP" | "Instagram" | "Facebook" | "Twitter" | "LinkedIn";
  theme: string;
  aiGenerated?: boolean;
  scheduledDate?: string;
  performance?: PostPerformance;
  imageUrl?: string;
  altText?: string;
};

type PostPerformance = {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  engagementRate: number;
  date: string;
};

type Biz = {
  name: string;
  area: string;
  booking: string;
  ig: string;
  fb?: string;
  twitter?: string;
  linkedin?: string;
  services: string[];
  offer?: string;
  weekdayPerk?: string;
  brandVoice: string;
  targetAudience: string;
};

type ContentCalendar = {
  week: string;
  posts: ScheduledPost[];
};

type ScheduledPost = {
  id: string;
  date: string;
  time: string;
  platform: string;
  content: Post;
  status: "draft" | "scheduled" | "published";
};

type AITemplate = {
  name: string;
  description: string;
  prompt: string;
  category: string;
  platforms: string[];
};

type HashtagPerformance = {
  hashtag: string;
  reach: number;
  engagement: number;
  posts: number;
  trend: "up" | "down" | "stable";
};

type SavedContent = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  theme: string;
  platform: Post["channel"];
  aiGenerated: boolean;
  qualityScore: number;
  performance: PostPerformance;
  savedDate: string;
  tags: string[];
  category: string;
};

type ContentLibrary = {
  savedContent: SavedContent[];
  templates: SavedContent[];
  categories: string[];
};

// ---------- Enhanced Defaults ----------
const DEFAULT_BIZ: Biz = {
  name: "The Belmont Barbershop",
  area: "Bridgeland/Riverside, Calgary",
  booking: "https://thebelmontbarber.ca/book",
  ig: "@thebelmontbarber",
  fb: "facebook.com/belmontbarbershop",
  twitter: "@belmontbarber",
  linkedin: "linkedin.com/company/belmont-barbershop",
  services: [
    "Men's Haircut",
    "Skin Fade",
    "Beard Trim",
    "Hot Towel Shave",
    "Kids Cut",
  ],
  offer: "$5 off weekday mornings (10–12)",
  weekdayPerk: "Walk‑ins welcome when chairs free",
  brandVoice:
    "Professional yet approachable, traditional barber values with modern convenience",
  targetAudience:
    "Local men seeking quality grooming services in Bridgeland/Riverside area",
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
  {
    key: "testimonial",
    name: "Customer Testimonial",
    hint: "Share customer experiences and reviews",
  },
  {
    key: "behind-scenes",
    name: "Behind the Scenes",
    hint: "Show daily life at Belmont Barbershop",
  },
  {
    key: "tips",
    name: "Grooming Tips",
    hint: "Share professional grooming advice",
  },
  {
    key: "event",
    name: "Special Event",
    hint: "Announce promotions or special occasions",
  },
];

const PLATFORMS = [
  { key: "Instagram", name: "Instagram", icon: Instagram, color: "#E4405F" },
  { key: "Facebook", name: "Facebook", icon: Facebook, color: "#1877F2" },
  { key: "Twitter", name: "Twitter", icon: Twitter, color: "#1DA1F2" },
  { key: "LinkedIn", name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { key: "GBP", name: "Google Business", icon: Target, color: "#34A853" },
];

const AI_TEMPLATES: AITemplate[] = [
  {
    name: "Service Spotlight",
    description: "Highlight a specific service with professional insights",
    prompt:
      "Write an engaging social media post about {service} at {business_name}. Focus on the benefits, what makes it special, and encourage bookings. Keep it {tone} and relevant to {audience}. Include 2-3 relevant emojis and end with a clear call-to-action.",
    category: "Service Promotion",
    platforms: ["Instagram", "Facebook", "GBP"],
  },
  {
    name: "Limited Time Offer",
    description: "Create urgency around special deals and promotions",
    prompt:
      "Create a compelling post about the limited time offer: {offer}. Make it exciting and urgent while maintaining {business_name}'s {brand_voice}. Target {audience} in {location}. Use urgency words like 'Limited Time', 'Today Only', 'Ending Soon'. Include booking instructions.",
    category: "Promotions",
    platforms: ["Instagram", "Facebook", "Twitter"],
  },
  {
    name: "Community Connection",
    description: "Build local community relationships",
    prompt:
      "Write a post that connects with the {location} community. Reference local landmarks, show appreciation for customers, and highlight what makes {business_name} a local favorite for {services}. Make it warm and community-focused, not sales-y. Include local flavor and personality.",
    category: "Community",
    platforms: ["Facebook", "Instagram", "GBP"],
  },
  {
    name: "Professional Tips",
    description: "Share expert grooming and style advice",
    prompt:
      "Share professional grooming tips related to {service}. Make it educational yet approachable for {audience}. Include booking encouragement and maintain {brand_voice}. Structure as: Problem → Solution → Benefit → Call-to-action. Keep it under 150 words.",
    category: "Education",
    platforms: ["Instagram", "LinkedIn", "Twitter"],
  },
  {
    name: "Customer Story",
    description: "Transform customer experiences into engaging content",
    prompt:
      "Create an authentic customer story post based on typical experiences at {business_name}. Focus on the transformation, service quality, and local connection in {location}. Make it relatable and inspiring. Use quotes or paraphrased customer feedback. End with booking encouragement.",
    category: "Social Proof",
    platforms: ["Instagram", "Facebook", "GBP"],
  },
  {
    name: "Behind the Scenes",
    description: "Show the human side of Belmont Barbershop",
    prompt:
      "Write a behind-the-scenes post about daily life at {business_name}. Share what makes the team special, the atmosphere, or interesting customer interactions. Keep it authentic and engaging for {audience} in {location}. Focus on personality over perfection.",
    category: "Brand Building",
    platforms: ["Instagram", "Facebook", "Twitter"],
  },
  {
    name: "Seasonal Content",
    description: "Create timely content for holidays and seasons",
    prompt:
      "Write a seasonal post for {business_name} that fits the current time of year. Consider holidays, weather, or local events in {location}. Tie it back to grooming services and maintain {brand_voice}. Make it timely and relevant to {audience}.",
    category: "Seasonal",
    platforms: ["Instagram", "Facebook", "GBP"],
  },
  {
    name: "Question Engagement",
    description: "Ask questions to boost engagement",
    prompt:
      "Create a post that asks an engaging question related to {service} or grooming in general. Make it relevant to {audience} and encourage comments/shares. Include {business_name} context and end with a subtle booking reminder. Keep it conversational and fun.",
    category: "Engagement",
    platforms: ["Instagram", "Facebook", "Twitter"],
  },
  {
    name: "Style Inspiration",
    description: "Share fashion and style inspiration",
    prompt:
      "Write an inspirational post about men's grooming and style. Connect it to {services} at {business_name}. Make it aspirational yet approachable for {audience}. Include practical tips and maintain {brand_voice}. Focus on confidence and self-care.",
    category: "Inspiration",
    platforms: ["Instagram", "LinkedIn", "Twitter"],
  },
  {
    name: "Local Business Support",
    description: "Support other local businesses",
    prompt:
      "Write a post supporting other local businesses in {location}. Connect it back to {business_name} and {services}. Show community spirit while highlighting what makes Belmont special. Keep it genuine and community-focused.",
    category: "Community Support",
    platforms: ["Facebook", "Instagram", "GBP"],
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

// ---------- Enhanced AI Content Generation ----------
async function generateAIContent(
  template: AITemplate,
  biz: Biz,
  service?: string,
  tone?: string,
  customInstructions?: string
): Promise<{
  title: string;
  body: string;
  hashtags: string[];
  quality: ContentQuality;
}> {
  try {

    let prompt = template.prompt
      .replace("{business_name}", biz.name)
      .replace("{location}", biz.area)
      .replace("{services}", biz.services.join(", "))
      .replace("{brand_voice}", biz.brandVoice)
      .replace("{audience}", biz.targetAudience)
      .replace("{offer}", biz.offer || "special offer");

    if (service) {
      prompt = prompt.replace("{service}", service);
    }
    if (tone) {
      prompt = prompt.replace("{tone}", tone);
    }

    // Add custom instructions if provided
    if (customInstructions) {
      prompt += `\n\nAdditional instructions: ${customInstructions}`;
    }

    const out = await aiChatSafe({
      model: "gpt-5-mini-2025-08-07",
      maxTokens: 400,
      temperature: 0.8,
      messages: [
        { role: "system", content: `You are a social media expert for ${biz.name}, a premium barbershop in ${biz.area}. Create engaging, professional content that resonates with ${biz.targetAudience}. Maintain ${biz.brandVoice} tone. Keep posts concise and include clear calls-to-action. Always include relevant hashtags at the end for Instagram posts.` },
        { role: "user", content: prompt },
      ],
    });

    const content = (out.ok ? out.content : "").trim();
    const lines = content.split("\n").filter((line) => line.trim());

    // Extract hashtags from the content
    const hashtagRegex = /#[\w]+/g;
    const extractedHashtags = content.match(hashtagRegex) || [];
    const optimizedHashtags = optimizeHashtags(
      makeHashtags(biz.area, biz.services),
      []
    );

    const title = lines[0] || "Generated Post";
    const body = lines.slice(1).join("\n") || content;

    // Calculate content quality
    const quality = calculateContentQuality(body, template.category);

    return {
      title,
      body,
      hashtags: [
        ...new Set([...extractedHashtags, ...optimizedHashtags.slice(0, 8)]),
      ],
      quality,
    };
  } catch (error) {
    console.error("AI generation failed:", error);
    const fallback = postTemplate(
      template.category.toLowerCase().includes("offer") ? "offer" : "style",
      biz
    );
    return {
      title: fallback.title,
      body: fallback.body,
      hashtags: makeHashtags(biz.area, biz.services),
      quality: {
        score: 60,
        strengths: ["Fallback content"],
        improvements: ["Consider regenerating with AI"],
      },
    };
  }
}

// ---------- Content Quality Analysis ----------
type ContentQuality = {
  score: number;
  strengths: string[];
  improvements: string[];
};

function calculateContentQuality(
  content: string,
  category: string
): ContentQuality {
  let score = 50; // Base score
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Length analysis
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 50 && wordCount <= 150) {
    score += 15;
    strengths.push("Optimal length for engagement");
  } else if (wordCount > 150) {
    score += 5;
    improvements.push("Consider shortening for better engagement");
  } else {
    score += 5;
    improvements.push("Consider adding more detail");
  }

  // Call-to-action analysis
  const ctaWords = [
    "book",
    "call",
    "visit",
    "schedule",
    "contact",
    "DM",
    "link in bio",
  ];
  const hasCTA = ctaWords.some((word) => content.toLowerCase().includes(word));
  if (hasCTA) {
    score += 15;
    strengths.push("Includes clear call-to-action");
  } else {
    improvements.push("Add a clear call-to-action");
  }

  // Engagement elements
  const engagementWords = [
    "?",
    "what do you think",
    "share",
    "comment",
    "tell us",
  ];
  const hasEngagement = engagementWords.some((word) =>
    content.toLowerCase().includes(word)
  );
  if (hasEngagement) {
    score += 10;
    strengths.push("Encourages audience interaction");
  }

  // Emojis (appropriate amount)
  const emojiCount = (
    content.match(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu
    ) || []
  ).length;
  if (emojiCount >= 1 && emojiCount <= 3) {
    score += 10;
    strengths.push("Uses emojis appropriately");
  } else if (emojiCount > 3) {
    score += 5;
    improvements.push("Consider reducing emoji usage");
  }

  // Local relevance
  const locationWords = ["bridgeland", "riverside", "calgary", "yyc"];
  const hasLocation = locationWords.some((word) =>
    content.toLowerCase().includes(word)
  );
  if (hasLocation) {
    score += 10;
    strengths.push("Includes local relevance");
  } else if (category === "Community") {
    improvements.push("Add local community references");
  }

  // Category-specific analysis
  switch (category) {
    case "Service Promotion":
      if (content.includes("book") || content.includes("schedule")) {
        score += 10;
        strengths.push("Strong service promotion");
      }
      break;
    case "Promotions":
      if (
        content.includes("limited") ||
        content.includes("time") ||
        content.includes("offer")
      ) {
        score += 10;
        strengths.push("Creates urgency for promotions");
      }
      break;
    case "Education":
      if (content.includes("tip") || content.includes("learn")) {
        score += 10;
        strengths.push("Educational content structure");
      }
      break;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    strengths,
    improvements,
  };
}

// ---------- Enhanced Post Creation ----------
function makePost(
  theme: string,
  channel: Post["channel"],
  biz: Biz,
  aiGenerated = false
): Post {
  const { title, body } = postTemplate(theme, biz);
  const hashtags = makeHashtags(biz.area, biz.services);

  // Enhanced UTM tracking for all platforms
  const platformParams = {
    GBP: { utm_source: "google", utm_medium: "gbp" },
    Instagram: { utm_source: "instagram", utm_medium: "social" },
    Facebook: { utm_source: "facebook", utm_medium: "social" },
    Twitter: { utm_source: "twitter", utm_medium: "social" },
    LinkedIn: { utm_source: "linkedin", utm_medium: "social" },
  };

  const utm = buildUrl(biz.booking, {
    ...platformParams[channel],
    utm_campaign: "belmont_" + monthCode(),
    utm_content: "post_" + todayISO(),
    utm_region: biz.area.toLowerCase().includes("bridgeland")
      ? "bridgeland"
      : "calgary",
  });

  // Platform-specific content formatting
  let bodyWithCTA = body;
  if (channel === "Instagram") {
    bodyWithCTA = `${body}\n\n${hashtags.slice(0, 10).join(" ")}`;
  } else if (channel === "Twitter") {
    bodyWithCTA = `${body}\n\n${hashtags.slice(0, 5).join(" ")}`;
  }

  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    title,
    body: bodyWithCTA,
    hashtags,
    utmUrl: utm,
    channel,
    theme,
    aiGenerated,
    performance: {
      views: Math.floor(Math.random() * 500) + 50,
      likes: Math.floor(Math.random() * 50) + 5,
      shares: Math.floor(Math.random() * 10),
      comments: Math.floor(Math.random() * 15),
      clicks: Math.floor(Math.random() * 20),
      engagementRate: Math.random() * 0.1,
      date: todayISO(),
    },
  };
}

// ---------- Hashtag Optimization ----------
function optimizeHashtags(
  hashtags: string[],
  performance: HashtagPerformance[] = []
): string[] {
  const topPerformers = performance
    .filter((h) => h.engagement > 50)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
    .map((h) => h.hashtag);

  return [...new Set([...topPerformers, ...hashtags])].slice(0, 15);
}

// ---------- Content Calendar Generation ----------
function generateContentCalendar(biz: Biz, weeks = 4): ContentCalendar[] {
  const calendars: ContentCalendar[] = [];
  const platforms = ["Instagram", "Facebook", "GBP"];

  for (let week = 0; week < weeks; week++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + week * 7);

    const posts: ScheduledPost[] = [];
    const themes = ["offer", "style", "neigh", "hours", "testimonial", "tips"];

    platforms.forEach((platform, platformIndex) => {
      const postDate = new Date(weekStart);
      postDate.setDate(postDate.getDate() + platformIndex);

      const theme = themes[platformIndex % themes.length];
      const post = makePost(theme, platform as Post["channel"], biz);

      posts.push({
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        date: postDate.toISOString().split("T")[0],
        time: ["10:00", "14:00", "18:00"][platformIndex % 3],
        platform,
        content: post,
        status: "draft",
      });
    });

    calendars.push({
      week: `Week ${week + 1}: ${weekStart.toLocaleDateString()}`,
      posts,
    });
  }

  return calendars;
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

  const size = useCallback(() => {
    return SIZES.find((s) => s.key === sizeKey) || SIZES[0];
  }, [sizeKey]);

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

  const render = useCallback(() => {
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
  }, [bgColor, fgColor, accentColor, title, subtitle, footer, handle, radius, overlayAlpha, imgSrc, size]);

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
    render,
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
  // No client API key; server-managed
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate>(
    AI_TEMPLATES[0]
  );
  const [calendar, setCalendar] = useState<ContentCalendar[]>([]);
  const [hashtagPerformance, setHashtagPerformance] = useState<
    HashtagPerformance[]
  >([]);
  const [activeTab, setActiveTab] = useState<string>("howto");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "Instagram",
    "Facebook",
    "GBP",
  ]);

  function loadBelmontSample() {
    try {
      setBiz(DEFAULT_BIZ);
      // Ensure standard platforms
      setSelectedPlatforms(["Instagram", "Facebook", "GBP"]);
      // Generate a small set of posts immediately
      const newPosts: Post[] = [];
      const order = ["offer", "style", "neigh", "hours"];
      ["Instagram", "GBP"].forEach((platform) => {
        order.forEach((theme) => newPosts.push(makePost(theme, platform as Post["channel"], DEFAULT_BIZ)));
      });
      setPosts((prev) => [...prev, ...newPosts]);
      setActiveTab("posts");
    } catch (e) {
      console.error(e);
    }
  }
  const [abTestVersionA, setAbTestVersionA] = useState<string>("");
  const [abTestVersionB, setAbTestVersionB] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [contentLibrary, setContentLibrary] = useState<ContentLibrary>({
    savedContent: [],
    templates: [],
    categories: [
      "Service Promotion",
      "Promotions",
      "Community",
      "Education",
      "Social Proof",
      "Brand Building",
    ],
  });
  const [selectedLibraryCategory, setSelectedLibraryCategory] =
    useState<string>("All");
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  const composer = useImageComposer();

  function copy(text: string, tag: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  // ---------- Enhanced Functions ----------
  async function handleGenerateAIContent() {
    setIsGenerating(true);
    try {
      const result = await generateAIContent(
        selectedTemplate,
        biz,
        biz.services[0],
        "professional yet approachable",
        customInstructions
      );

      const newPost = makePost(
        selectedTemplate.category.toLowerCase(),
        selectedTemplate.platforms[0] as Post["channel"],
        biz,
        true
      );

      newPost.title = result.title;
      newPost.body = result.body;
      newPost.hashtags = result.hashtags;
      newPost.aiGenerated = true;

      // Add quality analysis to the post
      (newPost as any).quality = result.quality;

      setPosts((prev) => [...prev, newPost]);
      setActiveTab("posts");
    } catch (error) {
      console.error("AI generation failed:", error);
      try { (await import("@/lib/toast")).showToast("Failed to generate AI content.", "error"); } catch {}
    } finally {
      setIsGenerating(false);
    }
  }

  function generateMultiPlatform() {
    const newPosts: Post[] = [];
    const order = ["offer", "style", "neigh", "hours"];

    selectedPlatforms.forEach((platform) => {
      order.forEach((theme) => {
        newPosts.push(makePost(theme, platform as Post["channel"], biz));
      });
    });

    setPosts((prev) => [...prev, ...newPosts]);
    setActiveTab("posts");
  }

  function generateCalendar() {
    const newCalendar = generateContentCalendar(biz);
    setCalendar(newCalendar);
    setActiveTab("calendar");
  }

  function updateHashtagPerformance() {
    // Simulate hashtag performance data
    const hashtags = makeHashtags(biz.area, biz.services);
    const performance: HashtagPerformance[] = hashtags.map((hashtag) => ({
      hashtag,
      reach: Math.floor(Math.random() * 1000) + 100,
      engagement: Math.floor(Math.random() * 200) + 10,
      posts: Math.floor(Math.random() * 50) + 5,
      trend: ["up", "down", "stable"][Math.floor(Math.random() * 3)] as
        | "up"
        | "down"
        | "stable",
    }));

    setHashtagPerformance(performance);
  }

  // ---------- Content Library Functions ----------
  function savePostToLibrary(post: Post, tags: string[] = []) {
    const quality =
      (post as any).quality || calculateContentQuality(post.body, post.theme);
    const savedContent: SavedContent = {
      id: post.id + "_saved",
      title: post.title,
      body: post.body,
      hashtags: post.hashtags || [],
      theme: post.theme,
      platform: post.channel,
      aiGenerated: post.aiGenerated || false,
      qualityScore: quality.score,
      performance: post.performance || {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        clicks: 0,
        engagementRate: 0,
        date: todayISO(),
      },
      savedDate: todayISO(),
      tags,
      category: post.theme,
    };

    setContentLibrary((prev) => ({
      ...prev,
      savedContent: [...prev.savedContent, savedContent],
    }));

    // Toast notification
    import("@/lib/toast").then((m) => m.showToast("Content saved to library!", "success")).catch(() => {});
  }

  function loadFromLibrary(savedContent: SavedContent) {
    const newPost = makePost(savedContent.theme, savedContent.platform, biz);
    newPost.title = savedContent.title;
    newPost.body = savedContent.body;
    newPost.hashtags = savedContent.hashtags;
    newPost.aiGenerated = savedContent.aiGenerated;
    (newPost as any).quality = {
      score: savedContent.qualityScore,
      strengths: ["Loaded from library", "Previously successful content"],
      improvements: [],
    };

    setPosts((prev) => [...prev, newPost]);
    setActiveTab("posts");
    import("@/lib/toast").then((m) => m.showToast("Content loaded from library!", "success")).catch(() => {});
  }

  function deleteFromLibrary(contentId: string) {
    setContentLibrary((prev) => ({
      ...prev,
      savedContent: prev.savedContent.filter(
        (content) => content.id !== contentId
      ),
    }));
  }

  // ---------- Scheduling Functions ----------
  function schedulePost(post: Post, date: string, time: string) {
    const scheduledPost: ScheduledPost = {
      id: post.id + "_scheduled_" + Date.now(),
      date,
      time,
      platform: post.channel,
      content: post,
      status: "scheduled",
    };

    setScheduledPosts((prev) => [...prev, scheduledPost]);
    import("@/lib/toast").then((m) => m.showToast(`Post scheduled for ${date} at ${time} on ${post.channel}`, "success")).catch(() => {});
  }

  function updateScheduleStatus(
    scheduledPostId: string,
    status: ScheduledPost["status"]
  ) {
    setScheduledPosts((prev) =>
      prev.map((post) =>
        post.id === scheduledPostId ? { ...post, status } : post
      )
    );
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
        title="AI Social Media Studio"
        subtitle="Generate AI-powered multi-platform content with analytics, scheduling, and performance tracking."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadBelmontSample}>
              <Sparkles className="h-4 w-4 mr-2" />
              Load Belmont Sample
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBiz(DEFAULT_BIZ);
                setPosts([]);
                setCalendar([]);
                setHashtagPerformance([]);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
            <Button onClick={generateMultiPlatform}>
              <Share2 className="h-4 w-4 mr-2" />
              Generate Multi-Platform
            </Button>
            <span className="advanced-only contents">
              <Button onClick={generateCalendar} variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Content Calendar
              </Button>
            </span>
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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard label="Posts" value={posts.length} hint="Generated" />
        <KPICard
          label="AI Generated"
          value={posts.filter((p) => p.aiGenerated).length}
          hint="Smart content"
        />
        <KPICard
          label="Platforms"
          value={selectedPlatforms.length}
          hint="Active"
        />
        <KPICard
          label="Calendar"
          value={calendar.length}
          hint="Weeks planned"
        />
        <KPICard
          label="Engagement"
          value={`${(posts.reduce((sum, p) => sum + (p.performance?.engagementRate || 0), 0) * 100) / Math.max(posts.length, 1) || 0}%`}
          hint="Avg rate"
        />
        <KPICard label="Status" value="Server-managed" hint="OpenAI API" />
      </div>

      <Tabs defaultValue="howto" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-12 gap-1">
          <TabsTrigger value="howto" className="text-xs">
            How To
          </TabsTrigger>
          <TabsTrigger value="ai-generate" className="text-xs advanced-only">
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="context" className="text-xs">
            Business
          </TabsTrigger>
          <TabsTrigger value="posts" className="text-xs">
            Posts
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs advanced-only">
            Quality
          </TabsTrigger>
          <TabsTrigger value="ab-test" className="text-xs advanced-only">
            A/B Test
          </TabsTrigger>
          <TabsTrigger value="library" className="text-xs advanced-only">
            Library
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="text-xs advanced-only">
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs advanced-only">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="hashtags" className="text-xs">
            Hashtags
          </TabsTrigger>
          <TabsTrigger value="designer" className="text-xs">
            Designer
          </TabsTrigger>
          <TabsTrigger value="exports" className="text-xs advanced-only">
            Exports
          </TabsTrigger>
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

        {/* AI Generate Tab */}
        <TabsContent value="ai-generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Powered Content Generation
              </CardTitle>
              <CardDescription>
                Generate professional, engaging content using artificial
                intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* No API key input needed – server-managed */}

                  <div>
                    <Label htmlFor="ai-template-select">Content Template</Label>
                    <select
                      id="ai-template-select"
                      title="Select AI content template"
                      className="w-full h-9 border rounded-md px-2"
                      value={AI_TEMPLATES.findIndex(
                        (t) => t.name === selectedTemplate.name
                      )}
                      onChange={(e) =>
                        setSelectedTemplate(
                          AI_TEMPLATES[parseInt(e.target.value)]
                        )
                      }
                    >
                      {AI_TEMPLATES.map((template, index) => (
                        <option key={template.name} value={index}>
                          {template.name} - {template.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">
                      {selectedTemplate.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedTemplate.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.platforms.map((platform) => (
                        <Badge
                          key={platform}
                          variant="outline"
                          className="text-xs"
                        >
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Selected Platforms</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PLATFORMS.map((platform) => {
                        const IconComponent = platform.icon;
                        return (
                          <button
                            key={platform.key}
                            onClick={() => {
                              setSelectedPlatforms((prev) =>
                                prev.includes(platform.key)
                                  ? prev.filter((p) => p !== platform.key)
                                  : [...prev, platform.key]
                              );
                            }}
                            className={`p-3 border rounded-lg text-left transition-colors ${
                              selectedPlatforms.includes(platform.key)
                                ? "border-primary bg-primary/10"
                                : "border-muted hover:border-primary/50"
                            }`}
                          >
                            <IconComponent className="h-5 w-5 mb-1" />
                            <div className="text-sm font-medium">
                              {platform.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Custom Instructions (Optional)</Label>
                    <Textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Add specific instructions like tone, style, or focus areas..."
                      className="min-h-[60px]"
                    />
                  </div>

                  <Button onClick={handleGenerateAIContent} disabled={isGenerating} className="w-full">
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate AI Content
                      </>
                    )}
                  </Button>
                </div>
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
                <div className="md:col-span-2">
                  <Label>Brand Voice</Label>
                  <Input
                    value={biz.brandVoice}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, brandVoice: e.target.value }))
                    }
                    placeholder="Professional yet approachable..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Target Audience</Label>
                  <Input
                    value={biz.targetAudience}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, targetAudience: e.target.value }))
                    }
                    placeholder="Local men seeking quality grooming..."
                  />
                </div>
                <div>
                  <Label>Facebook Handle</Label>
                  <Input
                    value={biz.fb || ""}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, fb: e.target.value }))
                    }
                    placeholder="facebook.com/yourpage"
                  />
                </div>
                <div>
                  <Label>Twitter Handle</Label>
                  <Input
                    value={biz.twitter || ""}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, twitter: e.target.value }))
                    }
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label>LinkedIn Profile</Label>
                  <Input
                    value={biz.linkedin || ""}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, linkedin: e.target.value }))
                    }
                    placeholder="linkedin.com/company/yourcompany"
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
                      <TableHead>Platform</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>AI Generated</TableHead>
                      <TableHead>Theme</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 w-fit"
                          >
                            {p.channel === "GBP" && (
                              <Target className="h-3 w-3" />
                            )}
                            {p.channel === "Instagram" && (
                              <Instagram className="h-3 w-3" />
                            )}
                            {p.channel === "Facebook" && (
                              <Facebook className="h-3 w-3" />
                            )}
                            {p.channel === "Twitter" && (
                              <Twitter className="h-3 w-3" />
                            )}
                            {p.channel === "LinkedIn" && (
                              <Linkedin className="h-3 w-3" />
                            )}
                            {p.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[180px] font-medium">
                          {p.title}
                        </TableCell>
                        <TableCell className="min-w-[300px] text-sm">
                          <div className="whitespace-pre-wrap line-clamp-3">
                            {p.body}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.aiGenerated ? (
                            <Badge
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              AI
                            </Badge>
                          ) : (
                            <Badge variant="outline">Manual</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.theme}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copy(p.body, `copy-body-${i}`)}
                              title="Copy content only"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copy(
                                  `# ${p.channel}: ${p.title}\n\n${p.body}\n\n${p.utmUrl}`,
                                  `copy-full-${i}`
                                )
                              }
                              title="Copy full post"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => savePostToLibrary(p)}
                              title="Save to library"
                            >
                              <BookOpen className="h-3 w-3" />
                            </Button>
                          </div>
                          {(copied === `copy-body-${i}` ||
                            copied === `copy-full-${i}`) && (
                            <Badge className="ml-2 text-xs">Copied</Badge>
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

        {/* Quality Analysis Tab */}
        <TabsContent value="quality" className="advanced-only">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Content Quality Analysis
              </CardTitle>
              <CardDescription>
                Analyze and improve the quality of your generated content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Content to Analyze
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate some posts first to see quality analysis.
                  </p>
                  <Button onClick={() => setActiveTab("ai-generate")}>
                    Generate Content
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post, index) => {
                    const quality =
                      (post as any).quality ||
                      calculateContentQuality(post.body, post.theme);
                    const scoreColor =
                      quality.score >= 80
                        ? "text-green-600"
                        : quality.score >= 60
                          ? "text-yellow-600"
                          : "text-red-600";

                    return (
                      <Card key={post.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {post.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{post.channel}</Badge>
                                {post.aiGenerated && (
                                  <Badge variant="secondary">AI</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-2xl font-bold ${scoreColor}`}
                              >
                                {quality.score}/100
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Quality Score
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2 text-green-600">
                                ✓ Strengths
                              </h4>
                              <ul className="list-disc pl-5 space-y-1 text-sm">
                                {quality.strengths.map((strength: string, i: number) => (
                                  <li key={i} className="text-green-700">
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {quality.improvements.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 text-orange-600">
                                  ⚠️ Suggestions
                                </h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                  {quality.improvements.map(
                                    (improvement: string, i: number) => (
                                      <li key={i} className="text-orange-700">
                                        {improvement}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                            <div className="bg-muted/50 p-3 rounded text-sm">
                              <p className="font-medium mb-1">Preview:</p>
                              <p className="text-muted-foreground line-clamp-2">
                                {post.body}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="ab-test" className="advanced-only">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                A/B Testing Studio
              </CardTitle>
              <CardDescription>
                Test different versions of your content to find what performs
                best
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Version A</h3>
                  <Textarea
                    value={abTestVersionA}
                    onChange={(e) => setAbTestVersionA(e.target.value)}
                    placeholder="Enter your first version of the content..."
                    className="min-h-[120px]"
                  />
                  <div className="text-sm text-muted-foreground">
                    Focus on: Clear call-to-action, engaging language
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Version B</h3>
                  <Textarea
                    value={abTestVersionB}
                    onChange={(e) => setAbTestVersionB(e.target.value)}
                    placeholder="Enter your second version of the content..."
                    className="min-h-[120px]"
                  />
                  <div className="text-sm text-muted-foreground">
                    Focus on: Emotional appeal, storytelling
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  Run A/B Test
                </Button>
                <Button variant="outline" className="flex-1">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Testing Tips</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    • Test one element at a time (headline, CTA, tone, length)
                  </li>
                  <li>
                    • Run tests for at least 7-14 days for meaningful results
                  </li>
                  <li>
                    • Test with similar audience sizes for fair comparison
                  </li>
                  <li>
                    • Focus on engagement metrics (likes, shares, comments)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Library Tab */}
        <TabsContent value="library" className="advanced-only">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Content Library
                </CardTitle>
                <CardDescription>
                  Save and reuse your best performing content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <select
                    className="px-3 py-2 border rounded-md"
                    value={selectedLibraryCategory}
                    onChange={(e) => setSelectedLibraryCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {contentLibrary.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    {contentLibrary.savedContent.length} saved items
                  </div>
                </div>

                {contentLibrary.savedContent.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Saved Content
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Save your best performing posts to build a reusable
                      content library.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {contentLibrary.savedContent
                      .filter(
                        (content) =>
                          selectedLibraryCategory === "All" ||
                          content.category === selectedLibraryCategory
                      )
                      .map((savedContent) => (
                        <Card key={savedContent.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">
                                    {savedContent.title}
                                  </h4>
                                  {savedContent.aiGenerated && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      AI
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {savedContent.platform}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {savedContent.body}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Quality: {savedContent.qualityScore}/100
                                  </span>
                                  <span>Saved: {savedContent.savedDate}</span>
                                  <span>
                                    Engagement:{" "}
                                    {(
                                      savedContent.performance.engagementRate *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadFromLibrary(savedContent)}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Load
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    deleteFromLibrary(savedContent.id)
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler" className="advanced-only">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Content Scheduler
              </CardTitle>
              <CardDescription>
                Schedule posts for automated publishing across platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Schedule New Post</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Select Post to Schedule</Label>
                      <select className="w-full h-9 border rounded-md px-2">
                        <option value="">Choose a post...</option>
                        {posts.map((post, index) => (
                          <option key={post.id} value={post.id}>
                            {post.title} ({post.channel})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Schedule Date</Label>
                      <Input type="date" min={todayISO()} />
                    </div>
                    <div>
                      <Label>Schedule Time</Label>
                      <Input type="time" defaultValue="10:00" />
                    </div>
                    <Button className="w-full">
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule Post
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Scheduled Posts</h3>
                  {scheduledPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No posts scheduled yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {scheduledPosts.map((scheduledPost) => (
                        <Card key={scheduledPost.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-sm">
                                  {scheduledPost.content.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {scheduledPost.date} at {scheduledPost.time}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {scheduledPost.platform}
                                  </Badge>
                                  <Badge
                                    variant={
                                      scheduledPost.status === "published"
                                        ? "default"
                                        : scheduledPost.status === "scheduled"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {scheduledPost.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {scheduledPost.status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateScheduleStatus(
                                        scheduledPost.id,
                                        "published"
                                      )
                                    }
                                  >
                                    Mark Published
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Scheduling Tips</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Post during peak hours for maximum engagement</li>
                  <li>• Space out posts across different platforms</li>
                  <li>• Consider your audience's timezone</li>
                  <li>
                    • Monitor performance and adjust timing based on results
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Plan and schedule your social media content across multiple
                weeks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {calendar.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Content Calendar Generated
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate a 4-week content calendar with posts for all
                    selected platforms.
                  </p>
                  <Button onClick={generateCalendar}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Generate Calendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {calendar.map((week, weekIndex) => (
                    <Card key={weekIndex}>
                      <CardHeader>
                        <CardTitle className="text-base">{week.week}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {week.posts.map((scheduledPost) => (
                            <div
                              key={scheduledPost.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-primary" />
                                  <span className="font-medium">
                                    {scheduledPost.platform}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {scheduledPost.date} at {scheduledPost.time}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {scheduledPost.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {scheduledPost.content.title}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {scheduledPost.content.theme}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="advanced-only">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Analytics
                </CardTitle>
                <CardDescription>
                  Track engagement and performance metrics across all platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {posts
                        .reduce(
                          (sum, p) => sum + (p.performance?.views || 0),
                          0
                        )
                        .toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Views
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {posts
                        .reduce(
                          (sum, p) => sum + (p.performance?.likes || 0),
                          0
                        )
                        .toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Likes
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {posts
                        .reduce(
                          (sum, p) => sum + (p.performance?.shares || 0),
                          0
                        )
                        .toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Shares
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {(
                        (posts.reduce(
                          (sum, p) =>
                            sum + (p.performance?.engagementRate || 0),
                          0
                        ) /
                          Math.max(posts.length, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg Engagement
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead>Post Title</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Engagement Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post, index) => (
                      <TableRow key={post.id || `post-${index}`}>
                        <TableCell>
                          <Badge variant="outline">{post.channel}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {post.title}
                        </TableCell>
                        <TableCell>
                          {post.performance?.views.toLocaleString()}
                        </TableCell>
                        <TableCell>{post.performance?.likes}</TableCell>
                        <TableCell>{post.performance?.comments}</TableCell>
                        <TableCell>{post.performance?.clicks}</TableCell>
                        <TableCell>
                          {(
                            (post.performance?.engagementRate || 0) * 100
                          ).toFixed(1)}
                          %
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Hashtags Tab */}
        <TabsContent value="hashtags">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Hashtag Optimization
              </CardTitle>
              <CardDescription>
                Analyze hashtag performance and get smart recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Button onClick={updateHashtagPerformance}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyze Hashtags
                </Button>
              </div>

              {hashtagPerformance.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hashtagPerformance.slice(0, 12).map((hashtag) => {
                      const trendVariant =
                        hashtag.trend === "up"
                          ? "default"
                          : hashtag.trend === "down"
                            ? "destructive"
                            : "secondary";
                      const trendIcon =
                        hashtag.trend === "up"
                          ? "↗"
                          : hashtag.trend === "down"
                            ? "↘"
                            : "→";

                      return (
                        <Card key={hashtag.hashtag}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {hashtag.hashtag}
                              </span>
                              <Badge variant={trendVariant} className="text-xs">
                                {trendIcon}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div>Reach: {hashtag.reach.toLocaleString()}</div>
                              <div>Engagement: {hashtag.engagement}</div>
                              <div>Posts: {hashtag.posts}</div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Recommended Hashtags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {hashtagPerformance
                          .filter((h) => h.engagement > 100)
                          .slice(0, 10)
                          .map((hashtag) => (
                            <Button
                              key={hashtag.hashtag}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copy(
                                  hashtag.hashtag,
                                  `hashtag-${hashtag.hashtag}`
                                )
                              }
                            >
                              {hashtag.hashtag}
                            </Button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
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
        <TabsContent value="exports" className="advanced-only">
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
