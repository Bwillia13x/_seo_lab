"use client";

import React, { useState } from "react";
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
import { Upload, Radar, TrendingUp, Target, Info, MapPin } from "lucide-react";

export default function NeighborSignal() {
  const [content, setContent] = useState("");
  const [score, setScore] = useState(0);

  const analyzeContent = () => {
    const localTerms = [
      "bridgeland",
      "riverside",
      "calgary",
      "community",
      "local",
      "neighborhood",
    ];
    const words = content.toLowerCase().split(/\s+/);
    const localWords = words.filter((word) =>
      localTerms.some((term) => word.includes(term))
    ).length;
    const calculatedScore = Math.min(
      100,
      Math.round((localWords / words.length) * 100)
    );
    setScore(calculatedScore);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Local Content Ideas"
        subtitle="Analyze content for local SEO signals and suggest improvements for Bridgeland/Riverside."
      />

      <Tabs defaultValue="howto" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </span>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Local Content Ideas Tool
              </CardTitle>
              <CardDescription>
                Learn how to optimize your content for local SEO in Bridgeland
                and Riverside
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool analyzes your content (GBP posts, website copy,
                    social media) to measure how well it signals to Google that
                    Belmont is a local Bridgeland business. It scores content
                    based on local keyword usage and provides suggestions for
                    improvement.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Local Content Signals Matter
                  </h3>
                  <p className="text-muted-foreground">
                    Google prioritizes businesses that clearly demonstrate
                    they're part of their local community:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Local pack rankings:</strong> Content with local
                      terms ranks better in map results
                    </li>
                    <li>
                      <strong>Relevance signals:</strong> Google wants to show
                      businesses that understand local context
                    </li>
                    <li>
                      <strong>Community connection:</strong> Customers prefer
                      businesses that feel like part of their neighborhood
                    </li>
                    <li>
                      <strong>Competitive advantage:</strong> Many local
                      businesses don't optimize for local signals
                    </li>
                    <li>
                      <strong>Trust building:</strong> Local content builds
                      credibility with both customers and Google
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Paste your content:</strong> Copy any content you
                      want to analyze (GBP posts, website text, social media)
                    </li>
                    <li>
                      <strong>Run the analysis:</strong> Click "Analyze Local
                      Signals" to get your local SEO score
                    </li>
                    <li>
                      <strong>Review the score:</strong> Check your local signal
                      strength (aim for 60% or higher)
                    </li>
                    <li>
                      <strong>Apply suggestions:</strong> Use the improvement
                      suggestions to boost your score
                    </li>
                    <li>
                      <strong>Test variations:</strong> Try different versions
                      of content to see what works best
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Understanding Local Signal Scores
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>70-100% (Excellent):</strong> Strong local signals
                      - content is well-optimized for Bridgeland
                    </li>
                    <li>
                      <strong>40-69% (Good):</strong> Moderate local signals -
                      some improvements needed
                    </li>
                    <li>
                      <strong>0-39% (Needs Work):</strong> Weak local signals -
                      significant improvements recommended
                    </li>
                    <li>
                      <strong>Target score:</strong> Aim for 60%+ for optimal
                      local SEO performance
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Key Local Terms for Belmont
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Location terms:</strong> Bridgeland, Riverside,
                      Calgary, neighborhood, local
                    </li>
                    <li>
                      <strong>Community terms:</strong> community, residents,
                      locals, area businesses
                    </li>
                    <li>
                      <strong>Landmarks:</strong> LRT station, Prince's Island
                      Park, Calgary Tower, Glenmore Reservoir
                    </li>
                    <li>
                      <strong>Events:</strong> Calgary Stampede, Folk Festival,
                      community markets, local festivals
                    </li>
                    <li>
                      <strong>Directions:</strong> near LRT, accessible by
                      transit, downtown Calgary access
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Content Types to Optimize
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Google Business Profile:</strong> Posts, business
                      description, Q&A responses
                    </li>
                    <li>
                      <strong>Website content:</strong> Homepage, services page,
                      about page, contact information
                    </li>
                    <li>
                      <strong>Social media:</strong> Facebook posts, Instagram
                      captions, local event mentions
                    </li>
                    <li>
                      <strong>Email signatures:</strong> Include neighborhood
                      context in business communications
                    </li>
                    <li>
                      <strong>Blog posts:</strong> Write about local events,
                      community news, neighborhood changes
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for Local Content
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Natural integration:</strong> Include local terms
                      naturally, not forced
                    </li>
                    <li>
                      <strong>Multiple mentions:</strong> Reinforce location
                      across different content types
                    </li>
                    <li>
                      <strong>Stay current:</strong> Update content when local
                      context changes (new businesses, events)
                    </li>
                    <li>
                      <strong>Customer-focused:</strong> Use local terms that
                      customers actually search for
                    </li>
                    <li>
                      <strong>Competitor awareness:</strong> Include terms that
                      differentiate Belmont from other barbershops
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyzer" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Local Score"
              value={`${score}%`}
              hint="Local signal strength"
              icon={<Radar className="h-4 w-4" />}
            />
            <KPICard
              label="Word Count"
              value={content.split(/\s+/).filter(Boolean).length}
              hint="Content length"
              icon={<Target className="h-4 w-4" />}
            />
            <KPICard
              label="Local Terms"
              value={
                score > 0
                  ? Math.round((score / 100) * content.split(/\s+/).length)
                  : 0
              }
              hint="Detected terms"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KPICard
              label="Optimization"
              value={
                score > 70 ? "Excellent" : score > 40 ? "Good" : "Needs Work"
              }
              hint="SEO readiness"
              icon={<Info className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="content">Content to Analyze</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your GBP post, website content, or social media copy here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                  />
                </div>
                <Button onClick={analyzeContent} disabled={!content.trim()}>
                  <Radar className="h-4 w-4 mr-2" />
                  Analyze Local Signals
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Local Signal Score</Label>
                  <div className="text-3xl font-bold">{score}/100</div>
                  <Badge
                    variant={
                      score > 60
                        ? "default"
                        : score > 30
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {score > 60
                      ? "Strong Local Signal"
                      : score > 30
                        ? "Moderate"
                        : "Weak Local Signal"}
                  </Badge>
                </div>

                {score < 50 && (
                  <div className="space-y-2">
                    <Label>Suggestions</Label>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Add "Bridgeland" or "Riverside" to your content</p>
                      <p>• Mention local landmarks or community events</p>
                      <p>• Include neighborhood-specific terms</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Local Content Suggestions</CardTitle>
              <CardDescription>
                Ideas to improve your local SEO signals in Bridgeland
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">
                    Google Business Profile Content
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Business Description:</strong> "Professional
                      haircuts and grooming services in the heart of Bridgeland,
                      Calgary..."
                    </p>
                    <p>
                      <strong>Post Example:</strong> "Join the Bridgeland
                      community for expert cuts at The Belmont Barbershop..."
                    </p>
                    <p>
                      <strong>Q&A Response:</strong> "We're conveniently located
                      near the Bridgeland LRT station..."
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Website Content Ideas</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>About Page:</strong> "Serving the Bridgeland
                      community since 2019..."
                    </p>
                    <p>
                      <strong>Services Page:</strong> "Professional haircuts
                      near Riverside and downtown Calgary..."
                    </p>
                    <p>
                      <strong>Contact Page:</strong> "Easy access from
                      Bridgeland LRT and downtown..."
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Social Media Content</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Instagram Caption:</strong> "✂️ Serving the
                      Bridgeland community with expert cuts and luxury
                      shaves..."
                    </p>
                    <p>
                      <strong>Facebook Post:</strong> "Proud to be part of the
                      Riverside neighborhood! Book your appointment today..."
                    </p>
                    <p>
                      <strong>Story Content:</strong> "Local tip: Best access
                      from Bridgeland LRT station! 🚇✂️"
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
