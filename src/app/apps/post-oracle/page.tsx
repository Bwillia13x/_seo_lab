"use client";

import React, { useEffect, useState } from "react";
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
import {
  Wand2,
  Copy,
  Download,
  Calendar,
  Instagram,
  MessageSquare,
  Info,
  Sparkles,
  Brain,
  BarChart3,
  Share2,
  Target,
  TrendingUp,
  Hash,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  BookOpen,
  Trash2,
  Zap,
  CheckCircle2,
  Lightbulb,
  Settings,
  RefreshCw,
  Clock,
  Play,
} from "lucide-react";
// Using server-managed AI via aiChatSafe
import { aiChatSafe } from "@/lib/ai";
import { saveBlob } from "@/lib/blob";
import { showToast } from "@/lib/toast";
import { addDays, todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// Enhanced Types for AI-Powered Content Generation
type Post = {
  id: string;
  date: string;
  platform:
    | "gbp"
    | "instagram"
    | "facebook"
    | "twitter"
    | "linkedin"
    | "youtube";
  title: string;
  content: string;
  hashtags: string[];
  utmUrl: string;
  imagePrompt?: string;
  aiGenerated?: boolean;
  quality?: ContentQuality;
  performance?: PostPerformance;
  scheduledDate?: string;
  category?: string;
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

type ContentQuality = {
  score: number;
  strengths: string[];
  improvements: string[];
};

type AITemplate = {
  name: string;
  description: string;
  prompt: string;
  category: string;
  platforms: string[];
};

type SavedContent = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  theme: string;
  platform: Post["platform"];
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

type ScheduledPost = {
  id: string;
  date: string;
  time: string;
  platform: string;
  content: Post;
  status: "draft" | "scheduled" | "published";
};

const SERVICES = [
  "Men's Haircut",
  "Beard Trim",
  "Hot Towel Shave",
  "Kids Cut",
  "Groomsmen Party Package",
];

const LOCAL_EVENTS = [
  "Bridgeland Farmers Market",
  "Community Festival",
  "Calgary Stampede",
  "Winter Festival",
  "Local Sports Event",
  "Christmas Market",
  "Summer Solstice Celebration",
  "Canada Day Parade",
  "Halloween Events",
  "New Year's Celebrations",
];

const PLATFORMS = [
  { key: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F" },
  { key: "facebook", name: "Facebook", icon: Facebook, color: "#1877F2" },
  { key: "twitter", name: "Twitter", icon: Twitter, color: "#1DA1F2" },
  { key: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { key: "gbp", name: "Google Business", icon: Target, color: "#34A853" },
  { key: "youtube", name: "YouTube", icon: Youtube, color: "#FF0000" },
];

const AI_TEMPLATES: AITemplate[] = [
  {
    name: "Service Showcase",
    description: "Highlight Belmont's premium services with local appeal",
    prompt:
      "Write an engaging post about {service} services at The Belmont Barbershop in {location}. Focus on the premium quality, professional experience, and local connection. Include why Belmont is the preferred choice for {audience} in the area. Make it compelling and include a clear call-to-action for booking.",
    category: "Service Promotion",
    platforms: ["instagram", "facebook", "gbp"],
  },
  {
    name: "Local Community",
    description: "Connect with local events and community spirit",
    prompt:
      "Create a post that ties Belmont Barbershop into the local {location} community and {event}. Show how Belmont participates in and supports local events. Highlight the community connection and encourage locals to visit for their grooming needs. Keep it warm and community-focused.",
    category: "Community",
    platforms: ["facebook", "instagram", "gbp"],
  },
  {
    name: "Seasonal Special",
    description: "Create timely content for holidays and seasons",
    prompt:
      "Write a seasonal post for Belmont Barbershop that connects with {season} or {holiday} in {location}. Tie it back to grooming services and how Belmont helps customers look their best for seasonal events. Make it timely and relevant with appropriate festive language.",
    category: "Seasonal",
    platforms: ["instagram", "facebook", "twitter"],
  },
  {
    name: "Expert Tips",
    description: "Share professional grooming advice",
    prompt:
      "Share expert grooming tips related to {service} from Belmont Barbershop. Make it educational yet approachable for {audience}. Include practical advice, safety tips, and when to book professional services. Position Belmont as the local expert.",
    category: "Education",
    platforms: ["instagram", "linkedin", "twitter"],
  },
  {
    name: "Customer Success",
    description: "Highlight customer satisfaction and results",
    prompt:
      "Create a post celebrating customer satisfaction at Belmont Barbershop. Focus on the quality experience, professional service, and positive outcomes for {audience} in {location}. Include subtle calls-to-action and build trust through social proof.",
    category: "Social Proof",
    platforms: ["instagram", "facebook", "gbp"],
  },
  {
    name: "Staff Spotlight",
    description: "Showcase Belmont's professional team",
    prompt:
      "Write a post highlighting Belmont Barbershop's professional team and their expertise in {service}. Emphasize the years of experience, attention to detail, and dedication to customer satisfaction in {location}. Build credibility and trust.",
    category: "Team",
    platforms: ["instagram", "facebook", "linkedin"],
  },
  {
    name: "Booking Promotion",
    description: "Drive appointment bookings with urgency",
    prompt:
      "Create a compelling post encouraging immediate bookings at Belmont Barbershop for {service}. Highlight availability, ease of booking, and the premium experience. Include urgency elements and clear booking instructions for {audience} in {location}.",
    category: "Promotions",
    platforms: ["instagram", "facebook", "gbp"],
  },
  {
    name: "Local Business Support",
    description: "Support other local businesses",
    prompt:
      "Write a post supporting other local businesses in {location} while highlighting Belmont Barbershop's role in the community. Show how Belmont contributes to the local economy and supports fellow business owners. Keep it genuine and community-minded.",
    category: "Community Support",
    platforms: ["facebook", "instagram", "linkedin"],
  },
];

export default function PostOracle() {
  const [services, setServices] = useState(SERVICES);
  const [selectedWeek, setSelectedWeek] = useState(todayISO());
  const [posts, setPosts] = useState<Post[]>([]);
  const [customEvent, setCustomEvent] = useState("");

  // Enhanced State for AI Features
  // No client API key; server-managed
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate>(
    AI_TEMPLATES[0]
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "instagram",
    "facebook",
    "gbp",
  ]);
  const [contentLibrary, setContentLibrary] = useState<ContentLibrary>({
    savedContent: [],
    templates: [],
    categories: [
      "Service Promotion",
      "Community",
      "Seasonal",
      "Education",
      "Social Proof",
      "Team",
      "Promotions",
      "Community Support",
    ],
  });
  const [selectedLibraryCategory, setSelectedLibraryCategory] =
    useState<string>("All");
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [abTestVersionA, setAbTestVersionA] = useState<string>("");
  const [abTestVersionB, setAbTestVersionB] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState<string>("");

  // ---------- AI Content Generation ----------
  async function generateAIContent() {
    setIsGenerating(true);
    try {
      const result = await generateAIContentWithOpenAI(
        selectedTemplate,
        services[Math.floor(Math.random() * services.length)],
        customEvent ||
          LOCAL_EVENTS[Math.floor(Math.random() * LOCAL_EVENTS.length)]
      );

      const newPost = createPostFromAI(
        selectedTemplate.category.toLowerCase(),
        selectedTemplate.platforms[0] as Post["platform"],
        result,
        true
      );

      setPosts((prev) => [...prev, newPost]);
      showToast("AI content generated successfully!", "success");
    } catch (error) {
      console.error("AI generation failed:", error);
      showToast("Failed to generate AI content.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateAIContentWithOpenAI(
    template: AITemplate,
    service: string,
    event: string
  ): Promise<{
    title: string;
    body: string;
    hashtags: string[];
    quality: ContentQuality;
  }> {
    try {

      let prompt = template.prompt
        .replace("{service}", service)
        .replace("{location}", "Bridgeland/Riverside, Calgary")
        .replace("{event}", event)
        .replace("{audience}", "local men seeking quality grooming services")
        .replace("{season}", "current season")
        .replace("{holiday}", "upcoming holiday");

      if (customInstructions) {
        prompt += `\n\nAdditional instructions: ${customInstructions}`;
      }

      const out = await aiChatSafe({
        model: "gpt-5-mini-2025-08-07",
        maxTokens: 400,
        temperature: 0.8,
        messages: [
          { role: "system", content: `You are a social media expert for The Belmont Barbershop in Bridgeland/Riverside, Calgary. Create engaging, professional content that resonates with local men seeking quality grooming services. Maintain a professional yet approachable tone. Keep posts concise and include clear calls-to-action.` },
          { role: "user", content: prompt },
        ],
      });

      const content = (out.ok ? out.content : "").trim();
      const lines = content.split("\n").filter((line) => line.trim());

      const title = lines[0] || `Premium ${service} at Belmont`;
      const body = lines.slice(1).join("\n") || content;

      // Extract hashtags from content
      const hashtagRegex = /#[\w]+/g;
      const extractedHashtags = content.match(hashtagRegex) || [];
      const optimizedHashtags = generateOptimizedHashtags(service, event);

      const quality = calculateContentQuality(body, template.category);

      return {
        title,
        body,
        hashtags: Array.from(
          new Set([...extractedHashtags, ...optimizedHashtags])
        ),
        quality,
      };
    } catch (error) {
      console.error("AI generation failed:", error);
      // Fallback to basic content
      const fallback = {
        title: `Premium ${service} Services`,
        body: `Experience our premium ${service.toLowerCase()} services at The Belmont Barbershop in Bridgeland. Professional service with a personal touch.`,
        hashtags: ["Belmont", "Bridgeland", "Calgary"],
        quality: {
          score: 60,
          strengths: ["Basic content"],
          improvements: ["Consider regenerating with AI"],
        },
      };
      return fallback;
    }
  }

  function calculateContentQuality(
    content: string,
    category: string
  ): ContentQuality {
    let score = 50;
    const strengths: string[] = [];
    const improvements: string[] = [];

    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 50 && wordCount <= 150) {
      score += 15;
      strengths.push("Optimal length for engagement");
    } else if (wordCount > 150) {
      score += 5;
      improvements.push("Consider shortening for better engagement");
    }

    const ctaWords = ["book", "call", "visit", "schedule", "contact", "DM"];
    const hasCTA = ctaWords.some((word) =>
      content.toLowerCase().includes(word)
    );
    if (hasCTA) {
      score += 15;
      strengths.push("Includes clear call-to-action");
    } else {
      improvements.push("Add a clear call-to-action");
    }

    const localWords = ["bridgeland", "riverside", "calgary", "belmont"];
    const hasLocal = localWords.some((word) =>
      content.toLowerCase().includes(word)
    );
    if (hasLocal) {
      score += 10;
      strengths.push("Includes local relevance");
    } else {
      improvements.push("Add local community references");
    }

    const emojiCount = (
      content.match(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu
      ) || []
    ).length;
    if (emojiCount >= 1 && emojiCount <= 3) {
      score += 10;
      strengths.push("Uses emojis appropriately");
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      strengths,
      improvements,
    };
  }

  function generateOptimizedHashtags(service: string, event: string): string[] {
    const baseHashtags = [
      "Belmont",
      "Bridgeland",
      "Calgary",
      "Barbershop",
      "MensGrooming",
    ];
    const serviceHashtags = service
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    const eventHashtags = event ? [event.replace(/\s+/g, "")] : [];

    return [...baseHashtags, ...serviceHashtags, ...eventHashtags].slice(0, 8);
  }

  function createPostFromAI(
    theme: string,
    platform: Post["platform"],
    aiResult: {
      title: string;
      body: string;
      hashtags: string[];
      quality: ContentQuality;
    },
    aiGenerated = false
  ): Post {
    const postDate = todayISO();
    const utmParams = {
      instagram: {
        utm_source: "instagram",
        utm_medium: "social",
        utm_campaign: "ai-content",
      },
      facebook: {
        utm_source: "facebook",
        utm_medium: "social",
        utm_campaign: "ai-content",
      },
      twitter: {
        utm_source: "twitter",
        utm_medium: "social",
        utm_campaign: "ai-content",
      },
      linkedin: {
        utm_source: "linkedin",
        utm_medium: "social",
        utm_campaign: "ai-content",
      },
      gbp: {
        utm_source: "google",
        utm_medium: "gbp",
        utm_campaign: "ai-content",
      },
      youtube: {
        utm_source: "youtube",
        utm_medium: "video",
        utm_campaign: "ai-content",
      },
    };

    const utm = buildUtmUrl(
      "https://thebelmontbarber.ca/book",
      utmParams[platform],
      postDate
    );

    return {
      id: `ai-${platform}-${Date.now()}`,
      date: postDate,
      platform,
      title: aiResult.title,
      content: aiResult.body,
      hashtags: aiResult.hashtags,
      utmUrl: utm,
      aiGenerated,
      quality: aiResult.quality,
      category: theme,
      performance: {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        clicks: 0,
        engagementRate: 0,
        date: postDate,
      },
    };
  }

  function buildUtmUrl(
    baseUrl: string,
    params: Record<string, string>,
    date: string
  ): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    url.searchParams.set("utm_content", date);
    return url.toString();
  }

  // ---------- Content Library Functions ----------
  function savePostToLibrary(post: Post, tags: string[] = []) {
    const quality =
      post.quality ||
      calculateContentQuality(post.content, post.category || "general");
    const savedContent: SavedContent = {
      id: post.id + "_saved",
      title: post.title,
      body: post.content,
      hashtags: post.hashtags,
      theme: post.category || "general",
      platform: post.platform,
      aiGenerated: post.aiGenerated || false,
      qualityScore: quality.score,
      performance: post.performance || {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        clicks: 0,
        engagementRate: 0,
        date: post.date,
      },
      savedDate: todayISO(),
      tags,
      category: post.category || "general",
    };

    setContentLibrary((prev) => ({
      ...prev,
      savedContent: [...prev.savedContent, savedContent],
    }));
    import("@/lib/toast").then((m) => m.showToast("Content saved to library!", "success")).catch(() => {});
  }

  function loadFromLibrary(savedContent: SavedContent) {
    const newPost = createPostFromAI(
      savedContent.category,
      savedContent.platform,
      {
        title: savedContent.title,
        body: savedContent.body,
        hashtags: savedContent.hashtags,
        quality: {
          score: savedContent.qualityScore,
          strengths: ["Loaded from library"],
          improvements: [],
        },
      },
      savedContent.aiGenerated
    );

    setPosts((prev) => [...prev, newPost]);
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
      platform: post.platform,
      content: post,
      status: "scheduled",
    };

    setScheduledPosts((prev) => [...prev, scheduledPost]);
    import("@/lib/toast").then((m) => m.showToast(`Post scheduled for ${date} at ${time} on ${post.platform}`, "success")).catch(() => {});
  }

  const generatePosts = () => {
    const weekStart = new Date(selectedWeek);
    const newPosts: Post[] = [];

    // Generate 4 posts per week
    for (let i = 0; i < 4; i++) {
      const postDate = addDays(i * 2); // Every other day
      const service = services[Math.floor(Math.random() * services.length)];
      const includeEvent = Math.random() > 0.5;
      const event = includeEvent
        ? customEvent ||
          LOCAL_EVENTS[Math.floor(Math.random() * LOCAL_EVENTS.length)]
        : null;

      // GBP Post
      const gbpPost: Post = {
        id: `gbp-${i}`,
        date: postDate,
        platform: "gbp",
        title: generateTitle(service, event),
        content: generateGBPContent(service, event),
        hashtags: ["Bridgeland", "Calgary", "Barbershop"],
        utmUrl: `https://thebelmontbarber.ca/book?utm_source=google&utm_medium=gbp&utm_campaign=weekly-post-${i}&utm_content=${service.toLowerCase().replace(/\s+/g, "-")}`,
      };

      // Instagram Post
      const igPost: Post = {
        id: `ig-${i}`,
        date: postDate,
        platform: "instagram",
        title: generateTitle(service, event),
        content: generateIGContent(service, event),
        hashtags: [
          "barberlife",
          "mensgrooming",
          "calgarybarber",
          "bridgeland",
          "thebelmont",
        ],
        utmUrl: `https://thebelmontbarber.ca/book?utm_source=instagram&utm_medium=social&utm_campaign=weekly-post-${i}&utm_content=${service.toLowerCase().replace(/\s+/g, "-")}`,
        imagePrompt: generateImagePrompt(service, event),
      };

      newPosts.push(gbpPost, igPost);
    }

    setPosts(newPosts);
  };

  const generateTitle = (service: string, event: string | null): string => {
    const titles = [
      `${service} Special at The Belmont`,
      `Premium ${service} Services`,
      `Expert ${service} in Bridgeland`,
      `${service} & Grooming Excellence`,
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  };

  const generateGBPContent = (
    service: string,
    event: string | null
  ): string => {
    let content = `Experience our premium ${service.toLowerCase()} services at The Belmont Barbershop in Bridgeland. `;

    if (event) {
      content += `Perfect for ${event}! `;
    }

    content += `Licensed barbers, professional service, and a relaxing atmosphere. Book now at (403) 457-0420.`;

    return content;
  };

  const generateIGContent = (service: string, event: string | null): string => {
    let content = `✂️ Transform your look with our expert ${service.toLowerCase()} services! 💺\n\n`;

    if (event) {
      content += `🌟 Special timing for ${event}!\n\n`;
    }

    content += `🏠 Located in the heart of Bridgeland\n`;
    content += `👨‍💼 Licensed professional barbers\n`;
    content += `⏰ Mon-Fri 10AM-7PM, Sat-Sun 10AM-5PM\n`;
    content += `📞 Book: (403) 457-0420\n\n`;
    content += `#TheBelmont #Bridgeland #CalgaryBarber`;

    return content;
  };

  const generateImagePrompt = (
    service: string,
    event: string | null
  ): string => {
    let prompt = `Professional barber shop interior, clean and modern, ${service.toLowerCase()} service in progress, warm lighting, customers waiting comfortably`;

    if (event) {
      prompt += `, incorporating elements of ${event}`;
    }

    return prompt;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const copyToPostStudio = () => {
    const jsonData = JSON.stringify(posts, null, 2);
    copyToClipboard(jsonData);
    // In a real implementation, this would navigate to Post Studio with the data
  };

  const exportPosts = () => {
    const csvContent = [
      "Date,Platform,Title,Content,UTM URL,Hashtags,Image Prompt",
      ...posts.map((post) =>
        [
          post.date,
          post.platform,
          `"${post.title}"`,
          `"${post.content.replace(/"/g, '""')}"`,
          post.utmUrl,
          post.hashtags.join(";"),
          `"${post.imagePrompt || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    saveBlob(blob, `belmont-posts-${selectedWeek}.csv`);
  };

  const postsByDate = posts.reduce(
    (acc, post) => {
      if (!acc[post.date]) acc[post.date] = [];
      acc[post.date].push(post);
      return acc;
    },
    {} as Record<string, Post[]>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Content Studio"
        subtitle="Generate intelligent, local-focused content across all platforms with AI-powered optimization."
        actions={
          <div className="flex gap-2">
            <Button onClick={generatePosts}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Posts
            </Button>
            <span className="advanced-only contents">
              <Button onClick={generateAIContent} disabled={isGenerating} variant="outline">
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI Generate
              </Button>
              <Button
                variant="outline"
                onClick={exportPosts}
                disabled={!posts.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard
          label="Posts Generated"
          value={posts.length}
          hint="This week"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <KPICard
          label="AI Generated"
          value={posts.filter((p) => p.aiGenerated).length}
          hint="Smart content"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <KPICard
          label="Platforms"
          value={new Set(posts.map((p) => p.platform)).size}
          hint="Multi-platform"
          icon={<Share2 className="h-4 w-4" />}
        />
        <KPICard
          label="Quality Score"
          value={
            posts.length > 0
              ? Math.round(
                  posts.reduce((acc, p) => acc + (p.quality?.score || 0), 0) /
                    posts.length
                )
              : 0
          }
          hint="Avg score"
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          label="Library Items"
          value={contentLibrary.savedContent.length}
          hint="Saved content"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <KPICard
          label="Scheduled"
          value={scheduledPosts.length}
          hint="Upcoming posts"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="ai-generate">AI Generate</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="ab-test">A/B Test</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </span>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Content Calendar Tool
              </CardTitle>
              <CardDescription>
                Learn how to create and manage weekly social media and Google
                Business Profile posts for Belmont
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool generates a complete weekly content calendar with
                    ready-to-post content for Google Business Profile and
                    Instagram. It creates engaging posts that highlight
                    Belmont's services, includes UTM tracking links for
                    analytics, and provides AI image prompts for visual content.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Content Calendar Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Consistent social media presence helps Belmont stay
                    top-of-mind with customers and improves local search
                    rankings:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Google Business Profile posts</strong> improve
                      local search visibility and click-through rates
                    </li>
                    <li>
                      <strong>Instagram content</strong> builds community
                      engagement and brand awareness
                    </li>
                    <li>
                      <strong>UTM tracking links</strong> help measure which
                      posts drive the most bookings
                    </li>
                    <li>
                      <strong>Consistent posting</strong> signals to Google that
                      Belmont is an active, reliable business
                    </li>
                    <li>
                      <strong>Local event tie-ins</strong> help Belmont
                      participate in community conversations
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Set your parameters:</strong> Choose the week you
                      want to plan for and optionally add a custom local event
                    </li>
                    <li>
                      <strong>Select services to feature:</strong> Click on
                      service badges to include or exclude specific services
                      from the calendar
                    </li>
                    <li>
                      <strong>Generate posts:</strong> Click "Generate Posts" to
                      create 4 days worth of content (8 posts total - 4 GBP + 4
                      Instagram)
                    </li>
                    <li>
                      <strong>Review generated content:</strong> Check each
                      post's title, content, hashtags, and UTM tracking links
                    </li>
                    <li>
                      <strong>Copy content to post:</strong> Use the copy
                      buttons to copy post content to your clipboard
                    </li>
                    <li>
                      <strong>Export for records:</strong> Download a CSV file
                      of all posts for your content management records
                    </li>
                    <li>
                      <strong>Copy to Post Studio:</strong> Send the generated
                      content to the Post Studio tool for further editing
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for Belmont Posts
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Post consistently:</strong> Aim for 3-4 posts per
                      week to stay visible without overwhelming your audience
                    </li>
                    <li>
                      <strong>Include local context:</strong> Mention
                      Bridgeland, Riverside, or Calgary events and landmarks
                    </li>
                    <li>
                      <strong>Highlight specials:</strong> Promote veterans
                      discounts, groomsmen packages, and seasonal offers
                    </li>
                    <li>
                      <strong>Use emojis strategically:</strong> Add personality
                      but don't overdo it (2-3 per Instagram post)
                    </li>
                    <li>
                      <strong>Include booking CTAs:</strong> Every post should
                      encourage customers to book appointments
                    </li>
                    <li>
                      <strong>Track performance:</strong> Use UTM links to see
                      which types of posts drive the most bookings
                    </li>
                    <li>
                      <strong>Engage with responses:</strong> Reply to comments
                      and messages within 24 hours
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    UTM Tracking Parameters
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Source:</strong> Identifies where traffic comes
                      from (google, instagram, facebook)
                    </li>
                    <li>
                      <strong>Medium:</strong> Describes the type of link (gbp,
                      social, email, referral)
                    </li>
                    <li>
                      <strong>Campaign:</strong> Groups related posts
                      (weekly-post-1, stampede-special, etc.)
                    </li>
                    <li>
                      <strong>Content:</strong> Identifies the specific service
                      or offer being promoted
                    </li>
                    <li>
                      <strong>Tracking benefits:</strong> See which posts drive
                      the most bookings and customer engagement
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Content Types and Timing
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Monday:</strong> Service highlights and weekly
                      specials
                    </li>
                    <li>
                      <strong>Wednesday:</strong> Local event tie-ins and
                      community content
                    </li>
                    <li>
                      <strong>Friday:</strong> Weekend promotions and
                      appointment availability
                    </li>
                    <li>
                      <strong>Sunday:</strong> Preview of upcoming week's
                      services and staff highlights
                    </li>
                    <li>
                      <strong>Best posting times:</strong> Weekdays 11AM-2PM,
                      Weekends 10AM-12PM
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Google Business Profile Posts
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    GBP posts appear directly in Google search results and Maps:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Keep under 750 characters</strong> for full
                      display in search results
                    </li>
                    <li>
                      <strong>Include your phone number</strong> so customers
                      can call directly
                    </li>
                    <li>
                      <strong>Add location context</strong> like "in Bridgeland"
                      or "near the LRT"
                    </li>
                    <li>
                      <strong>Use keywords naturally</strong> like "men's
                      haircut", "beard trim", "professional barber"
                    </li>
                    <li>
                      <strong>Include booking encouragement</strong> like "Book
                      now" or "Easy online booking"
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Instagram Content Strategy
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Visual storytelling:</strong> Use the AI image
                      prompts to create compelling visuals
                    </li>
                    <li>
                      <strong>Engagement hooks:</strong> Ask questions like
                      "What's your go-to hairstyle?"
                    </li>
                    <li>
                      <strong>Behind-the-scenes:</strong> Show staff, equipment,
                      and the Belmont atmosphere
                    </li>
                    <li>
                      <strong>Customer features:</strong> Share before/after
                      photos (with permission)
                    </li>
                    <li>
                      <strong>Reels for education:</strong> Short videos showing
                      haircut techniques or product demos
                    </li>
                    <li>
                      <strong>Stories for daily updates:</strong> Quick polls,
                      appointment availability, daily specials
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Generate Tab */}
        <TabsContent value="ai-generate" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Content Generation
                </CardTitle>
                <CardDescription>
                  Generate intelligent content tailored for Belmont's local
                  audience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* No API key input needed – server-managed */}

                <div>
                  <Label>Content Template</Label>
                  <select
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
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description}
                  </p>
                </div>

                <div>
                  <Label>Platform Selection</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = selectedPlatforms.includes(
                        platform.key
                      );
                      return (
                        <Button
                          key={platform.key}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedPlatforms((prev) =>
                              isSelected
                                ? prev.filter((p) => p !== platform.key)
                                : [...prev, platform.key]
                            );
                          }}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {platform.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Custom Instructions (Optional)</Label>
                  <Textarea
                    placeholder="Add specific instructions for the AI (e.g., 'focus on holiday specials', 'emphasize veterans discount', etc.)"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={generateAIContent} disabled={isGenerating || selectedPlatforms.length === 0} className="w-full">
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Generation Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>
                    <strong>Local Relevance:</strong> AI automatically includes
                    Bridgeland/Calgary references
                  </p>
                  <p>
                    <strong>Call-to-Actions:</strong> Content includes booking
                    encouragement
                  </p>
                  <p>
                    <strong>Platform Optimization:</strong> Content tailored for
                    each platform's style
                  </p>
                  <p>
                    <strong>Quality Scoring:</strong> Each piece gets automatic
                    quality analysis
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>💡 Pro Tip:</strong> Try different templates for
                    variety, or add custom instructions for specific promotions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quality Analysis Tab */}
        <TabsContent value="quality" className="space-y-6 advanced-only">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Content Quality Analysis
              </CardTitle>
              <CardDescription>
                Review and optimize your generated content quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Content to Analyze
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate some posts first to see quality analysis.
                  </p>
                  <Button onClick={() => generatePosts()}>
                    Generate Posts
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {posts.map((post, index) => {
                    const quality =
                      post.quality ||
                      calculateContentQuality(
                        post.content,
                        post.category || "general"
                      );
                    const scoreColor =
                      quality.score >= 80
                        ? "text-green-600"
                        : quality.score >= 60
                          ? "text-yellow-600"
                          : "text-red-600";

                    return (
                      <Card key={post.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{post.title}</h4>
                                {post.aiGenerated && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    AI
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {post.platform}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Quality: {quality.score}/100</span>
                                <span>Category: {post.category}</span>
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

                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium mb-2 text-green-600">
                                ✓ Strengths
                              </h5>
                              <ul className="list-disc pl-5 space-y-1 text-sm">
                                {quality.strengths.map((strength, i) => (
                                  <li key={i} className="text-green-700">
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {quality.improvements.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2 text-orange-600">
                                  ⚠️ Suggestions
                                </h5>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                  {quality.improvements.map(
                                    (improvement, i) => (
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
                                {post.content}
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

        {/* A/B Test Tab */}
        <TabsContent value="ab-test" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  A/B Test Studio
                </CardTitle>
                <CardDescription>
                  Test different content variations to find what performs best
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Version A</Label>
                  <Textarea
                    placeholder="Enter first version of your content..."
                    value={abTestVersionA}
                    onChange={(e) => setAbTestVersionA(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Version B</Label>
                  <Textarea
                    placeholder="Enter second version of your content..."
                    value={abTestVersionB}
                    onChange={(e) => setAbTestVersionB(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Run A/B Test
                  </Button>
                  <Button variant="outline" className="flex-1">
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Testing Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  <li>• Consider time of day and day of week</li>
                </ul>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg mt-4">
                  <p className="text-sm">
                    <strong>💡 Best Practice:</strong> Always test during your
                    normal posting times and with your usual audience size.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Library Tab */}
        <TabsContent value="library" className="space-y-6 advanced-only">
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
                  <h3 className="text-lg font-medium mb-2">No Saved Content</h3>
                  <p className="text-muted-foreground mb-4">
                    Save your best performing posts to build a reusable content
                    library.
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
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler" className="space-y-6 advanced-only">
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
                            {post.title} ({post.platform})
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
                                    onClick={() => {
                                      setScheduledPosts((prev) =>
                                        prev.map((post) =>
                                          post.id === scheduledPost.id
                                            ? { ...post, status: "published" }
                                            : post
                                        )
                                      );
                                    }}
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Views
                    </p>
                    <p className="text-2xl font-bold">
                      {posts.reduce(
                        (acc, post) => acc + (post.performance?.views || 0),
                        0
                      )}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Likes
                    </p>
                    <p className="text-2xl font-bold">
                      {posts.reduce(
                        (acc, post) => acc + (post.performance?.likes || 0),
                        0
                      )}
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
                      Total Shares
                    </p>
                    <p className="text-2xl font-bold">
                      {posts.reduce(
                        (acc, post) => acc + (post.performance?.shares || 0),
                        0
                      )}
                    </p>
                  </div>
                  <Share2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg Engagement
                    </p>
                    <p className="text-2xl font-bold">
                      {posts.length > 0
                        ? Math.round(
                            (posts.reduce(
                              (acc, post) =>
                                acc + (post.performance?.engagementRate || 0),
                              0
                            ) /
                              posts.length) *
                              100
                          ) / 100
                        : 0}
                      %
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance by Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PLATFORMS.map((platform) => {
                  const platformPosts = posts.filter(
                    (p) => p.platform === platform.key
                  );
                  const totalViews = platformPosts.reduce(
                    (acc, post) => acc + (post.performance?.views || 0),
                    0
                  );
                  const totalLikes = platformPosts.reduce(
                    (acc, post) => acc + (post.performance?.likes || 0),
                    0
                  );
                  const avgEngagement =
                    platformPosts.length > 0
                      ? platformPosts.reduce(
                          (acc, post) =>
                            acc + (post.performance?.engagementRate || 0),
                          0
                        ) / platformPosts.length
                      : 0;

                  return (
                    <div
                      key={platform.key}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <platform.icon
                          className="h-5 w-5"
                          style={{ color: platform.color }}
                        />
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {platformPosts.length} posts
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{totalViews} views</p>
                        <p className="text-sm text-muted-foreground">
                          {totalLikes} likes •{" "}
                          {(avgEngagement * 100).toFixed(1)}% engagement
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="week">Week Starting</Label>
                  <Input
                    id="week"
                    type="date"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event">Custom Event (Optional)</Label>
                  <Input
                    id="event"
                    placeholder="e.g., Calgary Stampede, Local Festival"
                    value={customEvent}
                    onChange={(e) => setCustomEvent(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Services to Feature</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SERVICES.map((service) => (
                    <Badge
                      key={service}
                      variant={
                        services.includes(service) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        if (services.includes(service)) {
                          setServices(services.filter((s) => s !== service));
                        } else {
                          setServices([...services, service]);
                        }
                      }}
                    >
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(postsByDate).map(([date, datePosts]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(date).toLocaleDateString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {datePosts.map((post) => (
                      <div
                        key={post.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={
                              post.platform === "gbp" ? "default" : "secondary"
                            }
                          >
                            {post.platform === "gbp" ? (
                              <MessageSquare className="h-3 w-3 mr-1" />
                            ) : (
                              <Instagram className="h-3 w-3 mr-1" />
                            )}
                            {post.platform.toUpperCase()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(post.content)}
                            title="Copy content"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => savePostToLibrary(post)}
                            title="Save to library"
                          >
                            <BookOpen className="h-3 w-3" />
                          </Button>
                        </div>

                        <h4 className="font-medium">{post.title}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {post.content}
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {post.hashtags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground break-all">
                          {post.utmUrl}
                        </div>

                        {post.imagePrompt && (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            <strong>Image:</strong> {post.imagePrompt}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="text-center text-muted-foreground">
            Calendar view would show posts organized by date with drag-and-drop
            scheduling. This is a placeholder for future enhancement.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
