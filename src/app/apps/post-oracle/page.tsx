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
        title="Content Calendar"
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

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
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
