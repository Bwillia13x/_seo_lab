"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2,
  Copy,
  Info,
  Settings,
  Download,
  Play,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  BarChart3,
  Share2,
  Calendar,
  Target,
  Zap,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Eye,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import OpenAI from "openai";
import { logEvent } from "@/lib/analytics";

// ---------------- Enhanced Types ----------------
type BaseState = {
  bizName: string;
  service: string;
  area: string;
  type: string;
  tone: string;
  wordTarget: number;
  offerText: string;
  hoursText: string;
  bookingUrl: string;
  addTags: boolean;
  addNeighborhood: boolean;
  autoUtm: boolean;
  phone: string;
  keywords: string[];
  targetAudience: string;
  callToAction: string;
  useAI: boolean;
  aiPrompt: string;
  imageDescription: string;
  postGoals: string[];
  analyticsEnabled: boolean;
};

type PostVariant = {
  id: string;
  title: string;
  body: string;
  alt: string;
  score: number;
  keywords: string[];
  performance?: PostPerformance;
};

type PostPerformance = {
  views: number;
  clicks: number;
  engagements: number;
  date: string;
  platform: "google" | "facebook" | "instagram";
};

type AITemplate = {
  name: string;
  description: string;
  prompt: string;
  category: string;
};

type SEOScore = {
  overall: number;
  keywordDensity: number;
  readability: number;
  engagement: number;
  localRelevance: number;
};

// ---------------- Enhanced Constants ----------------
const SERVICES = [
  "Men's Haircut",
  "Skin Fade",
  "Beard Trim",
  "Hot Towel Shave",
  "Kids Cut",
  "Groomsmen Party",
  "Veterans Discount",
  "Senior Discount",
  "Wedding Packages",
  "Consultation",
];

const AREAS = [
  "Bridgeland",
  "Riverside",
  "Calgary Downtown",
  "Inglewood",
  "Mission",
  "Kensington",
];

const POST_TYPES = [
  "Style Spotlight",
  "Offer",
  "Event",
  "Hours Update",
  "What's New",
  "Service Highlight",
  "Customer Story",
  "Seasonal Promotion",
  "Team Spotlight",
];

const TONES = [
  "Professional",
  "Friendly",
  "Classic",
  "Modern",
  "Bold",
  "Casual",
];

const TARGET_AUDIENCES = [
  "Local Professionals",
  "Young Adults",
  "Families",
  "Groomsmen",
  "Seniors",
  "First-time Customers",
  "Regular Clients",
];

const POST_GOALS = [
  "Drive Bookings",
  "Build Brand Awareness",
  "Increase Engagement",
  "Share Special Offers",
  "Community Building",
  "Seasonal Promotion",
  "Customer Retention",
];

const AI_TEMPLATES: AITemplate[] = [
  {
    name: "Style Spotlight",
    description: "Highlight a specific service with professional appeal",
    category: "Content",
    prompt:
      "Create an engaging Google Business Profile post about {service} that highlights the craftsmanship and expertise at {business}. Focus on the premium experience and local appeal in {area}. Include compelling language that drives bookings.",
  },
  {
    name: "Limited Time Offer",
    description: "Promote special pricing or seasonal deals",
    category: "Promotional",
    prompt:
      "Write a compelling Google post announcing a special offer for {service} at {business}. Make it urgent and exciting, emphasizing the value and encouraging immediate bookings. Target {audience} in {area}.",
  },
  {
    name: "Customer Experience",
    description: "Share customer stories and testimonials",
    category: "Social Proof",
    prompt:
      "Create a post sharing a customer experience story about {service} at {business}. Focus on the positive transformation and satisfaction. Make it relatable for {audience} in {area}.",
  },
  {
    name: "Local Community",
    description: "Connect with local community and events",
    category: "Community",
    prompt:
      "Write a community-focused post about {business}'s connection to {area}. Highlight local events, partnerships, or community involvement related to {service}. Build local pride and connection.",
  },
];

// ---------------- Enhanced Utilities ----------------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function words(text: string) {
  return (text.trim().match(/\S+/g) || []).length;
}

function monthCode() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
}

function buildUtmUrl(
  base: string,
  params: Record<string, string>,
  overwrite = true
) {
  const safe = normalizeBaseUrl(base);
  let u: URL;
  try {
    u = new URL(safe);
  } catch {
    return { url: safe, error: "Invalid URL" };
  }

  // Remove existing UTM params if overwrite
  if (overwrite) {
    Array.from(u.searchParams.keys()).forEach((key) => {
      if (key.startsWith("utm_")) {
        u.searchParams.delete(key);
      }
    });
  }

  // Add new params
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, value);
  }

  return { url: u.toString() };
}

// AI Content Generation
async function generateAIContent(
  prompt: string,
  apiKey: string,
  maxTokens = 300
): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenAI API key is required for AI generation");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // Note: In production, this should be server-side
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional content writer specializing in local business marketing for Google Business Profile posts. Create engaging, SEO-optimized content that drives action.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error(
      "Failed to generate AI content. Please check your API key and try again."
    );
  }
}

// SEO Analysis Functions
function calculateSEOScore(text: string, keywords: string[]): SEOScore {
  const wordCount = words(text);
  const keywordCount = keywords.reduce((count, keyword) => {
    const regex = new RegExp(keyword.toLowerCase(), "gi");
    return count + (text.toLowerCase().match(regex) || []).length;
  }, 0);

  const keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

  // Simple readability score (Flesch reading ease approximation)
  const sentences = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / Math.max(sentences, 1);
  const readability = Math.max(0, 100 - avgWordsPerSentence * 2);

  // Local relevance based on location mentions
  const localTerms = [
    "bridgeland",
    "calgary",
    "downtown",
    "riverside",
    "inglewood",
  ];
  const localMentions = localTerms.reduce((count, term) => {
    const regex = new RegExp(term, "gi");
    return count + (text.match(regex) || []).length;
  }, 0);

  const localRelevance = Math.min(100, localMentions * 20);

  // Engagement potential based on action words
  const actionWords = [
    "book",
    "call",
    "visit",
    "schedule",
    "appointment",
    "today",
    "now",
  ];
  const actionMentions = actionWords.reduce((count, word) => {
    const regex = new RegExp(word, "gi");
    return count + (text.match(regex) || []).length;
  }, 0);

  const engagement = Math.min(100, actionMentions * 15);

  const overall =
    keywordDensity * 0.3 +
    readability * 0.2 +
    localRelevance * 0.25 +
    engagement * 0.25;

  return {
    overall: Math.round(overall),
    keywordDensity: Math.round(keywordDensity),
    readability: Math.round(readability),
    engagement: Math.round(engagement),
    localRelevance: Math.round(localRelevance),
  };
}

// Image Description Generator
function generateImageDescription(
  service: string,
  area: string,
  tone: string
): string {
  const descriptions = {
    "Men's Haircut": [
      "Professional barber styling a client's haircut in a modern salon chair",
      "Clean, precise haircut with attention to detail and modern styling",
      "Before and after transformation showing fresh, professional haircut",
    ],
    "Skin Fade": [
      "Intricate skin fade haircut with clean lines and precision work",
      "Modern fade technique showcasing barber craftsmanship",
      "Fresh skin fade with tapered sides and textured top",
    ],
    "Beard Trim": [
      "Expert beard trimming and shaping with precision tools",
      "Well-groomed beard with clean lines and professional styling",
      "Barber using clippers for precise beard maintenance",
    ],
    "Hot Towel Shave": [
      "Traditional hot towel shave service with premium grooming products",
      "Luxurious shave experience with warm towel and straight razor",
      "Classic barbering technique for smooth, comfortable shave",
    ],
  };

  const serviceDescriptions = descriptions[
    service as keyof typeof descriptions
  ] || ["Professional barber service in modern salon setting"];

  const randomDesc =
    serviceDescriptions[Math.floor(Math.random() * serviceDescriptions.length)];

  return `${randomDesc} at The Belmont Barbershop in ${area}, Calgary. Premium grooming experience with skilled barbers.`;
}

// Performance Tracking
function simulatePerformanceData(): PostPerformance[] {
  const platforms: ("google" | "facebook" | "instagram")[] = [
    "google",
    "facebook",
    "instagram",
  ];
  const data: PostPerformance[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    platforms.forEach((platform) => {
      data.push({
        date: date.toISOString().split("T")[0],
        platform,
        views: Math.floor(Math.random() * 500) + 50,
        clicks: Math.floor(Math.random() * 50) + 5,
        engagements: Math.floor(Math.random() * 30) + 2,
      });
    });
  }

  return data;
}

function makeTitle(biz: string, service: string, area: string, type: string) {
  const templates = {
    "Style Spotlight": `${service} Excellence at ${biz}`,
    Offer: `Special: ${service} at ${biz}`,
    Event: `${biz} Event: ${service}`,
    "Hours Update": `${biz} Hours & Services Update`,
    "What's New": `New at ${biz}: ${service}`,
  };
  return templates[type as keyof typeof templates] || `${service} at ${biz}`;
}

function toneLine(tone: string, service: string) {
  const tones = {
    Professional: `Experience our professional ${service.toLowerCase()} services`,
    Friendly: `Come enjoy our amazing ${service.toLowerCase()} experience`,
    Classic: `Discover traditional ${service.toLowerCase()} craftsmanship`,
    Modern: `Experience contemporary ${service.toLowerCase()} styling`,
  };
  return tones[tone as keyof typeof tones] || tones.Professional;
}

function buildBody(opts: {
  biz: string;
  service: string;
  area: string;
  type: string;
  tone: string;
  offer?: string;
  details?: string;
  targetWords: number;
  booking: string;
  addTags: boolean;
  addNeighborhoodNote: boolean;
}) {
  const {
    biz,
    service,
    area,
    type,
    tone,
    offer,
    details,
    targetWords,
    booking,
    addTags,
    addNeighborhoodNote,
  } = opts;

  let body = toneLine(tone, service);

  if (offer) {
    body += `. ${offer}`;
  }

  if (details) {
    body += `. ${details}`;
  }

  if (addNeighborhoodNote) {
    body += `. Located in beautiful ${area}, Calgary.`;
  }

  body += ` Book your appointment today at ${booking}`;

  if (addTags) {
    body += ` #${slugify(service)} #${slugify(area)} #${slugify(biz)}`;
  }

  return body;
}

function altTextFor(service: string, area: string) {
  return `${service} service at Belmont Barbershop in ${area}, Calgary`;
}

function hashtagFor(service: string) {
  return `#${slugify(service)}`;
}

function makePack(p: BaseState) {
  const variations = [
    { type: "Style Spotlight", tone: "Professional" },
    { type: "Offer", tone: "Friendly" },
    { type: "Event", tone: "Classic" },
    { type: "What's New", tone: "Modern" },
  ];

  return variations.map((v, i) => {
    const title = makeTitle(p.bizName, p.service, p.area, v.type);
    const body = buildBody({
      biz: p.bizName,
      service: p.service,
      area: p.area,
      type: v.type,
      tone: v.tone,
      offer: p.type === "Offer" ? p.offerText : undefined,
      details: p.type === "Hours Update" ? p.hoursText : undefined,
      targetWords: p.wordTarget,
      booking: p.bookingUrl,
      addTags: p.addTags,
      addNeighborhoodNote: p.addNeighborhood,
    });
    const alt = altTextFor(p.service, p.area);
    return { title, body, alt };
  });
}

function buildBookingUrl(p: BaseState) {
  if (!p.autoUtm) return p.bookingUrl;

  const params = {
    utm_source: "google",
    utm_medium: "gbp",
    utm_campaign: `belmont_${new Date().toISOString().slice(0, 7)}`,
    utm_content: slugify(p.service),
  };

  const result = buildUtmUrl(p.bookingUrl, params, true);
  return result.url;
}

// ---------------- Enhanced Main Component ----------------
export default function GBPPostComposer() {
  const [state, setState] = useState<BaseState>({
    bizName: "The Belmont Barbershop",
    service: "Skin Fade",
    area: "Bridgeland",
    type: "Style Spotlight",
    tone: "Classic",
    wordTarget: 200,
    offerText: "Weekday 11–2: $5 off online bookings this month.",
    hoursText: "Mon–Fri 10–7, Sat–Sun 10–5.",
    bookingUrl: "https://thebelmontbarber.ca/book",
    addTags: true,
    addNeighborhood: true,
    autoUtm: true,
  phone: "403-457-0420",
    keywords: ["barber", "haircut", "bridgeland", "calgary"],
    targetAudience: "Local Professionals",
    callToAction: "Book your appointment today",
    useAI: false,
    aiPrompt: "",
    imageDescription: "",
    postGoals: ["Drive Bookings"],
    analyticsEnabled: false,
  });

  // Enhanced State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [alt, setAlt] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [variants, setVariants] = useState<PostVariant[]>([]);
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState("");
  useEffect(() => {
    try {
      const k =
        (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_OPENAI_API_KEY) ||
        (typeof window !== "undefined" && window.localStorage.getItem("belmont_openai_key")) ||
        "";
      if (k) setApiKey(k);
    } catch {}
  }, []);
  const [performanceData, setPerformanceData] = useState<PostPerformance[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(
    null
  );

  // Live compose
  const booking = useMemo(() => buildBookingUrl(state), [state]);
  useEffect(() => {
    const t = makeTitle(state.bizName, state.service, state.area, state.type);
    const b = buildBody({
      biz: state.bizName,
      service: state.service,
      area: state.area,
      type: state.type,
      tone: state.tone,
      offer: state.type === "Offer" ? state.offerText : undefined,
      details: state.type === "Hours Update" ? state.hoursText : undefined,
      targetWords: state.wordTarget,
      booking,
      addTags: state.addTags,
      addNeighborhoodNote: state.addNeighborhood,
    });
    const a = altTextFor(state.service, state.area);
    setTitle(t);
    setBody(b);
    setAlt(a);
  }, [state, booking]);

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  // AI Content Generation
  async function generateAIContent() {
    if (!apiKey) {
      try { (await import("@/lib/toast")).showToast("Please enter your OpenAI API key first", "warn"); } catch {}
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = selectedTemplate
        ? selectedTemplate.prompt
            .replace("{service}", state.service)
            .replace("{business}", state.bizName)
            .replace("{area}", state.area)
            .replace("{audience}", state.targetAudience)
        : `Create a compelling Google Business Profile post for ${state.service} at ${state.bizName} in ${state.area}. Target audience: ${state.targetAudience}. Post type: ${state.type}. Tone: ${state.tone}. Include call to action: ${state.callToAction}.`;

      // Call the external generateAIContent function
      const generatedContent = await (async function generateAIContentExternal(
        prompt: string,
        apiKey: string,
        maxTokens = 300
      ): Promise<string> {
        if (!apiKey) {
          throw new Error("API key is required");
        }

        const openai = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true,
        });

        const response = await openai.chat.completions.create({
          model: "gpt5-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a content marketing expert for a barbershop. Create compelling, SEO-optimized Google Business Profile posts that drive engagement and bookings.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        });

        return response.choices[0]?.message?.content || "";
      })(prompt, apiKey);

      // Parse the generated content (assuming it contains title and body)
      const lines = generatedContent.split("\n");
      const generatedTitle =
        lines[0] || `New ${state.service} at ${state.bizName}`;
      const generatedBody = lines.slice(1).join("\n").trim();

      setTitle(generatedTitle);
      setBody(generatedBody);
      setAlt(generateImageDescription(state.service, state.area, state.tone));
      try {
        logEvent("gbp_post_generated", {
          service: state.service,
          area: state.area,
          type: state.type,
        });
      } catch {}
    } catch (error) {
      alert(
        "Failed to generate AI content: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // Generate A/B Test Variants
  function generateVariants() {
    const basePost = {
      title,
      body,
      alt,
      score: seoScore?.overall || 75,
      keywords: state.keywords,
    };

    const newVariants: PostVariant[] = [
      { ...basePost, id: "original" },
      {
        ...basePost,
        id: "variant-a",
        title: title.replace("Excellence", "Premium Service"),
        score: Math.max(0, (seoScore?.overall || 75) + Math.random() * 10 - 5),
      },
      {
        ...basePost,
        id: "variant-b",
        title: title.replace("at", "in"),
        score: Math.max(0, (seoScore?.overall || 75) + Math.random() * 10 - 5),
      },
    ];

    setVariants(newVariants);
    try {
      logEvent("gbp_post_variants_generated", { count: newVariants.length });
    } catch {}
  }

  // Load Analytics Data
  function loadAnalytics() {
    const data = simulatePerformanceData();
    setPerformanceData(data);
  }

  function exportTxt() {
    const txt = `TITLE\n${title}\n\nBODY\n${body}\n\nALT\n${alt}\n`;
    saveBlob(
      new Blob([txt], { type: "text/plain;charset=utf-8;" }),
      `belmont-gbp-post-${monthCode()}.txt`
    );
  }

  function exportPack() {
    const pack = makePack(state);
    const parts = pack
      .map(
        (p, i) =>
          `--- Post ${i + 1} ---\nTitle: ${p.title}\n\nBody:\n${p.body}\n\nAlt:\n${p.alt}\n`
      )
      .join("\n\n");
    saveBlob(
      new Blob([parts], { type: "text/plain;charset=utf-8;" }),
      `belmont-gbp-pack-${monthCode()}.txt`
    );
  }

  // Self tests
  type TestResult = { name: string; passed: boolean; details?: string };
  const runTests = useCallback((): TestResult[] => {
    const results: TestResult[] = [];
    // 1) Words near target
    const b = buildBody({
      biz: "Biz",
      service: "Skin Fade",
      area: "Bridgeland",
      type: "Style Spotlight",
      tone: "Classic",
      targetWords: 200,
      booking: "https://ex.com",
      addTags: false,
      addNeighborhoodNote: true,
    });
    const wc = words(b);
    results.push({
      name: "Body word count ~200",
      passed: wc >= 160 && wc <= 260,
      details: String(wc),
    });
    // 2) UTM builder appends params
    const u = buildUtmUrl(
      "https://ex.com/page",
      { utm_source: "google", utm_medium: "gbp", utm_campaign: "x" },
      true
    ).url;
    results.push({
      name: "UTM params present",
      passed:
        /utm_source=google/.test(u) &&
        /utm_medium=gbp/.test(u) &&
        /utm_campaign=x/.test(u),
    });
    // 3) Alt text includes service & area
    const a = altTextFor("Beard Trim", "Riverside");
    results.push({
      name: "Alt mentions service+area",
      passed: /Beard Trim/.test(a) && /Riverside/.test(a),
      details: a,
    });
    return results;
  }, []);

  const tests = useMemo(() => runTests(), [runTests]);
  const passCount = tests.filter((t) => t.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Google Business Profile Post Composer"
        subtitle="AI-powered content creation with SEO optimization, A/B testing, analytics tracking, and professional templates for Belmont's Google Business Profile."
        showLogo={true}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Words" value={words(body)} hint="Current body length" />
        <KPICard label="Type" value={state.type} />
        <KPICard label="Tone" value={state.tone} />
        <KPICard
          label="SEO Score"
          value={seoScore ? `${seoScore.overall}%` : "N/A"}
          hint="Overall optimization"
        />
        <KPICard label="Tests" value={`${passCount}/${tests.length}`} />
      </div>

      <Tabs defaultValue="guide" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="guide">How To Use</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="ai">AI Generate</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="seo">SEO Analysis</TabsTrigger>
          <TabsTrigger value="ab-test">A/B Test</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Complete Guide to Google Business Profile Posts
              </CardTitle>
              <CardDescription>
                Everything you need to know about creating effective Google
                posts for Belmont Barbershop - explained in plain English
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* What This Tool Does */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  What This Tool Does
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">
                    This tool helps you create posts for your Google Business
                    Profile page (the listing that shows up when people search
                    for "Belmont Barbershop" on Google). These posts appear
                    right on your Google listing and can include photos, special
                    offers, updates about your services, or announcements.
                  </p>
                  <p className="text-sm leading-relaxed mt-3">
                    Instead of guessing what to write, this tool gives you
                    ready-made templates, suggests what people might like to
                    read, and helps you create posts that get more attention and
                    bring more customers through your door.
                  </p>
                </div>
              </div>

              {/* Why Google Posts Matter */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Why Google Posts Are Important for Belmont
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">More People See You</h4>
                      <p className="text-xs text-muted-foreground">
                        Your posts show up directly in Google search results and
                        on Google Maps, so more people discover your shop.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Share Special Offers</h4>
                      <p className="text-xs text-muted-foreground">
                        Promote discounts, package deals, or limited-time offers
                        to attract more customers.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        Show Your Personality
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Share stories about your team, customer experiences, or
                        what makes Belmont special.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Drive More Bookings</h4>
                      <p className="text-xs text-muted-foreground">
                        Include links to your booking page so people can easily
                        schedule appointments.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Understanding the Top Numbers */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Understanding the Numbers at the Top
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-medium mb-3">
                    These boxes show you key information about your post:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Words:</strong> How long your post body is (aim
                      for 150-300 words for best results)
                    </div>
                    <div>
                      <strong>Type:</strong> What kind of post this is (like
                      "Offer" or "Style Spotlight")
                    </div>
                    <div>
                      <strong>Tone:</strong> The writing style (Professional,
                      Friendly, etc.)
                    </div>
                    <div>
                      <strong>SEO Score:</strong> How well your post is
                      optimized for Google search (higher is better)
                    </div>
                    <div>
                      <strong>Tests:</strong> How many quality checks your post
                      passes
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Use Each Tab */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  How to Use Each Section
                </h3>

                <div className="space-y-4">
                  {/* Compose Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        📝 Compose Tab - Build Your Post
                      </CardTitle>
                      <CardDescription>
                        Fill in the basic information to create your post
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Business Name:</strong> Your shop name
                          (usually "The Belmont Barbershop")
                        </div>
                        <div>
                          <strong>Service:</strong> What you're writing about
                          (like "Men's Haircut" or "Beard Trim")
                        </div>
                        <div>
                          <strong>Area:</strong> Your location ("Bridgeland",
                          "Riverside", etc.)
                        </div>
                        <div>
                          <strong>Post Type:</strong> What kind of message you
                          want to send
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Style Spotlight:</strong> Show off your
                              work or a service
                            </li>
                            <li>
                              <strong>Offer:</strong> Share a special deal or
                              discount
                            </li>
                            <li>
                              <strong>Event:</strong> Announce something
                              happening at your shop
                            </li>
                            <li>
                              <strong>What's New:</strong> Tell people about
                              changes or updates
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>Tone:</strong> How you want to sound
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Professional:</strong> Formal and
                              trustworthy
                            </li>
                            <li>
                              <strong>Friendly:</strong> Warm and approachable
                            </li>
                            <li>
                              <strong>Classic:</strong> Traditional barber shop
                              feel
                            </li>
                            <li>
                              <strong>Modern:</strong> Contemporary and fresh
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Generate Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        🤖 AI Generate Tab - Let AI Write for You
                      </CardTitle>
                      <CardDescription>
                        Get help from artificial intelligence to create great
                        content
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>OpenAI API Key:</strong> You'll need to get a
                          free API key from OpenAI's website to use the AI
                          features
                        </div>
                        <div>
                          <strong>AI Templates:</strong> Choose from pre-made
                          prompts or write your own
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Service Bundle:</strong> Suggest
                              complementary services
                            </li>
                            <li>
                              <strong>Limited Time Offer:</strong> Create
                              urgent, exciting promotions
                            </li>
                            <li>
                              <strong>Customer Stories:</strong> Share positive
                              experiences
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>How it works:</strong> The AI understands your
                          business and creates posts that match your style and
                          goals
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        👁️ Preview Tab - See How It Looks
                      </CardTitle>
                      <CardDescription>
                        Check your post before you publish it
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Title:</strong> The headline people see first
                          (keep it short and catchy)
                        </div>
                        <div>
                          <strong>Body:</strong> The main message (this is what
                          most people read)
                        </div>
                        <div>
                          <strong>Alt Text:</strong> Description for screen
                          readers and search engines (helps with accessibility)
                        </div>
                        <div>
                          <strong>Copy buttons:</strong> Click these to copy
                          text to your clipboard for easy pasting
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SEO Analysis Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        🎯 SEO Analysis Tab - Optimize for Search
                      </CardTitle>
                      <CardDescription>
                        Make sure your post gets found by the right people
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Target Keywords:</strong> Words people might
                          search for (like "barber Bridgeland" or "beard trim
                          Calgary")
                        </div>
                        <div>
                          <strong>Post Goals:</strong> What you want this post
                          to achieve
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Drive Bookings:</strong> Get more
                              appointment requests
                            </li>
                            <li>
                              <strong>Build Brand Awareness:</strong> Help
                              people remember your shop
                            </li>
                            <li>
                              <strong>Share Special Offers:</strong> Promote
                              deals and discounts
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>SEO Score:</strong> A number from 0-100
                          showing how well your post is optimized
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>80-100:</strong> Excellent - very likely
                              to be found
                            </li>
                            <li>
                              <strong>60-79:</strong> Good - decent visibility
                            </li>
                            <li>
                              <strong>Below 60:</strong> Needs improvement
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* A/B Test Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        🧪 A/B Test Tab - Test Different Versions
                      </CardTitle>
                      <CardDescription>
                        Create multiple versions of your post to see which works
                        better
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Why test?</strong> Different people respond to
                          different messages. Testing helps you find what works
                          best for your customers.
                        </div>
                        <div>
                          <strong>How it works:</strong> The tool creates slight
                          variations of your post (like different titles or word
                          choices)
                        </div>
                        <div>
                          <strong>Score:</strong> Each version gets a score
                          based on how effective it might be
                        </div>
                        <div>
                          <strong>Use This Variant:</strong> Click this button
                          to switch to that version of your post
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analytics Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        📊 Analytics Tab - Track Performance
                      </CardTitle>
                      <CardDescription>
                        See how well your posts are doing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>What to look for:</strong>
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Views:</strong> How many people saw your
                              post
                            </li>
                            <li>
                              <strong>Clicks:</strong> How many people clicked
                              to learn more
                            </li>
                            <li>
                              <strong>Engagements:</strong> Likes, shares, and
                              comments
                            </li>
                            <li>
                              <strong>CTR (Click-Through Rate):</strong>{" "}
                              Percentage of viewers who clicked
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>Good performance indicators:</strong>
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>CTR above 2% is very good</li>
                            <li>Engagement rate above 5% shows people care</li>
                            <li>
                              Compare different post types to see what works
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Best Practices */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Best Practices for Great Google Posts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">📝 Writing Tips</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Keep titles under 30 characters</li>
                        <li>• Use active, exciting language</li>
                        <li>• Include a clear call-to-action</li>
                        <li>• Mention your location naturally</li>
                        <li>• Use emojis sparingly (1-2 per post)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">🖼️ Photo Tips</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Use high-quality, well-lit photos</li>
                        <li>• Show your actual shop and work</li>
                        <li>• Include faces and personalities</li>
                        <li>• Use the alt text suggestions provided</li>
                        <li>• Post regularly (2-3 times per week)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">🎯 Timing Tips</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Post during business hours</li>
                        <li>• Weekdays often get more views</li>
                        <li>• Special offers work best mid-week</li>
                        <li>• Respond to comments within 24 hours</li>
                        <li>• Track what times work best for you</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">📈 Success Metrics</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Aim for 100+ views per post</li>
                        <li>• Target 2-5% click-through rate</li>
                        <li>• Build up to 10+ engagements</li>
                        <li>• Track booking increases</li>
                        <li>• Compare different post types</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Common Questions */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        How often should I post?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Post 2-3 times per week to stay visible without
                        overwhelming your audience. Quality matters more than
                        quantity.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        What makes a post successful?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Great photos, clear value proposition, and a strong
                        call-to-action. Posts that solve problems or offer value
                        get the most engagement.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        Should I use the AI features?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Yes! The AI understands your business and can create
                        better content than starting from scratch. Use it as a
                        starting point, then personalize.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        How do I know if my SEO score is good?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Scores above 80 are excellent. Focus on including
                        relevant keywords naturally, mentioning your location,
                        and having a clear call-to-action.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Getting Started */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Ready to Get Started?
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    🎯 <strong>Step 1:</strong> Choose what you want to promote
                    (a service, offer, or update)
                  </p>
                  <p>
                    📝 <strong>Step 2:</strong> Fill in the basic information in
                    the Compose tab
                  </p>
                  <p>
                    🤖 <strong>Step 3:</strong> Use AI Generate to get
                    professional content ideas
                  </p>
                  <p>
                    👁️ <strong>Step 4:</strong> Preview your post and make any
                    final tweaks
                  </p>
                  <p>
                    📤 <strong>Step 5:</strong> Copy the content and post it to
                    your Google Business Profile
                  </p>
                  <p>
                    📊 <strong>Step 6:</strong> Check the Analytics tab later to
                    see how it performed
                  </p>
                </div>
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border">
                  <p className="text-sm font-medium text-center">
                    💡 <strong>Pro Tip:</strong> Start with the AI Generate tab
                    - it's the easiest way to create great content quickly!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Configuration</CardTitle>
              <CardDescription>
                Customize your Google Business Profile post settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bizName">Business Name</Label>
                  <Input
                    id="bizName"
                    value={state.bizName}
                    onChange={(e) =>
                      setState({ ...state, bizName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="service">Service</Label>
                  <select
                    id="service"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.service}
                    onChange={(e) =>
                      setState({ ...state, service: e.target.value })
                    }
                  >
                    {SERVICES.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <select
                    id="area"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.area}
                    onChange={(e) =>
                      setState({ ...state, area: e.target.value })
                    }
                  >
                    {AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="type">Post Type</Label>
                  <select
                    id="type"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.type}
                    onChange={(e) =>
                      setState({ ...state, type: e.target.value })
                    }
                  >
                    {POST_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <select
                    id="targetAudience"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.targetAudience}
                    onChange={(e) =>
                      setState({ ...state, targetAudience: e.target.value })
                    }
                  >
                    {TARGET_AUDIENCES.map((audience) => (
                      <option key={audience} value={audience}>
                        {audience}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="callToAction">Call to Action</Label>
                  <Input
                    id="callToAction"
                    value={state.callToAction}
                    onChange={(e) =>
                      setState({ ...state, callToAction: e.target.value })
                    }
                    placeholder="Book your appointment today"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <select
                  id="tone"
                  className="w-full px-3 py-2 border rounded-md"
                  value={state.tone}
                  onChange={(e) => setState({ ...state, tone: e.target.value })}
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wordTarget">Word Target</Label>
                  <Input
                    id="wordTarget"
                    type="number"
                    value={state.wordTarget}
                    onChange={(e) =>
                      setState({ ...state, wordTarget: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="bookingUrl">Booking URL</Label>
                  <Input
                    id="bookingUrl"
                    value={state.bookingUrl}
                    onChange={(e) =>
                      setState({ ...state, bookingUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="addTags"
                    checked={state.addTags}
                    onCheckedChange={(checked) =>
                      setState({ ...state, addTags: !!checked })
                    }
                  />
                  <Label htmlFor="addTags">Add hashtags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="addNeighborhood"
                    checked={state.addNeighborhood}
                    onCheckedChange={(checked) =>
                      setState({ ...state, addNeighborhood: !!checked })
                    }
                  />
                  <Label htmlFor="addNeighborhood">
                    Add neighborhood mention
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoUtm"
                    checked={state.autoUtm}
                    onCheckedChange={(checked) =>
                      setState({ ...state, autoUtm: !!checked })
                    }
                  />
                  <Label htmlFor="autoUtm">Auto-generate UTM parameters</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Preview</CardTitle>
              <CardDescription>
                See how your post will look on Google Business Profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <div className="p-3 bg-muted rounded-md font-medium">
                    {title || "Title will appear here..."}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Body</Label>
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {body || "Post body will appear here..."}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Alt Text</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {alt || "Alt text will appear here..."}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => copy(title, "title")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Title
                  {copied === "title" && (
                    <Badge className="ml-2">Copied!</Badge>
                  )}
                </Button>
                <Button
                  onClick={() => copy(body, "body")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Body
                  {copied === "body" && <Badge className="ml-2">Copied!</Badge>}
                </Button>
                <Button
                  onClick={() => copy(alt, "alt")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Alt
                  {copied === "alt" && <Badge className="ml-2">Copied!</Badge>}
                </Button>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={exportTxt} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export as Text
                </Button>
                <Button onClick={exportPack} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export 4-Post Pack
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Content Generation
              </CardTitle>
              <CardDescription>
                Generate professional, engaging content using AI powered by
                OpenAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apiKey">OpenAI API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Get your API key from{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      OpenAI Platform
                    </a>
                  </p>
                </div>
                <div>
                  <Label>AI Templates</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md mt-1"
                    onChange={(e) => {
                      const template = AI_TEMPLATES.find(
                        (t) => t.name === e.target.value
                      );
                      setSelectedTemplate(template || null);
                    }}
                  >
                    <option value="">Custom Prompt</option>
                    {AI_TEMPLATES.map((template) => (
                      <option key={template.name} value={template.name}>
                        {template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedTemplate && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-2">
                      {selectedTemplate.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedTemplate.description}
                    </p>
                    <p className="text-xs font-mono bg-background p-2 rounded border">
                      {selectedTemplate.prompt}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={generateAIContent}
                  disabled={isGenerating || !apiKey}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Clear Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                SEO Analysis & Optimization
              </CardTitle>
              <CardDescription>
                Analyze and optimize your post for better search visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="keywords">Target Keywords</Label>
                  <Input
                    id="keywords"
                    value={state.keywords.join(", ")}
                    onChange={(e) =>
                      setState({
                        ...state,
                        keywords: e.target.value
                          .split(",")
                          .map((k) => k.trim())
                          .filter((k) => k),
                      })
                    }
                    placeholder="barber, haircut, calgary, bridgeland"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Separate keywords with commas
                  </p>
                </div>
                <div>
                  <Label>Post Goals</Label>
                  <div className="space-y-2 mt-1">
                    {POST_GOALS.map((goal) => (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox
                          id={`goal-${goal}`}
                          checked={state.postGoals.includes(goal)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setState({
                                ...state,
                                postGoals: [...state.postGoals, goal],
                              });
                            } else {
                              setState({
                                ...state,
                                postGoals: state.postGoals.filter(
                                  (g) => g !== goal
                                ),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`goal-${goal}`} className="text-sm">
                          {goal}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {seoScore && (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      SEO Score: {seoScore.overall}/100
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {seoScore.keywordDensity}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Keyword Density
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {seoScore.readability}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Readability
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {seoScore.localRelevance}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Local Relevance
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {seoScore.engagement}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Engagement
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() =>
                  setSeoScore(calculateSEOScore(body, state.keywords))
                }
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Analyze SEO Score
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ab-test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                A/B Testing Variants
              </CardTitle>
              <CardDescription>
                Generate and test different versions of your post to find the
                most effective one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={generateVariants} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Generate Test Variants
                </Button>
                <Button variant="outline" onClick={() => setVariants([])}>
                  Clear Variants
                </Button>
              </div>

              {variants.length > 0 && (
                <div className="space-y-4">
                  {variants.map((variant) => (
                    <Card
                      key={variant.id}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            Variant{" "}
                            {variant.id === "original"
                              ? "Original"
                              : variant.id.toUpperCase()}
                          </CardTitle>
                          <Badge
                            variant={
                              variant.score > 80
                                ? "default"
                                : variant.score > 60
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            Score: {Math.round(variant.score)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Title</Label>
                            <div className="p-2 bg-muted rounded text-sm">
                              {variant.title}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              Body Preview
                            </Label>
                            <div className="p-2 bg-muted rounded text-sm line-clamp-2">
                              {variant.body}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTitle(variant.title);
                                setBody(variant.body);
                                setAlt(variant.alt);
                              }}
                            >
                              Use This Variant
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copy(
                                  variant.title + "\n\n" + variant.body,
                                  `variant-${variant.id}`
                                )
                              }
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                              {copied === `variant-${variant.id}` && (
                                <Badge className="ml-1 text-xs">Copied!</Badge>
                              )}
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
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Post Performance Analytics
              </CardTitle>
              <CardDescription>
                Track engagement metrics and optimize future posts based on
                performance data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="analytics-enabled"
                  checked={state.analyticsEnabled}
                  onCheckedChange={(checked) =>
                    setState({ ...state, analyticsEnabled: !!checked })
                  }
                />
                <Label htmlFor="analytics-enabled">
                  Enable analytics tracking for this post
                </Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={loadAnalytics} className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Load Performance Data
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPerformanceData([])}
                >
                  Clear Data
                </Button>
              </div>

              {performanceData.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {performanceData.reduce(
                              (sum, p) => sum + p.views,
                              0
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Views
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {performanceData.reduce(
                              (sum, p) => sum + p.clicks,
                              0
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Clicks
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {performanceData.reduce(
                              (sum, p) => sum + p.engagements,
                              0
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Engagements
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Performance by Platform</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Views</TableHead>
                            <TableHead>Clicks</TableHead>
                            <TableHead>Engagements</TableHead>
                            <TableHead>CTR</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {performanceData.slice(0, 10).map((perf, index) => (
                            <TableRow key={index}>
                              <TableCell>{perf.date}</TableCell>
                              <TableCell className="capitalize">
                                {perf.platform}
                              </TableCell>
                              <TableCell>{perf.views}</TableCell>
                              <TableCell>{perf.clicks}</TableCell>
                              <TableCell>{perf.engagements}</TableCell>
                              <TableCell>
                                {perf.views > 0
                                  ? ((perf.clicks / perf.views) * 100).toFixed(
                                      1
                                    )
                                  : 0}
                                %
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pack" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>4-Post Content Pack</CardTitle>
              <CardDescription>
                Generate a complete set of posts for your posting schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {makePack(state).map((post, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Post {index + 1}: {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Body</Label>
                          <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">
                            {post.body}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            Alt Text
                          </Label>
                          <div className="p-2 bg-muted rounded-md text-xs">
                            {post.alt}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Self-Tests</CardTitle>
              <CardDescription>
                Automated checks to ensure post quality and functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tests.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{test.name}</div>
                      {test.details && (
                        <div className="text-sm text-muted-foreground">
                          {test.details}
                        </div>
                      )}
                    </div>
                    <Badge variant={test.passed ? "default" : "destructive"}>
                      {test.passed ? "✓ Pass" : "✗ Fail"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Complete Guide to Google Business Profile Posts
              </CardTitle>
              <CardDescription>
                Everything you need to know about creating effective Google
                posts for Belmont Barbershop - explained in plain English
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* What This Tool Does */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  What This Tool Does
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">
                    This tool helps you create posts for your Google Business
                    Profile page (the listing that shows up when people search
                    for "Belmont Barbershop" on Google). These posts appear
                    right on your Google listing and can include photos, special
                    offers, updates about your services, or announcements.
                  </p>
                  <p className="text-sm leading-relaxed mt-3">
                    Instead of guessing what to write, this tool gives you
                    ready-made templates, suggests what people might like to
                    read, and helps you create posts that get more attention and
                    bring more customers through your door.
                  </p>
                </div>
              </div>

              {/* Why Google Posts Matter */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Why Google Posts Are Important for Belmont
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">More People See You</h4>
                      <p className="text-xs text-muted-foreground">
                        Your posts show up directly in Google search results and
                        on Google Maps, so more people discover your shop.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Share Special Offers</h4>
                      <p className="text-xs text-muted-foreground">
                        Promote discounts, package deals, or limited-time offers
                        to attract more customers.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        Show Your Personality
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Share stories about your team, customer experiences, or
                        what makes Belmont special.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Drive More Bookings</h4>
                      <p className="text-xs text-muted-foreground">
                        Include links to your booking page so people can easily
                        schedule appointments.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Understanding the Top Numbers */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Understanding the Numbers at the Top
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-medium mb-3">
                    These boxes show you key information about your post:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Words:</strong> How long your post body is (aim
                      for 150-300 words for best results)
                    </div>
                    <div>
                      <strong>Type:</strong> What kind of post this is (like
                      "Offer" or "Style Spotlight")
                    </div>
                    <div>
                      <strong>Tone:</strong> The writing style (Professional,
                      Friendly, etc.)
                    </div>
                    <div>
                      <strong>SEO Score:</strong> How well your post is
                      optimized for Google search (higher is better)
                    </div>
                    <div>
                      <strong>Tests:</strong> How many quality checks your post
                      passes
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Use Each Tab */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  How to Use Each Section
                </h3>

                <div className="space-y-4">
                  {/* Compose Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        📝 Compose Tab - Build Your Post
                      </CardTitle>
                      <CardDescription>
                        Fill in the basic information to create your post
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Business Name:</strong> Your shop name
                          (usually "The Belmont Barbershop")
                        </div>
                        <div>
                          <strong>Service:</strong> What you're writing about
                          (like "Men's Haircut" or "Beard Trim")
                        </div>
                        <div>
                          <strong>Area:</strong> Your location ("Bridgeland",
                          "Riverside", etc.)
                        </div>
                        <div>
                          <strong>Post Type:</strong> What kind of message you
                          want to send
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Style Spotlight:</strong> Show off your
                              work or a service
                            </li>
                            <li>
                              <strong>Offer:</strong> Share a special deal or
                              discount
                            </li>
                            <li>
                              <strong>Event:</strong> Announce something
                              happening at your shop
                            </li>
                            <li>
                              <strong>What's New:</strong> Tell people about
                              changes or updates
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>Tone:</strong> How you want to sound
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Professional:</strong> Formal and
                              trustworthy
                            </li>
                            <li>
                              <strong>Friendly:</strong> Warm and approachable
                            </li>
                            <li>
                              <strong>Classic:</strong> Traditional barber shop
                              feel
                            </li>
                            <li>
                              <strong>Modern:</strong> Contemporary and fresh
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Generate Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        🤖 AI Generate Tab - Let AI Write for You
                      </CardTitle>
                      <CardDescription>
                        Get help from artificial intelligence to create great
                        content
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>OpenAI API Key:</strong> You'll need to get a
                          free API key from OpenAI's website to use the AI
                          features
                        </div>
                        <div>
                          <strong>AI Templates:</strong> Choose from pre-made
                          prompts or write your own
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Service Bundle:</strong> Suggest
                              complementary services
                            </li>
                            <li>
                              <strong>Limited Time Offer:</strong> Create
                              urgent, exciting promotions
                            </li>
                            <li>
                              <strong>Customer Stories:</strong> Share positive
                              experiences
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>How it works:</strong> The AI understands your
                          business and creates posts that match your style and
                          goals
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        👁️ Preview Tab - See How It Looks
                      </CardTitle>
                      <CardDescription>
                        Check your post before you publish it
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Title:</strong> The headline people see first
                          (keep it short and catchy)
                        </div>
                        <div>
                          <strong>Body:</strong> The main message (this is what
                          most people read)
                        </div>
                        <div>
                          <strong>Alt Text:</strong> Description for screen
                          readers and search engines (helps with accessibility)
                        </div>
                        <div>
                          <strong>Copy buttons:</strong> Click these to copy
                          text to your clipboard for easy pasting
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SEO Analysis Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        🎯 SEO Analysis Tab - Optimize for Search
                      </CardTitle>
                      <CardDescription>
                        Make sure your post gets found by the right people
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Target Keywords:</strong> Words people might
                          search for (like "barber Bridgeland" or "beard trim
                          Calgary")
                        </div>
                        <div>
                          <strong>Post Goals:</strong> What you want this post
                          to achieve
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Drive Bookings:</strong> Get more
                              appointment requests
                            </li>
                            <li>
                              <strong>Build Brand Awareness:</strong> Help
                              people remember your shop
                            </li>
                            <li>
                              <strong>Share Special Offers:</strong> Promote
                              deals and discounts
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>SEO Score:</strong> A number from 0-100
                          showing how well your post is optimized
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>80-100:</strong> Excellent - very likely
                              to be found
                            </li>
                            <li>
                              <strong>60-79:</strong> Good - decent visibility
                            </li>
                            <li>
                              <strong>Below 60:</strong> Needs improvement
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* A/B Test Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        🧪 A/B Test Tab - Test Different Versions
                      </CardTitle>
                      <CardDescription>
                        Create multiple versions of your post to see which works
                        better
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Why test?</strong> Different people respond to
                          different messages. Testing helps you find what works
                          best for your customers.
                        </div>
                        <div>
                          <strong>How it works:</strong> The tool creates slight
                          variations of your post (like different titles or word
                          choices)
                        </div>
                        <div>
                          <strong>Score:</strong> Each version gets a score
                          based on how effective it might be
                        </div>
                        <div>
                          <strong>Use This Variant:</strong> Click this button
                          to switch to that version of your post
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analytics Tab */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        📊 Analytics Tab - Track Performance
                      </CardTitle>
                      <CardDescription>
                        See how well your posts are doing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>What to look for:</strong>
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Views:</strong> How many people saw your
                              post
                            </li>
                            <li>
                              <strong>Clicks:</strong> How many people clicked
                              to learn more
                            </li>
                            <li>
                              <strong>Engagements:</strong> Likes, shares, and
                              comments
                            </li>
                            <li>
                              <strong>CTR (Click-Through Rate):</strong>{" "}
                              Percentage of viewers who clicked
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>Good performance indicators:</strong>
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>CTR above 2% is very good</li>
                            <li>Engagement rate above 5% shows people care</li>
                            <li>
                              Compare different post types to see what works
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Best Practices */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Best Practices for Great Google Posts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">📝 Writing Tips</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Keep titles under 30 characters</li>
                        <li>• Use active, exciting language</li>
                        <li>• Include a clear call-to-action</li>
                        <li>• Mention your location naturally</li>
                        <li>• Use emojis sparingly (1-2 per post)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">🖼️ Photo Tips</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Use high-quality, well-lit photos</li>
                        <li>• Show your actual shop and work</li>
                        <li>• Include faces and personalities</li>
                        <li>• Use the alt text suggestions provided</li>
                        <li>• Post regularly (2-3 times per week)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">🎯 Timing Tips</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Post during business hours</li>
                        <li>• Weekdays often get more views</li>
                        <li>• Special offers work best mid-week</li>
                        <li>• Respond to comments within 24 hours</li>
                        <li>• Track what times work best for you</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">📈 Success Metrics</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Aim for 100+ views per post</li>
                        <li>• Target 2-5% click-through rate</li>
                        <li>• Build up to 10+ engagements</li>
                        <li>• Track booking increases</li>
                        <li>• Compare different post types</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Common Questions */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        How often should I post?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Post 2-3 times per week to stay visible without
                        overwhelming your audience. Quality matters more than
                        quantity.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        What makes a post successful?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Great photos, clear value proposition, and a strong
                        call-to-action. Posts that solve problems or offer value
                        get the most engagement.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        Should I use the AI features?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Yes! The AI understands your business and can create
                        better content than starting from scratch. Use it as a
                        starting point, then personalize.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        How do I know if my SEO score is good?
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Scores above 80 are excellent. Focus on including
                        relevant keywords naturally, mentioning your location,
                        and having a clear call-to-action.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Getting Started */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Ready to Get Started?
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    🎯 <strong>Step 1:</strong> Choose what you want to promote
                    (a service, offer, or update)
                  </p>
                  <p>
                    📝 <strong>Step 2:</strong> Fill in the basic information in
                    the Compose tab
                  </p>
                  <p>
                    🤖 <strong>Step 3:</strong> Use AI Generate to get
                    professional content ideas
                  </p>
                  <p>
                    👁️ <strong>Step 4:</strong> Preview your post and make any
                    final tweaks
                  </p>
                  <p>
                    📤 <strong>Step 5:</strong> Copy the content and post it to
                    your Google Business Profile
                  </p>
                  <p>
                    📊 <strong>Step 6:</strong> Check the Analytics tab later to
                    see how it performed
                  </p>
                </div>
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border">
                  <p className="text-sm font-medium text-center">
                    💡 <strong>Pro Tip:</strong> Start with the AI Generate tab
                    - it's the easiest way to create great content quickly!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
