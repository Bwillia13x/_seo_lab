"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { addDays, todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

type Post = {
  id: string;
  date: string;
  platform: "gbp" | "instagram";
  title: string;
  content: string;
  hashtags: string[];
  utmUrl: string;
  imagePrompt?: string;
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
];

export default function PostOracle() {
  const [services, setServices] = useState(SERVICES);
  const [selectedWeek, setSelectedWeek] = useState(todayISO());
  const [posts, setPosts] = useState<Post[]>([]);
  const [customEvent, setCustomEvent] = useState("");

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
        title="Post Oracle"
        subtitle="Generate weekly GBP and Instagram posts with UTM tracking for The Belmont Barbershop."
        actions={
          <div className="flex gap-2">
            <Button onClick={generatePosts}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Posts
            </Button>
            <Button
              variant="outline"
              onClick={exportPosts}
              disabled={!posts.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={copyToPostStudio}
              disabled={!posts.length}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to Post Studio
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Posts Generated"
          value={posts.length}
          hint="This week"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <KPICard
          label="GBP Posts"
          value={posts.filter((p) => p.platform === "gbp").length}
          hint="Google Business"
          icon={<Calendar className="h-4 w-4" />}
        />
        <KPICard
          label="Instagram Posts"
          value={posts.filter((p) => p.platform === "instagram").length}
          hint="Social media"
          icon={<Instagram className="h-4 w-4" />}
        />
        <KPICard
          label="UTM Links"
          value={posts.length}
          hint="Trackable URLs"
          icon={<Copy className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="generator">
        <TabsList>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

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
                          >
                            <Copy className="h-3 w-3" />
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
