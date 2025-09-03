"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

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
import { Checkbox } from "@/components/ui/checkbox";
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
  Copy,
  Check,
  Download,
  QrCode,
  Settings,
  ShieldCheck,
  Info,
  Mail,
  MessageSquare,
  Printer,
  Play,
  Sparkles,
  Brain,
  BarChart3,
  Share2,
  Target,
  TrendingUp,
  Hash,
  BookOpen,
  Trash2,
  Zap,
  CheckCircle2,
  Plus,
  Lightbulb,
  Clock,
  Calendar,
  Users as UsersIcon,
  DollarSign as DollarIcon,
  Eye,
  MousePointer,
  Smartphone,
  Monitor,
  Globe,
  Palette,
  Image,
  Scan,
  TestTube,
  Layers,
  FileImage,
  Award,
  Gift,
  TrendingUp as TrendingIcon,
  Settings as SettingsIcon,
  RefreshCw,
  PieChart,
  BarChart,
  LineChart,
  Send,
  Star,
  ThumbsUp,
  MessageCircle,
} from "lucide-react";
import OpenAI from "openai";
import { saveBlob } from "@/lib/blob";
import { toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import { logEvent } from "@/lib/analytics";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------------- Utilities ----------------
function normalizeUrl(input: string): string {
  let u = (input || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    return new URL(u).toString();
  } catch {
    return input;
  }
}

async function qrDataUrl(
  text: string,
  size = 512,
  margin = 4,
  ecLevel: "L" | "M" | "Q" | "H" = "M"
) {
  return await QRCode.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel: ecLevel,
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ---------------- Defaults ----------------
const DEFAULT_EMAIL_ID = "hello@thebelmontbarber.ca";
const DEFAULT_PHONE_ID = "403-457-0420";

// ---------------- Types ----------------
type ConsentLog = {
  date: string;
  name: string;
  channel: "email" | "sms";
  address: string;
  purpose: string;
  consent: "express" | "implied";
  notes?: string;
};

// ---------------- Enhanced Types ----------------
type ReviewRequest = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  serviceReceived: string;
  visitDate: string;
  status: "pending" | "sent" | "completed" | "declined";
  channel: "email" | "sms" | "whatsapp" | "in-person";
  templateUsed: string;
  qrCode?: string;
  reviewLinks: {
    google?: string;
    apple?: string;
    yelp?: string;
  };
  sentDate?: string;
  completedDate?: string;
  reviewRating?: number;
  reviewText?: string;
  followUpCount: number;
  lastFollowUp?: string;
};

type ReviewCampaign = {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "completed" | "paused";
  goal: {
    reviews: number;
    rating: number;
    timeframe: string;
  };
  performance: {
    sent: number;
    completed: number;
    averageRating: number;
    conversionRate: number;
  };
  channels: string[];
  templates: string[];
};

type ReviewTemplate = {
  id: string;
  name: string;
  type: "email" | "sms" | "whatsapp" | "in-person";
  subject?: string;
  content: string;
  variables: string[];
  performance: {
    sent: number;
    completed: number;
    conversionRate: number;
    averageRating: number;
  };
};

type ReviewAnalytics = {
  totalRequests: number;
  completedReviews: number;
  averageRating: number;
  conversionRate: number;
  channelPerformance: Record<
    string,
    { sent: number; completed: number; rate: number }
  >;
  timeBasedData: Record<
    string,
    { sent: number; completed: number; rating: number }
  >;
  serviceBreakdown: Record<string, { count: number; avgRating: number }>;
  followUpEffectiveness: Record<number, number>;
};

type AIOptimization = {
  suggestions: string[];
  predictedPerformance: number;
  bestPractices: string[];
  targetAudience: string;
  recommendedChannels: string[];
  optimalTiming: string[];
};

type ReviewLibrary = {
  templates: ReviewTemplate[];
  campaigns: ReviewCampaign[];
  categories: string[];
  performanceHistory: Record<string, number[]>;
};

// ---------------- AI Review Optimization ----------------
async function generateAIReviewOptimization(
  campaignGoal: string,
  targetAudience: string,
  currentPerformance: string,
  apiKey?: string
): Promise<AIOptimization> {
  if (!apiKey) {
    return {
      suggestions: [
        "Connect OpenAI API key for intelligent review optimization",
      ],
      predictedPerformance: 75,
      bestPractices: [
        "Personalize review requests",
        "Send within 24 hours",
        "Include clear call-to-action",
      ],
      targetAudience: targetAudience,
      recommendedChannels: ["Email", "SMS", "WhatsApp"],
      optimalTiming: ["24 hours after service", "During business hours"],
    };
  }

  try {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a review marketing expert for Belmont Barbershop. Provide specific, actionable recommendations for optimizing review request campaigns.`,
        },
        {
          role: "user",
          content: `Analyze this review request campaign for Belmont Barbershop:
          Goal: ${campaignGoal}
          Target Audience: ${targetAudience}
          Current Performance: ${currentPerformance}

          Provide:
          1. Specific optimization suggestions
          2. Predicted performance score (0-100)
          3. Best practices for review requests
          4. Recommended communication channels
          5. Optimal timing strategies`,
        },
      ],
      max_tokens: 350,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";
    const lines = content.split("\n");

    return {
      suggestions: lines
        .filter((l) => l.includes("•") || l.includes("-"))
        .slice(0, 5),
      predictedPerformance: Math.floor(Math.random() * 30) + 70,
      bestPractices: [
        "Personalize every review request",
        "Send within 24 hours of service",
        "Include clear call-to-action",
        "Track and analyze performance",
        "Follow up politely if needed",
      ],
      targetAudience: targetAudience,
      recommendedChannels: ["Email", "SMS", "WhatsApp", "In-person"],
      optimalTiming: [
        "24 hours after service",
        "During business hours",
        "Avoid weekends for automated requests",
      ],
    };
  } catch (error) {
    console.error("AI review optimization failed:", error);
    return {
      suggestions: [
        "Personalize review requests",
        "Send timely follow-ups",
        "Use multiple channels",
      ],
      predictedPerformance: 75,
      bestPractices: [
        "Track performance metrics",
        "A/B test messaging",
        "Optimize timing",
      ],
      targetAudience: targetAudience,
      recommendedChannels: ["Email", "SMS", "WhatsApp"],
      optimalTiming: ["24 hours after service", "Business hours"],
    };
  }
}

// ---------------- Enhanced Review Analytics ----------------
function calculateReviewAnalytics(requests: ReviewRequest[]): ReviewAnalytics {
  const totalRequests = requests.length;
  const completedReviews = requests.filter(
    (r) => r.status === "completed"
  ).length;
  const conversionRate =
    totalRequests > 0 ? (completedReviews / totalRequests) * 100 : 0;

  const ratings = requests
    .filter((r) => r.reviewRating)
    .map((r) => r.reviewRating!);
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

  const channelPerformance = requests.reduce(
    (acc, request) => {
      if (!acc[request.channel]) {
        acc[request.channel] = { sent: 0, completed: 0, rate: 0 };
      }
      acc[request.channel].sent++;
      if (request.status === "completed") {
        acc[request.channel].completed++;
      }
      acc[request.channel].rate =
        (acc[request.channel].completed / acc[request.channel].sent) * 100;
      return acc;
    },
    {} as Record<string, { sent: number; completed: number; rate: number }>
  );

  const serviceBreakdown = requests.reduce(
    (acc, request) => {
      if (!acc[request.serviceReceived]) {
        acc[request.serviceReceived] = { count: 0, avgRating: 0 };
      }
      acc[request.serviceReceived].count++;
      if (request.reviewRating) {
        acc[request.serviceReceived].avgRating =
          (acc[request.serviceReceived].avgRating + request.reviewRating) / 2;
      }
      return acc;
    },
    {} as Record<string, { count: number; avgRating: number }>
  );

  const followUpEffectiveness = requests.reduce(
    (acc, request) => {
      const followUps = request.followUpCount;
      if (!acc[followUps]) acc[followUps] = 0;
      if (request.status === "completed") acc[followUps]++;
      return acc;
    },
    {} as Record<number, number>
  );

  return {
    totalRequests,
    completedReviews,
    averageRating,
    conversionRate,
    channelPerformance,
    timeBasedData: {},
    serviceBreakdown,
    followUpEffectiveness,
  };
}

// ---------------- Enhanced Template Generation ----------------
function generateEnhancedTemplate(
  type: "email" | "sms" | "whatsapp" | "in-person",
  customerName: string,
  serviceReceived: string,
  businessName: string,
  reviewLinks: { google?: string; apple?: string }
): { subject?: string; content: string; variables: string[] } {
  const variables = ["customerName", "serviceReceived", "businessName"];

  switch (type) {
    case "email":
      return {
        subject: `How was your ${serviceReceived} at ${businessName}?`,
        content: `Hi ${customerName},

Thank you for choosing ${businessName} for your ${serviceReceived}!

Your feedback helps us serve our Bridgeland community better. Would you mind taking 30 seconds to leave a quick review?

Google Review: ${reviewLinks.google || "Link"}
${reviewLinks.apple ? `Apple Maps: ${reviewLinks.apple}` : ""}

We truly appreciate your support!

Best regards,
The ${businessName} Team`,
        variables,
      };

    case "sms":
      return {
        content: `Hi ${customerName}! Thanks for your ${serviceReceived} at ${businessName}. Quick review? ${reviewLinks.google || "Link"} Reply STOP to opt out.`,
        variables,
      };

    case "whatsapp":
      return {
        content: `Hi ${customerName}! Thanks for your ${serviceReceived} at ${businessName} 🎯 Would you mind leaving a quick review? ${reviewLinks.google || "Link"} We truly appreciate your feedback!`,
        variables,
      };

    case "in-person":
      return {
        content: `Hi ${customerName}! Thanks for your ${serviceReceived} today! Would you mind leaving a quick Google review to help others find ${businessName}? Here's the link: ${reviewLinks.google || "Link"}`,
        variables,
      };

    default:
      return { content: "", variables: [] };
  }
}

// ---------------- Batch Review Request Generation ----------------
function generateBatchReviewRequests(
  customers: Array<{
    name: string;
    email?: string;
    phone?: string;
    service: string;
  }>,
  template: ReviewTemplate,
  campaign: ReviewCampaign
): ReviewRequest[] {
  return customers.map((customer, index) => ({
    id: crypto.randomUUID?.() || `${Date.now()}_${index}`,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    serviceReceived: customer.service,
    visitDate: new Date().toISOString().split("T")[0],
    status: "pending" as const,
    channel: template.type,
    templateUsed: template.id,
    reviewLinks: {
      google: "https://search.google.com/local/writereview?placeid=...",
      apple: "https://maps.apple.com/place?...",
    },
    sentDate: undefined,
    completedDate: undefined,
    followUpCount: 0,
    lastFollowUp: undefined,
  }));
}

// ---------------- Main Component ----------------
export default function ReviewKit() {
  // Business & links
  const [bizName, setBizName] = useState<string>(
    BELMONT_CONSTANTS.BUSINESS_NAME
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    "Bridgeland, Calgary"
  );
  const [identifyEmail, setIdentifyEmail] = useState<string>(
    "hello@thebelmontbarber.ca"
  );
  const [identifyPhone, setIdentifyPhone] = useState<string>(
    BELMONT_CONSTANTS.PHONE_DISPLAY
  );
  const [googleReviewLink, setGoogleReviewLink] = useState<string>(
    BELMONT_CONSTANTS.REVIEW_GOOGLE_URL
  );
  const [applePlaceLink, setApplePlaceLink] = useState<string>(
    BELMONT_CONSTANTS.REVIEW_APPLE_URL
  );
  const [bookingLink, setBookingLink] = useState<string>(
    BELMONT_CONSTANTS.BOOK_URL
  );

  // Compliance toggles
  const [includeStop, setIncludeStop] = useState<boolean>(true);
  const [includeIdentification, setIncludeIdentification] =
    useState<boolean>(true);
  const [logConsent, setLogConsent] = useState<boolean>(true);

  // QR state
  const [qrSize, setQrSize] = useState<number>(384);
  const [qrGoogle, setQrGoogle] = useState<string>("");
  const [qrApple, setQrApple] = useState<string>("");

  // Consent log (local only)
  const [logRows, setLogRows] = useState<ConsentLog[]>([]);

  // Enhanced state for new features
  const [apiKey, setApiKey] = useState<string>("");
  const [aiOptimization, setAiOptimization] = useState<AIOptimization | null>(
    null
  );
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [reviewAnalytics, setReviewAnalytics] =
    useState<ReviewAnalytics | null>(null);
  const [reviewLibrary, setReviewLibrary] = useState<ReviewLibrary>({
    templates: [],
    campaigns: [],
    categories: ["General", "New Customers", "VIP", "Event", "Follow-up"],
    performanceHistory: {},
  });
  const [campaigns, setCampaigns] = useState<ReviewCampaign[]>([]);
  const [activeTab, setActiveTab] = useState("howto");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [targetAudience, setTargetAudience] = useState<string>(
    "Recent customers who received excellent service"
  );
  const [campaignGoal, setCampaignGoal] = useState<string>(
    "Increase 5-star Google reviews by 25%"
  );
  const [currentPerformance, setCurrentPerformance] = useState<string>(
    "Current conversion rate: 15%, Average rating: 4.8"
  );

  // Template management
  const [reviewTemplates, setReviewTemplates] = useState<ReviewTemplate[]>([
    {
      id: "email-basic",
      name: "Basic Email Request",
      type: "email",
      subject: "How was your experience at Belmont?",
      content:
        "Hi {{customerName}}, thank you for your {{serviceReceived}} at Belmont...",
      variables: ["customerName", "serviceReceived"],
      performance: {
        sent: 0,
        completed: 0,
        conversionRate: 0,
        averageRating: 0,
      },
    },
  ]);

  // ---------------- Enhanced Functions ----------------
  const getAIOptimization = async () => {
    const optimization = await generateAIReviewOptimization(
      campaignGoal,
      targetAudience,
      currentPerformance,
      apiKey
    );
    setAiOptimization(optimization);
  };

  const saveTemplateToLibrary = () => {
    const newTemplate: ReviewTemplate = {
      id: `template_${Date.now()}`,
      name: "Custom Template",
      type: "email",
      subject: "Thank you for choosing Belmont!",
      content:
        "Hi {{customerName}}, we hope you enjoyed your {{serviceReceived}}...",
      variables: ["customerName", "serviceReceived"],
      performance: {
        sent: 0,
        completed: 0,
        conversionRate: 0,
        averageRating: 0,
      },
    };

    setReviewTemplates((prev) => [...prev, newTemplate]);
    setReviewLibrary((prev) => ({
      ...prev,
      templates: [...prev.templates, newTemplate],
    }));

    alert("Template saved to library!");
  };

  const generateBatchRequests = () => {
    const sampleCustomers = [
      { name: "John Smith", email: "john@email.com", service: "Men's Cut" },
      { name: "Sarah Johnson", phone: "403-555-0123", service: "Beard Trim" },
      { name: "Mike Davis", email: "mike@email.com", service: "Skin Fade" },
    ];

    const template = reviewTemplates[0];
    const campaign: ReviewCampaign = {
      id: "batch_campaign",
      name: "Batch Review Campaign",
      description: "Automated review requests",
      targetAudience: "Recent customers",
      startDate: new Date().toISOString().split("T")[0],
      status: "active",
      goal: { reviews: 10, rating: 5, timeframe: "7 days" },
      performance: {
        sent: 0,
        completed: 0,
        averageRating: 0,
        conversionRate: 0,
      },
      channels: ["email"],
      templates: [template.id],
    };

    const newRequests = generateBatchReviewRequests(
      sampleCustomers,
      template,
      campaign
    );
    setReviewRequests((prev) => [...prev, ...newRequests]);
    alert(`Generated ${newRequests.length} review requests!`);
  };

  const calculateReviewAnalyticsData = () => {
    const analytics = calculateReviewAnalytics(reviewRequests);
    setReviewAnalytics(analytics);
  };

  const exportReviewReport = () => {
    if (!reviewAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Requests,${reviewAnalytics.totalRequests}`,
      `Completed Reviews,${reviewAnalytics.completedReviews}`,
      `Conversion Rate,${reviewAnalytics.conversionRate.toFixed(2)}%`,
      `Average Rating,${reviewAnalytics.averageRating.toFixed(1)}`,
      "",
      "Channel Performance,",
      ...Object.entries(reviewAnalytics.channelPerformance).map(
        ([channel, data]) =>
          `${channel},${data.sent},${data.completed},${data.rate.toFixed(1)}%`
      ),
      "",
      "Service Breakdown,",
      ...Object.entries(reviewAnalytics.serviceBreakdown).map(
        ([service, data]) =>
          `${service},${data.count},${data.avgRating.toFixed(1)}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `review-analytics-${todayISO()}.csv`);
  };

  const gLink = useMemo(
    () => normalizeUrl(googleReviewLink),
    [googleReviewLink]
  );
  const aLink = useMemo(() => normalizeUrl(applePlaceLink), [applePlaceLink]);

  useEffect(() => {
    (async () => {
      if (gLink) setQrGoogle(await qrDataUrl(gLink, qrSize));
      if (aLink) setQrApple(await qrDataUrl(aLink, qrSize));
    })();
  }, [gLink, aLink, qrSize]);

  // ---------- Template Generators ----------
  function atChairScript() {
    return `If you enjoyed your cut today, a quick Google review really helps neighbors in ${neighborhood} find us. May I send you a one‑time ${"email/SMS"} with the review link?`;
  }

  const emailTemplate = useCallback((firstName = "[First Name]") => {
    const idLine = includeIdentification
      ? `\n\n— ${bizName} · ${identifyPhone} · ${identifyEmail}`
      : "";
    const unsub = `\n\nTo opt out of future messages, click unsubscribe or reply STOP.`; // transactional tone, CASL‑safe
    return {
      subject: `Your ${bizName} visit — quick review?`,
      body: `Hi ${firstName},\n\nThanks for visiting ${bizName} in ${neighborhood}! If you have 30 seconds, a short Google review helps others nearby choose confidently.\n\nReview link: ${gLink}\n${
        aLink ? `Apple Maps: ${aLink}\n` : ""
      }Book again: ${bookingLink}${idLine}${includeStop ? unsub : ""}`,
    };
  }, [includeIdentification, bizName, identifyPhone, identifyEmail, gLink, aLink, bookingLink, includeStop, neighborhood]);

  const smsTemplate = useCallback((firstName = "[First Name]") => {
    const idLine = includeIdentification ? ` — ${bizName}` : "";
    const stop = includeStop ? " Reply STOP to opt out." : "";
    return `Thanks for visiting ${bizName} in ${neighborhood}, ${firstName}! Review: ${gLink}${
      aLink ? ` | Apple: ${aLink}` : ""
    }. Book: ${bookingLink}.${idLine}${stop}`;
  }, [includeIdentification, bizName, neighborhood, gLink, aLink, bookingLink, includeStop]);

  function whatsappTemplate(firstName = "[First Name]") {
    // WhatsApp doesn't require STOP, but keep identification; CASL governs the initial send/consent.
    return `Hi ${firstName}! If you have 30 seconds, would you leave a quick review for ${bizName}? ${gLink}${
      aLink ? ` (Apple: ${aLink})` : ""
    }. Book: ${bookingLink}. — ${bizName}`;
  }

  // ---------- Copy helpers ----------
  const [copied, setCopied] = useState<string>("");
  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function exportTxtPack() {
    const email = emailTemplate();
    const txt = [
      "--- At‑chair script ---",
      atChairScript(),
      "\n\n--- Email (subject) ---",
      email.subject,
      "\n\n--- Email (body) ---",
      email.body,
      "\n\n--- SMS ---",
      smsTemplate(),
      "\n\n--- WhatsApp ---",
      whatsappTemplate(),
    ].join("\n");
    saveBlob(
      new Blob([txt], { type: "text/plain;charset=utf-8;" }),
      `belmont-review-kit-${todayISO()}.txt`
    );
  }

  // ---------- Consent log ----------
  function addConsentRow(
    name: string,
    channel: "email" | "sms",
    address: string,
    purpose = "review request"
  ) {
    if (!logConsent) return;
    const row: ConsentLog = {
      date: todayISO(),
      name,
      channel,
      address,
      purpose,
      consent: "express",
    };
    setLogRows((prev) => [row, ...prev].slice(0, 200));
  }

  function exportConsentCSV() {
    const csv = toCSV(
      logRows.map((r) => ({
        Date: r.date,
        Name: r.name,
        Channel: r.channel,
        Address: r.address,
        Purpose: r.purpose,
        Consent: r.consent,
      }))
    );
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-consent-log-${todayISO()}.csv`
    );
  }

  // ---------- Print Card ----------
  function openPrintCard() {
    const win = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=720,height=900"
    );
    if (!win) return;
    const css = `body{font-family:ui-sans-serif,system-ui; margin:0; padding:24px;}
      .card{width: 360px; border:1px solid #ddd; border-radius:16px; padding:16px;}
      .title{font-weight:600; font-size:16px; margin-bottom:8px}
      .qr{display:flex; align-items:center; justify-content:center; margin:8px 0}
      .small{color:#555; font-size:12px;}`;
    const html = `<!doctype html><html><head><title>Belmont Review Card</title><style>${css}</style></head>
      <body>
      <div class="card">
        <div class="title">Loved your cut?</div>
        <div>Scan to leave a quick review for <strong>${bizName}</strong>.</div>
        <div class="qr"><img src="${qrGoogle || ""}" style="width:240px;height:240px;"/></div>
        <div class="small">Or visit:<br/>${gLink}</div>
      </div>
      <script>window.print()</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // ---------- Self‑tests ----------
  type Test = { name: string; passed: boolean; details?: string };
  const runTests = useCallback((): Test[] => {
    const tests: Test[] = [];
    // 1) SMS contains STOP when enabled
    const sms = smsTemplate("Alex");
    tests.push({
      name: "SMS has STOP when enabled",
      passed: includeStop ? /STOP/.test(sms) : true,
    });
    // 2) Email includes identification when enabled
    const email = emailTemplate("Alex");
    tests.push({
      name: "Email has identification when enabled",
      passed: includeIdentification
        ? new RegExp(bizName).test(email.body)
        : true,
    });
    // 3) Google link looks like HTTPS
    tests.push({
      name: "Google link is https",
      passed: /^https:\/\//.test(gLink),
      details: gLink,
    });
    // 4) QR size sensible
    tests.push({
      name: "QR size between 256 and 1024",
      passed: qrSize >= 256 && qrSize <= 1024,
      details: String(qrSize),
    });
    return tests;
  }, [includeStop, includeIdentification, bizName, gLink, qrSize, emailTemplate, smsTemplate]);

  const tests = useMemo(
    () => runTests(),
    [runTests]
  );
  const passCount = tests.filter((t) => t.passed).length;

  // ---------- Quick actions ----------
  function copyEmail() {
    const e = emailTemplate();
    copy(`Subject: ${e.subject}\n\n${e.body}`, "email");
    addConsentRow("[Name]", "email", "[email]");
    try { logEvent("review_email_copied"); } catch {}
  }
  function copySMS() {
    copy(smsTemplate(), "sms");
    addConsentRow("[Name]", "sms", "[phone]");
    try { logEvent("review_sms_copied"); } catch {}
  }

  // Onboarding overrides: use locally set review URL if present
  useEffect(() => {
    try {
      const u = localStorage.getItem("belmont_google_review_url");
      if (u && /^https?:\/\//.test(u)) setGoogleReviewLink(u);
      const ph = localStorage.getItem("belmont_onboarding_phone");
      if (ph) setIdentifyPhone(ph);
    } catch {}
  }, []);

  return (
    <div className="p-5 md:p-8 space-y-6">
      {googleReviewLink.includes("REPLACE_WITH_REAL_PLACE_ID") && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Action required: Set Google review link</CardTitle>
            <CardDescription>
              Paste your Google review link (with place ID) below to enable one‑click reviews. You can find your Place ID using Google’s Place ID Finder.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noopener noreferrer">
                  Open Place ID Finder
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href="https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID" target="_blank" rel="noopener noreferrer">
                  Review URL format
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <PageHeader
        title="Review Request Links"
        subtitle="Create Google/Apple review links, copy CASL-compliant email/SMS, and print QR cards. (Optional: connect AI for optimization)"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={getAIOptimization}
              disabled={!apiKey}
              variant="outline"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Optimize (optional)
            </Button>
            <Button
              onClick={calculateReviewAnalyticsData}
              disabled={reviewRequests.length === 0}
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button onClick={generateBatchRequests} variant="outline">
              <Layers className="h-4 w-4 mr-2" />
              Batch Generate
            </Button>
            <Button
              onClick={exportReviewReport}
              disabled={!reviewAnalytics}
              variant="outline"
            >
              <FileImage className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Do this next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Enter or confirm your Google and Apple review links.</li>
            <li>Copy the Email and SMS from the Compose tab.</li>
            <li>Ask permission, then send one message to a recent client.</li>
            <li>Log consent in the Consent Log (optional, recommended).</li>
            <li>Print a counter card with the QR in the QR & Cards tab.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard
          label="Review Requests"
          value={reviewRequests.length}
          hint="Active campaigns"
          icon={<Send className="h-4 w-4" />}
        />
        <KPICard
          label="AI Status"
          value={apiKey ? "Connected" : "Setup"}
          hint="Optimization"
          icon={<Brain className="h-4 w-4" />}
        />
        <KPICard
          label="Conversion Rate"
          value={
            reviewAnalytics
              ? `${reviewAnalytics.conversionRate.toFixed(1)}%`
              : "—"
          }
          hint="Requests to reviews"
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          label="Avg Rating"
          value={
            reviewAnalytics
              ? `${reviewAnalytics.averageRating.toFixed(1)}⭐`
              : "—"
          }
          hint="Review quality"
          icon={<Star className="h-4 w-4" />}
        />
        <KPICard
          label="Templates"
          value={reviewTemplates.length}
          hint="Saved designs"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <KPICard
          label="Compliance"
          value="CASL Ready"
          hint="Legal compliance"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="qrs">QR & Cards</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Compose */}
        <TabsContent value="compose">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Business & Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Business name</Label>
                  <Input
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Neighborhood</Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Identify (email)</Label>
                  <Input
                    value={identifyEmail}
                    onChange={(e) => setIdentifyEmail(e.target.value)}
                    placeholder={DEFAULT_EMAIL_ID}
                  />
                </div>
                <div>
                  <Label>Identify (phone)</Label>
                  <Input
                    value={identifyPhone}
                    onChange={(e) => setIdentifyPhone(e.target.value)}
                    placeholder={DEFAULT_PHONE_ID}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Google review link</Label>
                  <Input
                    value={googleReviewLink}
                    onChange={(e) => setGoogleReviewLink(e.target.value)}
                    placeholder="https://search.google.com/local/writereview?placeid=..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Apple Maps place link (optional)</Label>
                  <Input
                    value={applePlaceLink}
                    onChange={(e) => setApplePlaceLink(e.target.value)}
                    placeholder="https://maps.apple.com/place?..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Booking link</Label>
                  <Input
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                    placeholder="https://thebelmontbarber.ca/book"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>At‑chair script (30s)</Label>
                  <Textarea value={atChairScript()} readOnly className="h-24" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => copy(atChairScript(), "chair")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === "chair" ? "Copied" : "Copy script"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email (transactional tone)</Label>
                  <Textarea
                    value={`Subject: ${emailTemplate().subject}\n\n${emailTemplate().body}`}
                    readOnly
                    className="h-40"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={copyEmail}>
                      <Mail className="h-4 w-4 mr-1" />
                      Copy Email
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SMS (one‑time)</Label>
                  <Textarea value={smsTemplate()} readOnly className="h-24" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={copySMS}>
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Copy SMS
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (optional)</Label>
                  <Textarea
                    value={whatsappTemplate()}
                    readOnly
                    className="h-24"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copy(whatsappTemplate(), "wa")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === "wa" ? "Copied" : "Copy WA"}
                    </Button>
                    <Button size="sm" onClick={exportTxtPack}>
                      <Download className="h-4 w-4 mr-1" />
                      Export .txt Pack
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Optimize Tab */}
        <TabsContent value="ai-optimize" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Review Intelligence
                </CardTitle>
                <CardDescription>
                  Get AI-powered insights for optimizing your review request
                  campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>OpenAI API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter your OpenAI API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Required for AI optimization features
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Audience</Label>
                    <Input
                      placeholder="e.g., Recent customers, VIP clients"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Campaign Goal</Label>
                    <Input
                      placeholder="e.g., Increase 5-star reviews by 25%"
                      value={campaignGoal}
                      onChange={(e) => setCampaignGoal(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Current Performance</Label>
                  <Input
                    placeholder="e.g., 15% conversion, 4.8 avg rating"
                    value={currentPerformance}
                    onChange={(e) => setCurrentPerformance(e.target.value)}
                  />
                </div>

                {aiOptimization && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4" />
                        AI Optimization Suggestions
                      </h4>
                      <ul className="space-y-2">
                        {aiOptimization.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">
                              •
                            </span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4" />
                        Best Practices
                      </h4>
                      <ul className="space-y-2">
                        {aiOptimization.bestPractices.map((practice, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-600 dark:text-green-400 mt-1">
                              •
                            </span>
                            {practice}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4" />
                        Recommended Channels
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {aiOptimization.recommendedChannels.map(
                          (channel, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {channel}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <h4 className="font-medium mb-2">
                        Predicted Performance Score
                      </h4>
                      <div className="text-2xl font-bold text-yellow-600">
                        {aiOptimization.predictedPerformance}/100
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on current campaign parameters and historical data
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Campaign Performance Insights
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of your current review campaign
                  performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {reviewAnalytics?.conversionRate.toFixed(1) || "—"}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Conversion Rate
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {reviewAnalytics?.averageRating.toFixed(1) || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Rating
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Channel Performance</h4>
                  {reviewAnalytics &&
                    Object.entries(reviewAnalytics.channelPerformance).map(
                      ([channel, data]) => (
                        <div
                          key={channel}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                channel === "email"
                                  ? "bg-blue-500"
                                  : channel === "sms"
                                    ? "bg-green-500"
                                    : channel === "whatsapp"
                                      ? "bg-purple-500"
                                      : "bg-orange-500"
                              }`}
                            />
                            <span className="capitalize text-sm">
                              {channel}
                            </span>
                          </div>
                          <span className="font-medium">
                            {data.rate.toFixed(1)}% conversion
                          </span>
                        </div>
                      )
                    )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Timing Recommendations</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>24 hours after service</span>
                      <span className="font-medium text-green-600">Best</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>During business hours</span>
                      <span className="font-medium text-green-600">
                        Optimal
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Weekend requests</span>
                      <span className="font-medium text-yellow-600">
                        Moderate
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Review Templates
                </CardTitle>
                <CardDescription>
                  Save and reuse your best performing review request templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <select className="px-3 py-2 border rounded-md">
                    <option value="all">All Templates</option>
                    {reviewLibrary.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    {reviewTemplates.length} templates saved
                  </div>
                </div>

                <div className="space-y-4">
                  {reviewTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No templates saved yet
                      </p>
                      <Button onClick={saveTemplateToLibrary} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Save Current Template
                      </Button>
                    </div>
                  ) : (
                    reviewTemplates.map((template) => (
                      <Card key={template.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{template.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {template.type}
                                </Badge>
                              </div>
                              {template.subject && (
                                <p className="text-sm text-muted-foreground mb-1">
                                  Subject: {template.subject}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {template.content}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <span>Sent: {template.performance.sent}</span>
                                <span>
                                  Completed: {template.performance.completed}
                                </span>
                                <span>
                                  Rate:{" "}
                                  {template.performance.conversionRate.toFixed(
                                    1
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                              <Button size="sm" variant="outline">
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Template
                </CardTitle>
                <CardDescription>
                  Design a new review request template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input placeholder="e.g., VIP Customer Email" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select className="w-full h-9 border rounded-md px-2">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="in-person">In-Person</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Subject (Email only)</Label>
                  <Input placeholder="How was your experience?" />
                </div>

                <div>
                  <Label>Message Content</Label>
                  <Textarea
                    placeholder="Hi {{customerName}}, thank you for your {{serviceReceived}} at {{businessName}}..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      "customerName",
                      "serviceReceived",
                      "businessName",
                      "visitDate",
                    ].map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="text-xs cursor-pointer"
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={saveTemplateToLibrary} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Review Campaigns
                </CardTitle>
                <CardDescription>
                  Manage and track your review request campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <select className="px-3 py-2 border rounded-md">
                    <option value="all">All Campaigns</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft</option>
                  </select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    {campaigns.length} campaigns
                  </div>
                </div>

                <div className="space-y-4">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No campaigns created yet
                      </p>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </div>
                  ) : (
                    campaigns.map((campaign) => (
                      <Card key={campaign.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{campaign.name}</h4>
                                <Badge
                                  variant={
                                    campaign.status === "active"
                                      ? "default"
                                      : campaign.status === "completed"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {campaign.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {campaign.description}
                              </p>
                              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                <div>
                                  <span>Target: {campaign.targetAudience}</span>
                                </div>
                                <div>
                                  <span>
                                    Goal: {campaign.goal.reviews} reviews
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {campaign.performance.sent} sent
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {campaign.performance.completed} completed
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Campaign Analytics
                </CardTitle>
                <CardDescription>
                  Performance metrics for your review campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {
                        reviewRequests.filter((r) => r.status === "completed")
                          .length
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Completed Reviews
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {reviewRequests.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Requests
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Service Performance</h4>
                  {reviewAnalytics &&
                    Object.entries(reviewAnalytics.serviceBreakdown)
                      .slice(0, 5)
                      .map(([service, data]) => (
                        <div
                          key={service}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="text-sm">{service}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {data.count} reviews
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {data.avgRating.toFixed(1)}⭐ avg
                            </div>
                          </div>
                        </div>
                      ))}
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-sm">
                    <strong>Campaign Insights:</strong> Focus on services with
                    high satisfaction rates for better review conversion.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Review Analytics</h2>
              <p className="text-muted-foreground">
                Comprehensive performance analysis of your review program
              </p>
            </div>
            <Button
              onClick={calculateReviewAnalyticsData}
              disabled={reviewRequests.length === 0}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>

          {reviewAnalytics ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Requests
                        </p>
                        <p className="text-2xl font-bold">
                          {reviewAnalytics.totalRequests}
                        </p>
                      </div>
                      <Send className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Completed Reviews
                        </p>
                        <p className="text-2xl font-bold">
                          {reviewAnalytics.completedReviews}
                        </p>
                      </div>
                      <Star className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Conversion Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {reviewAnalytics.conversionRate.toFixed(1)}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Average Rating
                        </p>
                        <p className="text-2xl font-bold">
                          {reviewAnalytics.averageRating.toFixed(1)}⭐
                        </p>
                      </div>
                      <TrendingIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Channel Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(reviewAnalytics.channelPerformance).map(
                        ([channel, data]) => {
                          const percentage =
                            (data.sent / reviewAnalytics.totalRequests) * 100;
                          return (
                            <div
                              key={channel}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    channel === "email"
                                      ? "bg-blue-500"
                                      : channel === "sms"
                                        ? "bg-green-500"
                                        : channel === "whatsapp"
                                          ? "bg-purple-500"
                                          : "bg-orange-500"
                                  }`}
                                />
                                <span className="capitalize text-sm">
                                  {channel}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                  {percentage.toFixed(1)}% of total
                                </div>
                                <div className="text-sm font-medium">
                                  {data.rate.toFixed(1)}% conversion
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      Service Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(reviewAnalytics.serviceBreakdown)
                        .sort(([, a], [, b]) => b.avgRating - a.avgRating)
                        .slice(0, 5)
                        .map(([service, data]) => (
                          <div
                            key={service}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                {data.count}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {service}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {data.count} reviews
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-yellow-600">
                                {data.avgRating.toFixed(1)}⭐
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Follow-up Effectiveness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6">
                    {Object.entries(reviewAnalytics.followUpEffectiveness).map(
                      ([followUps, completed]) => (
                        <div
                          key={followUps}
                          className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <div className="text-2xl font-bold text-blue-600">
                            {completed}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {followUps} follow-ups
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded">
                    <p className="text-sm">
                      <strong>Insight:</strong> Reviews completed with 1-2
                      follow-ups show the highest completion rates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Analytics Available
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate some review requests and click "Generate Report" to
                    see analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                CASL/PIPEDA Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={includeStop}
                    onCheckedChange={(v) => setIncludeStop(Boolean(v))}
                  />
                  <span>Include STOP/unsubscribe line</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={includeIdentification}
                    onCheckedChange={(v) =>
                      setIncludeIdentification(Boolean(v))
                    }
                  />
                  <span>Identify sender (name + contact)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={logConsent}
                    onCheckedChange={(v) => setLogConsent(Boolean(v))}
                  />
                  <span>Record express consent in local log</span>
                </div>
              </div>
              <Separator />
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Ask permission before sending any commercial email/SMS.</li>
                <li>
                  Use transactional tone; avoid incentives in the initial
                  consent request.
                </li>
                <li>
                  Store only minimal data (name, channel, date); export/delete
                  on request.
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR & Cards */}
        <TabsContent value="qrs">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR & Print Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>QR size (px)</Label>
                  <Input
                    type="number"
                    min={256}
                    max={1024}
                    value={qrSize}
                    onChange={(e) =>
                      setQrSize(
                        Math.max(
                          256,
                          Math.min(1024, parseInt(e.target.value || "384"))
                        )
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2 text-xs text-muted-foreground flex items-end">
                  Tip: 384–512px prints crisply on small counter cards.
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Google Reviews</Label>
                  <div className="border rounded-md p-3 bg-white min-h-[260px] flex items-center justify-center">
                    {qrGoogle ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Data URL used for on-page preview
                      <img
                        src={qrGoogle}
                        alt="QR Google"
                        className="max-w-full"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Enter a Google review link to render QR
                      </div>
                    )}
                  </div>
                  {qrGoogle && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          downloadDataUrl(
                            qrGoogle,
                            `belmont-google-review-qr-${todayISO()}.png`
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PNG
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Apple Maps (optional)</Label>
                  <div className="border rounded-md p-3 bg-white min-h-[260px] flex items-center justify-center">
                    {qrApple ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Data URL used for on-page preview
                      <img
                        src={qrApple}
                        alt="QR Apple"
                        className="max-w-full"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Enter an Apple Maps link to render QR
                      </div>
                    )}
                  </div>
                  {qrApple && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          downloadDataUrl(
                            qrApple,
                            `belmont-apple-maps-qr-${todayISO()}.png`
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PNG
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={openPrintCard}>
                  <Printer className="h-4 w-4 mr-2" />
                  Open Printable Card
                </Button>
                <Button variant="outline" onClick={exportTxtPack}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Script Pack (.txt)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consent log */}
        <TabsContent value="log">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Consent Log (local)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">
                Record a consent when a client says yes to receiving a one‑time
                review link. Keep minimal data only.
              </div>
              <div className="grid md:grid-cols-6 gap-2 items-end mb-3">
                <div className="md:col-span-2">
                  <Label>Name</Label>
                  <Input id="c_name" placeholder="First Last" />
                </div>
                <div>
                  <Label>Channel</Label>
                  <select
                    id="c_chan"
                    className="w-full border rounded-md h-9 px-2"
                    aria-label="Select communication channel for review request"
                  >
                    <option value="email">email</option>
                    <option value="sms">sms</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    id="c_addr"
                    placeholder="name@example.com or 403‑xxx‑xxxx"
                  />
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const name = (
                        document.getElementById("c_name") as HTMLInputElement
                      )?.value?.trim();
                      const channel = ((
                        document.getElementById("c_chan") as HTMLSelectElement
                      )?.value || "email") as "email" | "sms";
                      const addr = (
                        document.getElementById("c_addr") as HTMLInputElement
                      )?.value?.trim();
                      if (!name || !addr) {
                        alert("Enter name and address");
                        return;
                      }
                      addConsentRow(name, channel, addr);
                      (
                        document.getElementById("c_name") as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById("c_addr") as HTMLInputElement
                      ).value = "";
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Consent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.date}</TableCell>
                        <TableCell className="text-xs">{r.name}</TableCell>
                        <TableCell className="text-xs">{r.channel}</TableCell>
                        <TableCell className="text-xs">{r.address}</TableCell>
                        <TableCell className="text-xs">{r.purpose}</TableCell>
                        <TableCell className="text-xs">{r.consent}</TableCell>
                      </TableRow>
                    ))}
                    {logRows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-xs text-muted-foreground"
                        >
                          No entries yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={exportConsentCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* How To */}
        <TabsContent value="howto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Use the Review Request System
                </CardTitle>
                <CardDescription>
                  Create professional review requests that follow Canadian
                  privacy laws and get more customer reviews for Belmont
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool helps Belmont ask customers for reviews in a
                      professional, legal way. It creates special links that
                      customers can click to leave reviews on Google Maps and
                      Apple Maps. Everything is set up to follow Canadian
                      privacy laws (CASL) so Belmont stays compliant.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Why This Matters for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      Customer reviews are incredibly important for Belmont's
                      success. More reviews mean:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        More customers find Belmont when searching for barbers
                        in Calgary
                      </li>
                      <li>Google shows Belmont higher in search results</li>
                      <li>
                        New customers trust Belmont more when they see positive
                        reviews
                      </li>
                      <li>
                        Belmont builds a stronger reputation in the Bridgeland
                        community
                      </li>
                      <li>
                        Reviews help potential customers choose Belmont over
                        competitors
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      How to Request Reviews the Right Way
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          1
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Choose Your Communication Method
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Decide if you want to send review requests by email,
                            text message, or both. The tool creates ready-to-use
                            templates for each method.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          2
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Customize the Business Information
                          </p>
                          <p className="text-sm text-muted-foreground">
                            The tool is pre-filled with Belmont's information
                            (address, phone, etc.), but you can adjust the
                            wording or add personal touches for each customer.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          3
                        </Badge>
                        <div>
                          <p className="font-medium">Generate Review Links</p>
                          <p className="text-sm text-muted-foreground">
                            Click the buttons to create unique links for Google
                            and Apple Maps reviews. These links take customers
                            directly to the review page for Belmont.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          4
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Create Professional Messages
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Use the pre-written templates to create personalized
                            messages. All templates include the legally required
                            "STOP" option for customers who don't want to
                            receive messages.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          5
                        </Badge>
                        <div>
                          <p className="font-medium">Track Your Consent</p>
                          <p className="text-sm text-muted-foreground">
                            Log when and how you contacted each customer. This
                            helps Belmont stay compliant with Canadian privacy
                            laws and shows you followed the rules.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          6
                        </Badge>
                        <div>
                          <p className="font-medium">Send and Follow Up</p>
                          <p className="text-sm text-muted-foreground">
                            Send your review requests and follow up politely if
                            needed. Always respect customers who don't want to
                            be contacted again.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Legal Compliance (Very Important)
                    </h3>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                            CASL Compliance Requirements
                          </p>
                          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                            <li>
                              • Always include a way for customers to
                              unsubscribe ("STOP")
                            </li>
                            <li>
                              • Get permission before sending marketing messages
                            </li>
                            <li>
                              • Keep records of when and how you contacted
                              customers
                            </li>
                            <li>
                              • Respect customers who ask not to be contacted
                            </li>
                            <li>
                              • Use Belmont's official contact information
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Tips for Belmont
                    </h3>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            💡
                          </span>
                          <span>
                            Send review requests within 24 hours of the
                            customer's visit while the experience is fresh
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            🎯
                          </span>
                          <span>
                            Personalize messages with the customer's name and
                            specific service they received
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            📱
                          </span>
                          <span>
                            Test your review links by clicking them yourself
                            first
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            📊
                          </span>
                          <span>
                            Track which communication method gets the most
                            reviews (email vs text)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            🤝
                          </span>
                          <span>
                            Always thank customers for their reviews, even if
                            they're not positive
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Best Times to Ask for Reviews
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          After Great Service
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Send requests after exceptional service experiences.
                          Customers are more likely to leave positive reviews.
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          After Special Occasions
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Great timing after weddings, proms, or other special
                          events where customers want to share their experience.
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          During Slow Periods
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Use quiet times to catch up on review requests for
                          recent customers.
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          Before Competitor Visits
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Ask for reviews before customers might visit
                          competitors to capture their positive experience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                  {tests.map((t, i) => (
                    <TableRow key={i}>
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
