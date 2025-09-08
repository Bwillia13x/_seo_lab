"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { showToast } from "@/lib/toast";
import { Star, Copy, Sparkles } from "lucide-react";

export type Review = {
  id: string;
  author: string;
  rating: number; // 1-5
  text: string;
  date: string; // ISO
};

function averageRating(list: Review[]) {
  if (!list.length) return 0;
  return list.reduce((a, r) => a + r.rating, 0) / list.length;
}

function stars(n: number) {
  const full = Math.round(n);
  return "★★★★★☆☆☆☆☆".slice(5 - full, 10 - full);
}

export default function ReviewSpotlight() {
  const [placeId, setPlaceId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);

  const agg = useMemo(() => ({ count: reviews.length, avg: averageRating(reviews) }), [reviews]);

  function addExample() {
    const demo: Review[] = [
      { id: `r1_${Date.now()}`, author: "Alex", rating: 5, text: "Best skin fade in Bridgeland. Super friendly staff.", date: new Date().toISOString() },
      { id: `r2_${Date.now()}`, author: "Riley", rating: 5, text: "Walked in, barely waited. Great cut, clean shop.", date: new Date(Date.now()-86400000*3).toISOString() },
      { id: `r3_${Date.now()}`, author: "Sam", rating: 4, text: "Beard trim on point. Will be back.", date: new Date(Date.now()-86400000*9).toISOString() },
    ];
    setReviews((prev) => [...prev, ...demo]);
    try { showToast("Loaded example reviews", "success"); } catch {}
  }

  function addManual(text: string) {
    const t = text.trim();
    if (!t) return;
    const [author, ratingStr, ...rest] = t.split("|");
    const rating = Number(ratingStr?.trim() || 5);
    const body = rest.join("|").trim();
    setReviews((prev) => [
      ...prev,
      { id: `m_${Date.now()}`, author: (author||"Anonymous").trim(), rating: isNaN(rating) ? 5 : Math.min(5, Math.max(1, rating)), text: body || "", date: new Date().toISOString() },
    ]);
  }

  function remove(id: string) {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const embedHtml = useMemo(() => {
    const items = reviews.map((r) => `\n  <div class=\"review\">\n    <div class=\"header\">\n      <strong>${r.author}</strong>\n      <span class=\"stars\">${"★".repeat(Math.round(r.rating))}${"☆".repeat(5-Math.round(r.rating))}</span>\n    </div>\n    <p>${r.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>\n  </div>`).join("");
    return `<!-- Belmont Review Spotlight -->\n<div class=\"belmont-reviews\">\n  <div class=\"aggregate\">\n    <span class=\"avg\">${agg.avg.toFixed(1)} / 5.0</span>\n    <span class=\"stars\">${"★".repeat(Math.round(agg.avg))}${"☆".repeat(5-Math.round(agg.avg))}</span>\n    <span class=\"count\">(${agg.count} reviews)</span>\n  </div>${items}\n</div>\n<style>\n  .belmont-reviews{border:1px solid #eee;border-radius:8px;padding:12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif}\n  .belmont-reviews .aggregate{display:flex;align-items:center;gap:8px;margin-bottom:8px}\n  .belmont-reviews .stars{color:#f59e0b}\n  .belmont-reviews .review{border-top:1px solid #f1f1f1;padding:8px 0}\n  .belmont-reviews .review .header{display:flex;align-items:center;gap:8px;margin-bottom:4px}\n</style>`;
  }, [reviews, agg]);

  const jsonLd = useMemo(() => {
    const data = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "The Belmont Barbershop",
      aggregateRating: reviews.length ? {
        "@type": "AggregateRating",
        ratingValue: agg.avg.toFixed(1),
        reviewCount: reviews.length,
      } : undefined,
      review: reviews.map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
        reviewBody: r.text,
        datePublished: r.date,
      })),
    } as any;
    return JSON.stringify(data, null, 2);
  }, [reviews, agg]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      try { showToast(`Copied ${label}`, "success"); } catch {}
    } catch {
      try { showToast("Copy failed", "error"); } catch {}
    }
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Review Spotlight"
        subtitle="Curate your best reviews and add clean schema to improve trust and clicks."
        showLogo={true}
        actions={<Button onClick={addExample} variant="secondary"><Sparkles className="h-4 w-4 mr-2"/>Load Example Reviews</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add reviews</CardTitle>
          <CardDescription>Paste manually as "Name | Rating | Text" and click Add</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="place">Google Place ID (optional)</Label>
              <Input id="place" value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ..." />
              <p className="text-xs text-muted-foreground">Use manual reviews for now; API fetch can be enabled later.</p>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="manual">Manual review</Label>
              <div className="flex gap-2">
                <Input id="manual" placeholder="Alex | 5 | Best skin fade in Bridgeland" onKeyDown={(e) => { if (e.key === 'Enter') { addManual((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
                <Button onClick={() => {
                  const el = document.getElementById('manual') as HTMLInputElement | null;
                  if (el) { addManual(el.value); el.value = ''; }
                }}>Add</Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length ? reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.author}</TableCell>
                    <TableCell>
                      <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                    </TableCell>
                    <TableCell className="max-w-xl whitespace-pre-wrap">{r.text}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => remove(r.id)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No reviews yet — load examples or add manually</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>How your spotlight widget could look on the site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="border rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-amber-500"/> <span className="font-medium">{agg.avg ? agg.avg.toFixed(1) : "—"} / 5.0</span>
                  <span className="text-amber-500">{stars(agg.avg || 0)}</span>
                  <span className="text-sm text-muted-foreground">({agg.count} reviews)</span>
                </div>
                <div className="space-y-3">
                  {reviews.slice(0,5).map((r) => (
                    <div key={r.id} className="border-t pt-2">
                      <div className="flex items-center gap-2 mb-1"><strong>{r.author}</strong> <span className="text-amber-500">{"★".repeat(r.rating)}</span></div>
                      <div className="text-sm text-muted-foreground">{r.text}</div>
                    </div>
                  ))}
                  {!reviews.length && <div className="text-sm text-muted-foreground">Add a few reviews to preview</div>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Embed code</CardTitle>
            <CardDescription>Copy HTML/CSS (works in WordPress blocks). Add JSON‑LD for rich snippets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>HTML + CSS</Label>
              <Textarea readOnly value={embedHtml} rows={10} />
              <Button size="sm" variant="outline" onClick={() => copy(embedHtml, "HTML")}> <Copy className="h-4 w-4 mr-2"/> Copy HTML</Button>
            </div>
            <div className="space-y-2">
              <Label>JSON‑LD (Schema)</Label>
              <Textarea readOnly value={`<script type=\"application/ld+json\">\n${jsonLd}\n</script>`} rows={10} />
              <Button size="sm" variant="outline" onClick={() => copy(jsonLd, "JSON-LD")}> <Copy className="h-4 w-4 mr-2"/> Copy JSON‑LD</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
