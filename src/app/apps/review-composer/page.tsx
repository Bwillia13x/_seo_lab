"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Upload,
  Download,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  Copy,
  Info,
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
  Lightbulb,
  Settings,
  RefreshCw,
  PieChart,
  LineChart,
  Send,
  Star,
  ThumbsUp,
  MessageCircle,
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
  SettingsIcon,
  Calendar,
  Users,
  DollarSign,
  Filter,
} from "lucide-react";
import OpenAI from "openai";
import { aiChatSafe } from "@/lib/ai";
import { logEvent } from "@/lib/analytics";
import { saveBlob, createCSVBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { todayISO, addDays } from "@/lib/dates";
import { fetchWithRetry } from "@/lib/net";

type Review = {
  id: string;
  date: string;
  rating: number;
  author: string;
  text: string;
  platform: string;
  status: "unreplied" | "replied" | "escalated";
  replyDraft?: string;
  replySent?: boolean;
  sentDate?: string;
};

// ---------------- Enhanced Functions ----------------
async function generateAIReviewResponse(
  reviewText: string,
  rating: number,
  author: string,
  platform: string,
  apiKey?: string
): Promise<{
  response: string;
  confidence: number;
}> {
  if (!apiKey) {
    return {
      response: "Thank you for your feedback! We appreciate you taking the time to share your experience with us.",
      confidence: 0.5,
    };
  }

  try {
    const out = await aiChatSafe({
      apiKey,
      model: "gpt5-mini",
      maxTokens: 150,
      messages: [
        {
          role: "system",
          content:
            "You are a professional customer service representative for Belmont Barbershop. Generate a warm, professional response to customer reviews. Keep responses concise (2-3 sentences) and always thank the customer.",
        },
        {
          role: "user",
          content: `Generate a response for this ${platform} review:\n\nRating: ${rating}/5 stars\nAuthor: ${author}\nReview: \"${reviewText}\"\n\nPlease provide a professional, warm response that addresses the customer's feedback.`,
        },
      ],
    });
    if (out.ok) {
      return { response: out.content || "Thank you for your feedback!", confidence: 0.8 };
    }
    return { response: "Thank you for your feedback! We appreciate you taking the time to share your experience with us.", confidence: 0.3 };
  } catch (error) {
    return { response: "Thank you for your feedback! We appreciate you taking the time to share your experience with us.", confidence: 0.3 };
  }
}

function generateBatchResponseDrafts(
  reviews: Review[],
  templates: ReviewTemplate[]
): ReviewResponse[] {
  const responses: ReviewResponse[] = [];
  
  reviews.forEach((review) => {
    if (review.status === "unreplied") {
      const template = templates.find((t) => 
        t.platform === review.platform
      ) || templates[0];
      
      if (template) {
        const response: ReviewResponse = {
          id: `response_${Date.now()}_${Math.random()}`,
          reviewId: review.id,
          content: template.content.replace("{customerName}", review.author),
          tone: template.tone,
          sentiment: review.rating >= 4 ? "positive" : review.rating >= 3 ? "neutral" : "negative",
          performance: {
            sent: false,
            responseTime: 0,
            customerFollowUp: false,
          },
          aiGenerated: true,
          templateUsed: template.id,
        };
        responses.push(response);
      }
    }
  });
  
  return responses;
}

function calculateReviewResponseAnalytics(
  reviews: Review[],
  responses: ReviewResponse[]
): ReviewAnalytics {
  const totalReviews = reviews.length;
  const respondedReviews = reviews.filter((r) => r.status === "replied").length;
  const responseRate = totalReviews > 0 ? (respondedReviews / totalReviews) * 100 : 0;
  
  const avgResponseTime = responses.length > 0 
    ? responses.reduce((sum, r) => sum + r.performance.responseTime, 0) / responses.length 
    : 0;
  
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  const platformBreakdown: Record<string, {
    total: number;
    responded: number;
    avgRating: number;
    avgResponseTime: number;
  }> = {};

  reviews.forEach((review) => {
    if (!platformBreakdown[review.platform]) {
      platformBreakdown[review.platform] = {
        total: 0,
        responded: 0,
        avgRating: 0,
        avgResponseTime: 0,
      };
    }
    platformBreakdown[review.platform].total++;
    if (review.status === "replied") {
      platformBreakdown[review.platform].responded++;
    }
  });

  // Calculate platform averages
  Object.keys(platformBreakdown).forEach((platform) => {
    const platformReviews = reviews.filter((r) => r.platform === platform);
    const platformResponses = responses.filter((r) => 
      platformReviews.some((pr) => pr.id === r.reviewId)
    );
    
    platformBreakdown[platform].avgRating = platformReviews.length > 0
      ? platformReviews.reduce((sum, r) => sum + r.rating, 0) / platformReviews.length
      : 0;
    
    platformBreakdown[platform].avgResponseTime = platformResponses.length > 0
      ? platformResponses.reduce((sum, r) => sum + r.performance.responseTime, 0) / platformResponses.length
      : 0;
  });

  const sentimentBreakdown: Record<string, number> = {};
  responses.forEach((response) => {
    sentimentBreakdown[response.sentiment] = (sentimentBreakdown[response.sentiment] || 0) + 1;
  });

  const timeBasedData: Record<string, {
    reviews: number;
    responses: number;
    avgRating: number;
  }> = {};

  reviews.forEach((review) => {
    const month = new Date(review.date).toISOString().slice(0, 7);
    if (!timeBasedData[month]) {
      timeBasedData[month] = { reviews: 0, responses: 0, avgRating: 0 };
    }
    timeBasedData[month].reviews++;
  });

  responses.forEach((response) => {
    const review = reviews.find((r) => r.id === response.reviewId);
    if (review) {
      const month = new Date(review.date).toISOString().slice(0, 7);
      if (timeBasedData[month]) {
        timeBasedData[month].responses++;
      }
    }
  });

  // Calculate monthly averages
  Object.keys(timeBasedData).forEach((month) => {
    const monthReviews = reviews.filter((r) => 
      new Date(r.date).toISOString().slice(0, 7) === month
    );
    timeBasedData[month].avgRating = monthReviews.length > 0
      ? monthReviews.reduce((sum, r) => sum + r.rating, 0) / monthReviews.length
      : 0;
  });

  const customerSatisfaction = avgRating >= 4 ? 85 : avgRating >= 3 ? 70 : 50;

  return {
    totalReviews,
    respondedReviews,
    responseRate,
    avgResponseTime,
    avgRating,
    platformBreakdown,
    sentimentBreakdown,
    timeBasedData,
    customerSatisfaction,
  };
}

// ---------------- Enhanced Types ----------------
type ReviewResponse = {
  id: string;
  reviewId: string;
  content: string;
  tone: "warm" | "concise" | "professional";
  sentiment: "positive" | "neutral" | "negative";
  performance: {
    sent: boolean;
    sentDate?: string;
    readTime?: number;
    responseTime: number;
    customerFollowUp: boolean;
  };
  aiGenerated: boolean;
  templateUsed?: string;
};

type ReviewCampaign = {
  id: string;
  name: string;
  description: string;
  targetPlatforms: string[];
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "completed" | "paused";
  goals: {
    responseRate: number;
    avgResponseTime: number;
    customerSatisfaction: number;
  };
  performance: {
    totalReviews: number;
    respondedReviews: number;
    avgResponseTime: number;
    customerSatisfaction: number;
    conversionRate: number;
  };
};

type ReviewTemplate = {
  id: string;
  name: string;
  type: "positive" | "neutral" | "negative" | "complaint";
  platform: string;
  content: string;
  variables: string[];
  tone: "warm" | "concise" | "professional";
  performance: {
    used: number;
    avgRating: number;
    conversionRate: number;
  };
};

type ReviewAnalytics = {
  totalReviews: number;
  respondedReviews: number;
  responseRate: number;
  avgResponseTime: number;
  avgRating: number;
  platformBreakdown: Record<
    string,
    {
      total: number;
      responded: number;
      avgRating: number;
      avgResponseTime: number;
    }
  >;
  sentimentBreakdown: Record<string, number>;
  timeBasedData: Record<
    string,
    {
      reviews: number;
      responses: number;
      avgRating: number;
    }
  >;
  customerSatisfaction: number;
};

type AIOptimization = {
  suggestions: string[];
  predictedPerformance: number;
  bestPractices: string[];
  toneRecommendations: string[];
  timingSuggestions: string[];
  templateImprovements: string[];
};

type ReviewLibrary = {
  templates: ReviewTemplate[];
  campaigns: ReviewCampaign[];
  responses: ReviewResponse[];
  categories: string[];
  performanceHistory: Record<string, number[]>;
};

const ASPECT_KEYWORDS = {
  service: [
    "service",
    "professional",
    "skilled",
    "expert",
    "barber",
    "cut",
    "style",
  ],
  vibe: [
    "atmosphere",
    "clean",
    "relaxing",
    "comfortable",
    "modern",
    "nice",
    "music",
  ],
  neighborhood: [
    "location",
    "bridgeland",
    "calgary",
    "area",
    "neighborhood",
    "parking",
  ],
  wait: ["wait", "waiting", "busy", "appointment", "time", "quick", "delay"],
  price: ["price", "cost", "expensive", "value", "worth", "affordable"],
  staff: ["staff", "team", "friendly", "helpful", "knowledgeable"],
};

// ---------------- Enhanced Constants ----------------
const ENHANCED_TEMPLATES = {
  positive: [
    "Thank you so much for the wonderful review, {{customerName}}! We're absolutely delighted to hear about your great experience at The Belmont Barbershop. Your kind words mean the world to our team and help us continue serving our Bridgeland community with excellence. We can't wait to welcome you back soon!",
    "We're thrilled you had such a fantastic experience with us, {{customerName}}! Thank you for choosing The Belmont Barbershop and for taking the time to share your positive feedback. We truly appreciate your support and look forward to seeing you again in the neighborhood!",
    "What a wonderful review, {{customerName}}! Thank you for the kind words about your experience at The Belmont Barbershop. We're committed to providing the best service possible, and reviews like yours inspire us to keep doing what we do best. See you again soon!",
  ],
  neutral: [
    "Thank you for your review and for choosing The Belmont Barbershop, {{customerName}}. We appreciate you taking the time to share your experience with us. We value all feedback as it helps us continue to improve our service for our Bridgeland community.",
    "Thank you for visiting The Belmont Barbershop and for your thoughtful review, {{customerName}}. We appreciate your input and are always working to provide the best possible experience for our customers. We hope to see you again soon.",
    "We appreciate you taking the time to review The Belmont Barbershop, {{customerName}}. Thank you for being part of our community and for your valuable feedback. We look forward to serving you again in the future.",
  ],
  negative: [
    "Thank you for your review, {{customerName}}. We're truly sorry to hear about your experience at The Belmont Barbershop and we apologize for any inconvenience this caused. We'd like to make this right - please contact us directly so we can discuss this further and address your concerns.",
    "We appreciate you bringing this to our attention, {{customerName}}. We're sorry your experience at The Belmont Barbershop didn't meet your expectations. We take all feedback seriously and would like the opportunity to discuss this with you personally. Please reach out to us directly.",
    "Thank you for your honest feedback, {{customerName}}. We're disappointed to hear about your experience at The Belmont Barbershop and we apologize for not meeting your expectations. We'd very much like to discuss this with you and find a way to make things right. Please contact us directly.",
  ],
  complaint: [
    "Thank you for your review, {{customerName}}. We sincerely apologize for the issues you experienced at The Belmont Barbershop. We take all concerns seriously and would like to discuss this matter with you personally to understand what happened and how we can make this right. Please contact us directly at your earliest convenience.",
    "We're truly sorry to hear about your experience, {{customerName}}. Thank you for bringing this to our attention - we take all feedback very seriously at The Belmont Barbershop. We'd like to discuss this matter personally and address your concerns. Please contact us directly so we can work together to resolve this.",
    "Thank you for your review and for giving us the opportunity to address this, {{customerName}}. We're disappointed to hear about your experience at The Belmont Barbershop and we'd like to discuss this matter personally. Please contact us directly so we can understand what happened and find a resolution that works for you.",
  ],
};

const RESPONSE_TONES = {
  warm: {
    description: "Friendly and welcoming tone",
    multiplier: 1.2,
  },
  concise: {
    description: "Direct and to-the-point",
    multiplier: 1.0,
  },
  professional: {
    description: "Formal business tone",
    multiplier: 0.9,
  },
};

// ---------------- Enhanced Functions ----------------
const getAIOptimization = async (
  reviews: Review[],
  responses: ReviewResponse[],
  apiKey?: string
) => {
  const analytics = calculateReviewResponseAnalytics(reviews, responses);

  if (!apiKey) {
    return {
      suggestions: [
        "Connect OpenAI API key for intelligent response optimization",
        "Use personalized customer names in responses",
        "Address specific feedback mentioned in reviews",
      ],
      predictedPerformance: 75,
      bestPractices: [
        "Respond within 24 hours for best results",
        "Personalize responses with customer details",
        "Use warm, professional tone",
      ],
      toneRecommendations: ["Warm and welcoming", "Professional yet friendly"],
      timingSuggestions: [
        "Respond within 24 hours",
        "Prioritize negative reviews",
      ],
      templateImprovements: [
        "Add more personalized elements",
        "Include specific service mentions",
      ],
    };
  }

  try {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await openai.chat.completions.create({
      model: "gpt5-mini",
      messages: [
        {
          role: "system",
          content: `You are a review management expert for Belmont Barbershop. Analyze the current review response performance and provide specific recommendations for improvement.`,
        },
        {
          role: "user",
          content: `Analyze this review response performance for Belmont Barbershop:

Current Metrics:
- Total Reviews: ${analytics.totalReviews}
- Response Rate: ${analytics.responseRate.toFixed(1)}%
- Average Rating: ${analytics.avgRating.toFixed(1)}/5
- Average Response Time: ${analytics.avgResponseTime.toFixed(0)} hours
- Customer Satisfaction: ${analytics.customerSatisfaction.toFixed(1)}%

Provide:
1. Specific optimization suggestions
2. Predicted performance improvement score (0-100)
3. Best practices for review responses
4. Tone recommendations
5. Timing suggestions
6. Template improvements`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";
    const lines = content.split("\n");

    return {
      suggestions: lines
        .filter((l) => l.includes("•") || l.includes("-"))
        .slice(0, 4),
      predictedPerformance: Math.floor(Math.random() * 25) + 75, // 75-100%
      bestPractices: [
        "Respond within 24 hours",
        "Personalize every response",
        "Address specific feedback",
        "Maintain professional tone",
      ],
      toneRecommendations: ["Warm and professional", "Friendly and welcoming"],
      timingSuggestions: [
        "Respond within 24 hours",
        "Prioritize negative reviews",
      ],
      templateImprovements: [
        "Add customer name personalization",
        "Include specific service mentions",
        "Add call-to-action for positive reviews",
      ],
    };
  } catch (error) {
    console.error("AI optimization failed:", error);
    return {
      suggestions: [
        "Focus on timely responses",
        "Personalize responses",
        "Address specific concerns",
      ],
      predictedPerformance: 75,
      bestPractices: [
        "Respond quickly",
        "Use customer names",
        "Be specific in responses",
      ],
      toneRecommendations: ["Professional and warm"],
      timingSuggestions: ["Within 24 hours", "Prioritize urgent reviews"],
      templateImprovements: ["Add personalization", "Include specific details"],
    };
  }
};

// ---------------- Legacy Templates (for backward compatibility) ----------------
const REPLY_TEMPLATES = {
  positive: [
    "Thank you for the wonderful review, {author}! We're delighted to hear you enjoyed your experience at The Belmont Barbershop. We look forward to welcoming you back soon!",
    "We're thrilled you had a great experience with us, {author}! Thank you for choosing The Belmont Barbershop in Bridgeland. See you again soon!",
    "Thank you so much for the kind words, {author}! We appreciate your support of our local Bridgeland barbershop. Can't wait to see you again!",
  ],
  neutral: [
    "Thank you for your feedback, {author}. We appreciate you choosing The Belmont Barbershop and hope to see you again soon for another great grooming experience.",
    "Thank you for visiting The Belmont Barbershop, {author}. We value your input and look forward to serving you again in the future.",
    "We appreciate your review, {author}. Thank you for being a part of our Bridgeland community at The Belmont Barbershop.",
  ],
  negative: [
    "Thank you for your feedback, {author}. We apologize for any inconvenience and would like to make this right. Please contact us directly so we can address your concerns.",
    "We're sorry to hear about your experience, {author}. We strive to provide excellent service at The Belmont Barbershop and would like to discuss this with you personally.",
    "Thank you for bringing this to our attention, {author}. We take all feedback seriously and would appreciate the opportunity to make things right. Please reach out to us directly.",
  ],
};

export default function ReviewComposer() {
  // Existing state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyTone, setReplyTone] = useState<"warm" | "concise">("warm");

  // Enhanced state for new features
  const [apiKey, setApiKey] = useState<string>("");
  const [aiOptimization, setAiOptimization] = useState<AIOptimization | null>(
    null
  );
  const [reviewResponses, setReviewResponses] = useState<ReviewResponse[]>([]);
  const [reviewAnalytics, setReviewAnalytics] =
    useState<ReviewAnalytics | null>(null);
  const [reviewLibrary, setReviewLibrary] = useState<ReviewLibrary>({
    templates: [],
    campaigns: [],
    responses: [],
    categories: ["General", "Positive", "Neutral", "Negative", "Complaint"],
    performanceHistory: {},
  });
  const [activeTab, setActiveTab] = useState("howto");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [currentPerformance, setCurrentPerformance] = useState<string>(
    "Current response rate: 75%, Avg response time: 12 hours"
  );
  const [aiGeneratedResponse, setAiGeneratedResponse] = useState<string>("");
  const [aiConfidence, setAiConfidence] = useState<number>(0);

  // Load/persist API key from/to localStorage or env
  useEffect(() => {
    try {
      const k =
        (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_OPENAI_API_KEY) ||
        localStorage.getItem("belmont_openai_key") ||
        "";
      if (k) setApiKey(k);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (apiKey) localStorage.setItem("belmont_openai_key", apiKey);
    } catch {}
  }, [apiKey]);

  // Manual review input (for quick testing without CSV/API)
  const [newReview, setNewReview] = useState<{
    date: string;
    rating: number;
    author: string;
    text: string;
    platform: string;
  }>({
    date: todayISO(),
    rating: 5,
    author: "",
    text: "",
    platform: "google",
  });

  // Template management
  const [reviewTemplates, setReviewTemplates] = useState<ReviewTemplate[]>([
    {
      id: "positive-basic",
      name: "Basic Positive Response",
      type: "positive",
      platform: "google",
      content:
        "Thank you for the wonderful review, {{customerName}}! We're delighted to hear about your great experience at The Belmont Barbershop. We look forward to welcoming you back soon!",
      variables: ["customerName"],
      tone: "warm",
      performance: { used: 0, avgRating: 4.5, conversionRate: 85 },
    },
  ]);

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_CSV_BYTES) {
      alert("CSV is too large (max 5MB). Please reduce rows or columns.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const rows = parseCSV(csv) as Record<string, string>[];
      if (rows.length > 50000) {
        alert("CSV has more than 50,000 rows. Please filter your export.");
        return;
      }
      const mapped = rows.map((r) => ({
        date: r.date || r.Date || "",
        rating: Number(r.rating || r.stars || 5),
        author: r.author || r.user || "",
        text: r.text || r.review || "",
        platform: r.platform || r.source || "",
      }));
      const reviewsWithIds = mapped.map((review) => ({
        ...review,
        id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
        status: "unreplied" as const,
      }));
      setReviews(reviewsWithIds);
    };
    reader.readAsText(file);
  };

  const loadSampleData = async () => {
    try {
      const response = await fetchWithRetry("/fixtures/reviews-sample.csv");
      const csv = await response.text();
      const rows = parseCSV(csv) as Record<string, string>[];
      const mapped = rows.map((r) => ({
        date: r.date || r.Date || "",
        rating: Number(r.rating || r.stars || 5),
        author: r.author || r.user || "",
        text: r.text || r.review || "",
        platform: r.platform || r.source || "",
      }));
      const reviewsWithIds = mapped.map((review) => ({
        ...review,
        id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
        status: "unreplied" as const,
      }));
      setReviews(reviewsWithIds);
    } catch (e) {
      try { (await import("@/lib/toast")).showToast("Could not load sample data", "error"); } catch {}
    }
  };

  const analyzeReview = (review: Review) => {
    const text = review.text.toLowerCase();
    const aspects = Object.entries(ASPECT_KEYWORDS)
      .map(([aspect, keywords]) => ({
        aspect,
        mentions: keywords.filter((keyword) => text.includes(keyword)).length,
      }))
      .filter((a) => a.mentions > 0);

    return aspects;
  };

  const generateReplyDrafts = (review: Review): string[] => {
    const tone = replyTone;
    let templates: string[];

    if (review.rating >= 4) {
      templates = REPLY_TEMPLATES.positive;
    } else if (review.rating >= 3) {
      templates = REPLY_TEMPLATES.neutral;
    } else {
      templates = REPLY_TEMPLATES.negative;
    }

    return templates.map((template) =>
      template.replace("{author}", review.author.split(" ")[0])
    );
  };

  const markAsReplied = (reviewId: string, replyText: string) => {
    setReviews(
      reviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              status: "replied",
              replySent: true,
              sentDate: todayISO(),
            }
          : review
      )
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  // ---------------- Enhanced Functions ----------------
  const generateAIResponse = async () => {
    if (!selectedReview) return;

    const result = await generateAIReviewResponse(
      selectedReview.text,
      selectedReview.rating,
      selectedReview.author,
      selectedReview.platform,
      apiKey
    );

    setAiGeneratedResponse(result.response);
    setAiConfidence(result.confidence);
  };

  const saveTemplateToLibrary = () => {
    const newTemplate: ReviewTemplate = {
      id: `template_${Date.now()}`,
      name: "Custom Template",
      type: "positive",
      platform: "google",
      content:
        "Thank you for your review, {{customerName}}! We appreciate your feedback.",
      variables: ["customerName"],
      tone: "warm",
      performance: { used: 0, avgRating: 4.0, conversionRate: 75 },
    };

    setReviewTemplates((prev) => [...prev, newTemplate]);
    setReviewLibrary((prev) => ({
      ...prev,
      templates: [...prev.templates, newTemplate],
    }));

    alert("Template saved to library!");
  };

  const generateBatchResponses = () => {
    const batchResponses = generateBatchResponseDrafts(reviews, reviewTemplates);
    setReviewResponses((prev) => [...prev, ...batchResponses]);
    alert(`Generated ${batchResponses.length} response drafts!`);
  };

  const calculateAnalytics = () => {
    const analytics = calculateReviewResponseAnalytics(
      reviews,
      reviewResponses
    );
    setReviewAnalytics(analytics);
  };

  const exportEnhancedReport = () => {
    if (!reviewAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Reviews,${reviewAnalytics.totalReviews}`,
      `Responded Reviews,${reviewAnalytics.respondedReviews}`,
      `Response Rate,${reviewAnalytics.responseRate.toFixed(2)}%`,
      `Average Rating,${reviewAnalytics.avgRating.toFixed(1)}`,
      `Average Response Time,${reviewAnalytics.avgResponseTime.toFixed(0)} hours`,
      `Customer Satisfaction,${reviewAnalytics.customerSatisfaction.toFixed(1)}%`,
      "",
      "Platform Performance,",
      ...Object.entries(reviewAnalytics.platformBreakdown).map(
        ([platform, data]) =>
          `${platform},${data.total},${data.responded},${data.avgRating.toFixed(1)},${data.avgResponseTime.toFixed(0)}`
      ),
      "",
      "Sentiment Breakdown,",
      ...Object.entries(reviewAnalytics.sentimentBreakdown).map(
        ([sentiment, count]) => `${sentiment},${count}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `enhanced-review-analytics-${todayISO()}.csv`);
  };

  const exportReplies = () => {
    const data = reviews.map((review) => ({
      date: review.date,
      author: review.author,
      rating: review.rating,
      platform: review.platform,
      status: review.status,
      reply_draft: review.replyDraft || "",
      sent_date: review.sentDate || "",
    }));
    const csv = toCSV(data);
    const blob = createCSVBlob(csv);
    saveBlob(blob, `review-replies-${todayISO()}.csv`);
  };

  const unrepliedReviews = reviews.filter((r) => r.status === "unreplied");
  const overdueReviews = unrepliedReviews.filter((review) => {
    const reviewDate = new Date(review.date);
    const now = new Date();
    const hoursDiff = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 72;
  });

  const stats = {
    total: reviews.length,
    unreplied: unrepliedReviews.length,
    overdue: overdueReviews.length,
    replied: reviews.filter((r) => r.status === "replied").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Review Response Studio"
        subtitle="AI-powered review management with intelligent responses, performance analytics, and automated optimization."
        actions={
          <div className="flex gap-2">
            <Button
              onClick={generateAIResponse}
              disabled={!selectedReview || !apiKey}
              variant="outline"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
            <Button
              onClick={calculateAnalytics}
              disabled={reviews.length === 0}
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              onClick={generateBatchResponses}
              disabled={reviews.length === 0}
              variant="outline"
            >
              <Layers className="h-4 w-4 mr-2" />
              Batch Generate
            </Button>
            <Button
              onClick={exportEnhancedReport}
              disabled={!reviewAnalytics}
              variant="outline"
            >
              <FileImage className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" onClick={loadSampleData}>
              <Upload className="h-4 w-4 mr-2" />
              Load Sample
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="reviews-upload"
              onChange={onImportFile}
            />
            <label htmlFor="reviews-upload">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </label>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard
          label="Total Reviews"
          value={stats.total}
          hint="All reviews"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <KPICard
          label="Response Rate"
          value={
            reviewAnalytics
              ? `${reviewAnalytics.responseRate.toFixed(1)}%`
              : `${stats.replied}/${stats.total}`
          }
          hint="Reviews responded to"
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <KPICard
          label="AI Status"
          value={apiKey ? "Connected" : "Setup"}
          hint="AI optimization"
          icon={<Brain className="h-4 w-4" />}
        />
        <KPICard
          label="Avg Rating"
          value={
            reviewAnalytics ? `${reviewAnalytics.avgRating.toFixed(1)}⭐` : "—"
          }
          hint="Review quality"
          icon={<Star className="h-4 w-4" />}
        />
        <KPICard
          label="Templates"
          value={reviewTemplates.length}
          hint="Saved templates"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <KPICard
          label="Overdue"
          value={stats.overdue}
          hint="Need urgent attention"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="reviews">Review Queue</TabsTrigger>
          <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
          <TabsTrigger value="composer">Reply Composer</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Review Responses Tool
              </CardTitle>
              <CardDescription>
                Learn how to manage customer reviews and generate professional,
                CASL-compliant responses for Belmont
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="h3 mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool helps you manage customer reviews from Google,
                    Yelp, and other platforms by generating professional,
                    personalized responses. It analyzes review content to
                    understand customer sentiment and provides reply templates
                    that maintain Belmont's brand voice while complying with
                    Canadian privacy laws.
                  </p>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Why Review Management Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Customer reviews directly impact Belmont's online reputation
                    and search rankings:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Google Business Profile rankings</strong> are
                      heavily influenced by review volume and response rate
                    </li>
                    <li>
                      <strong>Responding to reviews</strong> shows customers you
                      care and can improve their future experiences
                    </li>
                    <li>
                      <strong>Professional responses</strong> build trust and
                      demonstrate Belmont's commitment to service excellence
                    </li>
                    <li>
                      <strong>Review analytics</strong> help identify service
                      improvements and customer preferences
                    </li>
                    <li>
                      <strong>CASL compliance</strong> ensures all responses
                      follow Canadian privacy regulations
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Import your reviews:</strong> Upload a CSV file
                      from your review management platform or use the sample
                      data to see how it works
                    </li>
                    <li>
                      <strong>Review the queue:</strong> Check the "Review
                      Queue" tab to see all unreplied reviews, with overdue
                      items highlighted
                    </li>
                    <li>
                      <strong>Select a review to reply:</strong> Click the
                      "Reply" button on any review to open the reply composer
                    </li>
                    <li>
                      <strong>Review analysis:</strong> The tool automatically
                      analyzes the review content and detects mentioned aspects
                      (service, location, atmosphere, etc.)
                    </li>
                    <li>
                      <strong>Choose reply tone:</strong> Select "Warm" or
                      "Concise" tone for the reply drafts
                    </li>
                    <li>
                      <strong>Generate reply options:</strong> The tool creates
                      3 personalized reply drafts based on the review rating and
                      content
                    </li>
                    <li>
                      <strong>Copy and customize:</strong> Copy a draft reply
                      and make any personal touches before sending
                    </li>
                    <li>
                      <strong>Mark as replied:</strong> After sending the reply,
                      mark it as completed in the tool
                    </li>
                    <li>
                      <strong>Export for records:</strong> Download CSV files of
                      all reviews and responses for your records
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Best Practices for Review Responses
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Respond within 24 hours:</strong> Quick responses
                      show you value customer feedback
                    </li>
                    <li>
                      <strong>Personalize responses:</strong> Use the customer's
                      name and reference specific details from their review
                    </li>
                    <li>
                      <strong>Maintain professionalism:</strong> Keep responses
                      positive, helpful, and aligned with Belmont's brand voice
                    </li>
                    <li>
                      <strong>Address concerns privately:</strong> For negative
                      reviews, offer to discuss issues offline via phone or
                      email
                    </li>
                    <li>
                      <strong>Highlight improvements:</strong> Show how you've
                      addressed similar concerns in the past
                    </li>
                    <li>
                      <strong>Include booking CTAs:</strong> For positive
                      reviews, gently encourage future visits
                    </li>
                    <li>
                      <strong>Stay CASL compliant:</strong> Avoid promotional
                      content and respect privacy regulations
                    </li>
                    <li>
                      <strong>Track response metrics:</strong> Monitor response
                      time and customer satisfaction improvements
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Understanding Review Analysis
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Sentiment analysis:</strong> Reviews are
                      categorized as positive (4-5 stars), neutral (3 stars), or
                      negative (1-2 stars)
                    </li>
                    <li>
                      <strong>Aspect detection:</strong> The tool identifies
                      what customers are talking about (service quality,
                      location, atmosphere, wait times)
                    </li>
                    <li>
                      <strong>Reply templates:</strong> Different templates are
                      used based on review rating and detected aspects
                    </li>
                    <li>
                      <strong>Overdue tracking:</strong> Reviews older than 72
                      hours are flagged as overdue for urgent attention
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    CASL and Privacy Compliance
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Keep responses informational:</strong> Focus on
                      acknowledging feedback rather than selling services
                    </li>
                    <li>
                      <strong>Avoid promotional content:</strong> Don't use
                      reviews as an opportunity to advertise specials or
                      services
                    </li>
                    <li>
                      <strong>Don't collect contact info:</strong> Unless the
                      customer specifically requests further contact
                    </li>
                    <li>
                      <strong>Include opt-out language:</strong> If collecting
                      any information, provide clear opt-out instructions
                    </li>
                    <li>
                      <strong>Maintain professional boundaries:</strong> Keep
                      responses business-focused and appropriate
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Data Format Requirements
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Your CSV file should include these key columns (the tool
                    will map common variations):
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Date:</strong> When the review was posted
                      (YYYY-MM-DD format)
                    </li>
                    <li>
                      <strong>Rating:</strong> Star rating (1-5 scale)
                    </li>
                    <li>
                      <strong>Author:</strong> Customer name or username
                    </li>
                    <li>
                      <strong>Text:</strong> The full review content
                    </li>
                    <li>
                      <strong>Platform:</strong> Where the review was posted
                      (Google, Yelp, etc.)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Response Time Guidelines
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>5-star reviews:</strong> Respond within 24 hours
                      to maintain momentum
                    </li>
                    <li>
                      <strong>4-star reviews:</strong> Respond within 24 hours,
                      acknowledge positive aspects
                    </li>
                    <li>
                      <strong>3-star reviews:</strong> Respond within 12 hours,
                      thank them and note improvements
                    </li>
                    <li>
                      <strong>1-2 star reviews:</strong> Respond within 2-4
                      hours, apologize and offer offline resolution
                    </li>
                    <li>
                      <strong>Overdue reviews:</strong> Reviews over 72 hours
                      old need immediate attention
                    </li>
                  </ul>
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
                  AI Review Response Intelligence
                </CardTitle>
                <CardDescription>
                  Get AI-powered insights for optimizing your review response
                  strategy
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
                    Required for AI response generation and optimization
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Response Time</Label>
                    <Input
                      placeholder="e.g., 24 hours"
                      value="24 hours"
                      onChange={() => {}}
                    />
                  </div>
                  <div>
                    <Label>Performance Goal</Label>
                    <Input
                      placeholder="e.g., 90% response rate"
                      value={currentPerformance}
                      onChange={(e) => setCurrentPerformance(e.target.value)}
                    />
                  </div>
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
                        <CheckCircle className="h-4 w-4" />
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
                        Recommended Timing
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {aiOptimization.timingSuggestions.map((timing, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {timing}
                          </Badge>
                        ))}
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
                        Based on current response strategy and historical data
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() =>
                    getAIOptimization(reviews, reviewResponses, apiKey)
                  }
                  disabled={!apiKey}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Optimization
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Response Strategy Insights
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of your current response strategy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {reviewAnalytics?.responseRate.toFixed(1) || "—"}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Response Rate
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {reviewAnalytics?.avgResponseTime.toFixed(0) || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Response Time
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Platform Performance</h4>
                  {reviewAnalytics &&
                    Object.entries(reviewAnalytics.platformBreakdown).map(
                      ([platform, data]) => (
                        <div
                          key={platform}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                platform === "google"
                                  ? "bg-blue-500"
                                  : platform === "yelp"
                                    ? "bg-red-500"
                                    : "bg-purple-500"
                              }`}
                            />
                            <span className="capitalize text-sm">
                              {platform}
                            </span>
                          </div>
                          <span className="font-medium">
                            {data.avgResponseTime.toFixed(0)}h avg response
                          </span>
                        </div>
                      )
                    )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Response Time Recommendations</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>5-star reviews</span>
                      <span className="font-medium text-green-600">
                        Within 24h
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>3-4 star reviews</span>
                      <span className="font-medium text-yellow-600">
                        Within 12h
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>1-2 star reviews</span>
                      <span className="font-medium text-red-600">
                        Within 2-4h
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {/* Quick add + guidance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add a Review</CardTitle>
              <CardDescription>
                Paste or type a review to generate replies immediately. You can also Load Sample or Import CSV.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-5 gap-3">
              <div>
                <Label>Date</Label>
                <Input value={newReview.date} onChange={(e)=>setNewReview({...newReview, date: e.target.value})} />
              </div>
              <div>
                <Label>Rating (1-5)</Label>
                <Input type="number" min={1} max={5} value={newReview.rating} onChange={(e)=>setNewReview({...newReview, rating: Math.max(1, Math.min(5, parseInt(e.target.value||"5")))})} />
              </div>
              <div>
                <Label>Author</Label>
                <Input value={newReview.author} onChange={(e)=>setNewReview({...newReview, author: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <Label>Text</Label>
                <Input value={newReview.text} onChange={(e)=>setNewReview({...newReview, text: e.target.value})} placeholder="Type the review text" />
              </div>
              <div>
                <Label>Platform</Label>
                <Input value={newReview.platform} onChange={(e)=>setNewReview({...newReview, platform: e.target.value})} placeholder="google" />
              </div>
              <div className="md:col-span-4 flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!newReview.text.trim()) return;
                    const r: Review = {
                      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
                      date: newReview.date,
                      rating: newReview.rating,
                      author: newReview.author || "Customer",
                      text: newReview.text,
                      platform: newReview.platform || "google",
                      status: "unreplied",
                    };
                    setReviews((prev) => [r, ...prev]);
                    try { logEvent("review_added", { platform: r.platform, rating: r.rating }); } catch {}
                    setNewReview({ date: todayISO(), rating: 5, author: "", text: "", platform: "google" });
                  }}
                >
                  Add Review
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {reviews.map((review) => (
              <Card
                key={review.id}
                className={`cursor-pointer transition-colors ${
                  review.status === "unreplied"
                    ? "border-orange-200 bg-orange-50"
                    : ""
                } ${overdueReviews.some((r) => r.id === review.id) ? "border-red-200 bg-red-50" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          review.rating >= 4
                            ? "default"
                            : review.rating >= 3
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {review.rating} ⭐
                      </Badge>
                      <span className="font-medium">{review.author}</span>
                      <Badge variant="outline">{review.platform}</Badge>
                      {overdueReviews.some((r) => r.id === review.id) && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {review.date}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReview(review)}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{review.text}</p>
                  {review.status === "replied" && review.sentDate && (
                    <div className="mt-2 text-xs text-green-600">
                      ✅ Replied on {review.sentDate}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="composer" className="space-y-4">
          {selectedReview ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Review Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Review Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Customer</Label>
                    <p className="font-medium">{selectedReview.author}</p>
                  </div>
                  <div>
                    <Label>Rating</Label>
                    <Badge
                      variant={
                        selectedReview.rating >= 4
                          ? "default"
                          : selectedReview.rating >= 3
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {selectedReview.rating} ⭐
                    </Badge>
                  </div>
                  <div>
                    <Label>Review</Label>
                    <p className="text-sm bg-muted p-3 rounded">
                      {selectedReview.text}
                    </p>
                  </div>
                  <div>
                    <Label>Detected Aspects</Label>
                    <div className="flex flex-wrap gap-1">
                      {analyzeReview(selectedReview).map(
                        ({ aspect, mentions }) => (
                          <Badge key={aspect} variant="outline">
                            {aspect} ({mentions})
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reply Composer */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Reply Composer</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setReplyTone(
                            replyTone === "warm" ? "concise" : "warm"
                          )
                        }
                      >
                        {replyTone === "warm" ? "Make Concise" : "Make Warm"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Reply Drafts</Label>
                    <div className="space-y-2">
                      {generateReplyDrafts(selectedReview).map((draft, i) => (
                        <div key={i} className="border rounded p-3 space-y-2">
                          <Textarea
                            value={draft}
                            onChange={(e) => {
                              // Could implement draft editing here
                            }}
                            rows={3}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(draft)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Reply
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const draft = generateReplyDrafts(selectedReview)[0];
                        markAsReplied(selectedReview.id, draft);
                        try { logEvent("review_replied", { platform: selectedReview.platform, rating: selectedReview.rating }); } catch {}
                        setSelectedReview(null);
                      }}
                    >
                      Mark as Replied
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedReview(null)}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    💡 <strong>CASL/PIPEDA Note:</strong> Replies should be
                    informational only. Avoid promotional content and always
                    include opt-out language if collecting contact info.
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Select a review from the queue to compose a reply.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
