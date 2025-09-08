"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/kpi-card";
import { Download, Sparkles, Wand2, QrCode } from "lucide-react";
import { showToast } from "@/lib/toast";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import Image from "next/image";

function buildUtmUrl(baseUrl: string, utm: Record<string, string>) {
  const url = new URL(baseUrl);
  for (const [k, v] of Object.entries(utm)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

async function qrPngDataUrl(text: string) {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, { width: 512, margin: 2, errorCorrectionLevel: "M" });
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function OffersOrchestrator() {
  const [season, setSeason] = useState("fall");
  const [service, setService] = useState("mens-cut");
  const [discount, setDiscount] = useState("10% off");
  const [utmUrl, setUtmUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [gbpPost, setGbpPost] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [emailSnippet, setEmailSnippet] = useState("");
  const [generating, setGenerating] = useState(false);

  const campaignName = useMemo(() => `belmont-${slug(service)}-${slug(season)}-promo`, [service, season]);

  const bannerEmbed = useMemo(() => {
    const text = (bannerText && bannerText.trim()) || `${discount} ${service.replace(/-/g, " ")} — Book now`;
    const href = utmUrl || BELMONT_CONSTANTS.BOOK_URL;
    return `<!-- Belmont seasonal banner -->\n<div id=\"belmont-offer-banner\" style=\"position:sticky;top:0;z-index:9999;background:#111;color:#fff;padding:10px 14px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;\">\n  <div style=\"max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;\">\n    <span style=\"font-weight:600;\">${text}</span>\n    <a href=\"${href}\" style=\"background:#22c55e;color:#111;text-decoration:none;padding:8px 12px;border-radius:6px;font-weight:600;\">Book now</a>\n  </div>\n</div>`;
  }, [bannerText, discount, service, utmUrl]);

  async function copyBanner() {
    try {
      await navigator.clipboard.writeText(bannerEmbed);
      try { showToast("Copied site banner embed", "success"); } catch {}
    } catch {
      try { showToast("Copy failed", "error"); } catch {}
    }
  }

  async function generatePack() {
    setGenerating(true);
    try {
      const url = buildUtmUrl(BELMONT_CONSTANTS.BOOK_URL, {
        utm_source: "orchestrator",
        utm_medium: "multi",
        utm_campaign: campaignName,
        utm_content: slug(discount),
      });
      setUtmUrl(url);
      const q = await qrPngDataUrl(url);
      setQrUrl(q);

      const prettyService = service.replace(/-/g, " ");
      setGbpPost(
        `Belmont ${prettyService} — ${discount}!\n\nQuick, friendly, and local. Book now: ${url}\n#Bridgeland #Calgary #Barbershop #${prettyService.replace(/\s+/g, "")}`
      );
      setBannerText(`${discount} ${prettyService} — Book now`);
      setEmailSnippet(
        `Hi there — for a limited time we’re offering ${discount} on ${prettyService}. Reserve your spot here: ${url}`
      );
      try { showToast("Offer pack generated", "success"); } catch {}
    } catch (e) {
      console.error(e);
      try { showToast("Failed to generate pack", "error"); } catch {}
    } finally {
      setGenerating(false);
    }
  }

  function loadDemo() {
    setSeason("winter");
    setService("skin-fade");
    setDiscount("15% off");
    try { showToast("Loaded demo offer", "success"); } catch {}
  }

  function downloadQR() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${campaignName}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Seasonal Offers Orchestrator"
        subtitle="Launch a promo across Google Posts, your site banner, QR signage, and email in one place."
        showLogo={true}
        actions={
          <div className="flex gap-2">
            <Button onClick={loadDemo} variant="secondary"><Sparkles className="h-4 w-4 mr-2"/>Load Demo</Button>
            <Button onClick={generatePack} disabled={generating}><Wand2 className="h-4 w-4 mr-2"/>{generating ? "Generating..." : "Generate Pack"}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Campaign" value={campaignName} />
        <KPICard label="Season" value={season} />
        <KPICard label="Service" value={service} />
        <KPICard label="Discount" value={discount} />
        <KPICard label="QR Ready" value={qrUrl ? "Yes" : "No"} icon={<QrCode className="h-4 w-4"/>} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offer details</CardTitle>
          <CardDescription>Set the basics for your seasonal promo</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="season">Season</Label>
            <Input id="season" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="fall" />
          </div>
          <div>
            <Label htmlFor="service">Service</Label>
            <Input id="service" value={service} onChange={(e) => setService(e.target.value)} placeholder="mens-cut" />
          </div>
          <div>
            <Label htmlFor="discount">Discount</Label>
            <Input id="discount" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="10% off" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets</CardTitle>
          <CardDescription>Generated links and copy for all channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tracking link</Label>
              <Input readOnly value={utmUrl} placeholder="Generate to see link" />
            </div>
            <div className="space-y-2">
              <Label>QR Signage</Label>
              {qrUrl ? (
                <div className="flex items-center gap-2">
                  <Image src={qrUrl} alt="QR" width={128} height={128} className="border rounded" />
                  <Button onClick={downloadQR} variant="outline"><Download className="h-4 w-4 mr-2"/>Download PNG</Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Generate to preview QR</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Google Post copy</Label>
              <Textarea rows={6} value={gbpPost} onChange={(e) => setGbpPost(e.target.value)} placeholder="Promo copy for Google Posts" />
            </div>
            <div className="space-y-2">
              <Label>Site banner text</Label>
              <Textarea rows={6} value={bannerText} onChange={(e) => setBannerText(e.target.value)} placeholder="Banner headline for your website" />
            </div>
            <div className="space-y-2">
              <Label>Email snippet</Label>
              <Textarea rows={6} value={emailSnippet} onChange={(e) => setEmailSnippet(e.target.value)} placeholder="Short blurb to paste into email" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Site banner embed (copy/paste into WordPress HTML block)</Label>
            <Textarea readOnly rows={6} value={bannerEmbed} />
            <div>
              <Button size="sm" variant="outline" onClick={copyBanner}>Copy Embed</Button>
            </div>
            <p className="text-xs text-muted-foreground">Tip: Place near the top of your site layout or homepage. Remove after the promo ends.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
