"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { Upload, Radar, TrendingUp, Target } from "lucide-react";

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
        title="Neighbor Signal Detector"
        subtitle="Analyze content for local SEO signals and suggest improvements for Bridgeland/Riverside."
      />

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
          value={score > 70 ? "Excellent" : score > 40 ? "Good" : "Needs Work"}
          hint="SEO readiness"
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
    </div>
  );
}
