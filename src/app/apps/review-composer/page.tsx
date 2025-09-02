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
} from "lucide-react";
import { saveBlob, createCSVBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { todayISO, addDays } from "@/lib/dates";

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

const ASPECT_KEYWORDS = {
  service: ["service", "professional", "skilled", "expert", "barber"],
  vibe: ["atmosphere", "clean", "relaxing", "comfortable", "modern", "nice"],
  neighborhood: ["location", "bridgeland", "calgary", "area", "neighborhood"],
  wait: ["wait", "waiting", "busy", "appointment", "time", "quick"],
};

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyTone, setReplyTone] = useState<"warm" | "concise">("warm");

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
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
    };
    reader.readAsText(file);
  };

  const loadSampleData = async () => {
    try {
      const response = await fetch("/fixtures/reviews-sample.csv");
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
      alert("Could not load sample data");
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
        title="Review Responses"
        subtitle="Manage reviews and generate CASL‑compliant responses for The Belmont Barbershop."
        showLogo={true}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSampleData}>
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Reviews
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
                Import Reviews CSV
              </Button>
            </label>
            <Button
              variant="outline"
              onClick={exportReplies}
              disabled={!reviews.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Replies
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total" value={stats.total} />
        <KPICard label="Unreplied" value={stats.unreplied} />
        <KPICard label="Overdue" value={stats.overdue} />
        <KPICard label="Replied" value={stats.replied} />
      </div>

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="reviews">Review Queue</TabsTrigger>
          <TabsTrigger value="composer">Reply Composer</TabsTrigger>
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
                  <h3 className="font-semibold text-lg mb-2">
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
                  <h3 className="font-semibold text-lg mb-2">
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
                  <h3 className="font-semibold text-lg mb-2">
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
                  <h3 className="font-semibold text-lg mb-2">
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
                  <h3 className="font-semibold text-lg mb-2">
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
                  <h3 className="font-semibold text-lg mb-2">
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
                  <h3 className="font-semibold text-lg mb-2">
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
                  <h3 className="font-semibold text-lg mb-2">
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

        <TabsContent value="reviews" className="space-y-4">
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
