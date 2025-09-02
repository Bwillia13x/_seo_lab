"use client";

import React, { useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  QrCode,
  Download,
  Plus,
  Trophy,
  Users,
  DollarSign,
  Info,
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import QRCode from "qrcode";

type ReferralCode = {
  id: string;
  name: string;
  code: string;
  type: "staff" | "partner" | "event";
  utmUrl: string;
  qrDataUrl?: string;
  clicks: number;
  bookings: number;
  revenue: number;
};

export default function ReferralQR() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"staff" | "partner" | "event">(
    "staff"
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `BELMONT-${timestamp}-${random}`.toUpperCase();
  };

  const generateUTMUrl = (code: string, type: string) => {
    const baseUrl = "https://thebelmontbarber.ca/book";
    const campaign = `referral-${type}-${new Date().toISOString().slice(0, 10)}`;
    return `${baseUrl}?utm_source=referral&utm_medium=qr&utm_campaign=${campaign}&utm_content=${code}`;
  };

  const generateQRCode = async (url: string): Promise<string> => {
    try {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, url, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("QR Code generation failed:", err);
      return "";
    }
  };

  const addReferralCode = async () => {
    if (!newName.trim()) return;

    const code = generateCode();
    const utmUrl = generateUTMUrl(code, newType);
    const qrDataUrl = await generateQRCode(utmUrl);

    const newCode: ReferralCode = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
      name: newName,
      code,
      type: newType,
      utmUrl,
      qrDataUrl,
      clicks: 0,
      bookings: 0,
      revenue: 0,
    };

    setCodes([...codes, newCode]);
    setNewName("");
  };

  const downloadQRCode = (code: ReferralCode) => {
    if (!code.qrDataUrl) return;

    const link = document.createElement("a");
    link.href = code.qrDataUrl;
    link.download = `belmont-referral-${code.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllQRCodes = () => {
    codes.forEach((code) => {
      if (code.qrDataUrl) {
        setTimeout(() => downloadQRCode(code), codes.indexOf(code) * 500);
      }
    });
  };

  const exportLeaderboard = () => {
    const csvContent = [
      "Name,Code,Type,Clicks,Bookings,Revenue",
      ...codes.map((code) =>
        [
          code.name,
          code.code,
          code.type,
          code.clicks,
          code.bookings,
          code.revenue,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    saveBlob(
      blob,
      `referral-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const totalStats = codes.reduce(
    (acc, code) => ({
      clicks: acc.clicks + code.clicks,
      bookings: acc.bookings + code.bookings,
      revenue: acc.revenue + code.revenue,
    }),
    { clicks: 0, bookings: 0, revenue: 0 }
  );

  const topPerformers = [...codes]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Referral Codes"
        subtitle="Create QR codes for staff, partners, and events with UTM tracking for The Belmont Barbershop."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadAllQRCodes}
              disabled={!codes.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All QR Codes
            </Button>
            <Button
              variant="outline"
              onClick={exportLeaderboard}
              disabled={!codes.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Leaderboard
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="QR Codes"
          value={codes.length}
          hint="Generated"
          icon={<QrCode className="h-4 w-4" />}
        />
        <KPICard
          label="Total Clicks"
          value={totalStats.clicks}
          hint="All time"
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label="Total Bookings"
          value={totalStats.bookings}
          hint="Conversions"
          icon={<Trophy className="h-4 w-4" />}
        />
        <KPICard
          label="Total Revenue"
          value={`$${totalStats.revenue}`}
          hint="Generated"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="generator">QR Generator</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Staff Referral Codes Tool
              </CardTitle>
              <CardDescription>
                Learn how to create and manage QR codes for staff referrals,
                partners, and events to track marketing performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool creates unique QR codes and tracking links for
                    different referral sources (staff, partners, events). Each
                    code includes UTM parameters for detailed analytics,
                    allowing you to track which referrals drive the most
                    bookings and revenue for Belmont.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Referral Tracking Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Referral tracking helps Belmont understand which marketing
                    channels and partnerships are most effective:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Staff performance:</strong> Track which barbers
                      bring in the most referrals through their personal QR
                      codes
                    </li>
                    <li>
                      <strong>Partner ROI:</strong> Measure the revenue
                      generated from each business partnership
                    </li>
                    <li>
                      <strong>Event effectiveness:</strong> See which community
                      events and promotions drive the most bookings
                    </li>
                    <li>
                      <strong>Marketing optimization:</strong> Focus resources
                      on the highest-performing referral channels
                    </li>
                    <li>
                      <strong>Incentive programs:</strong> Reward top-performing
                      staff and partners based on actual results
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Choose referral type:</strong> Select whether
                      you're creating a code for staff, partner, or event
                    </li>
                    <li>
                      <strong>Enter name:</strong> Add the person's name or
                      event/partner business name
                    </li>
                    <li>
                      <strong>Generate QR code:</strong> Click "Generate QR
                      Code" to create a unique code with UTM tracking
                    </li>
                    <li>
                      <strong>Download QR code:</strong> Save the QR code as PNG
                      for printing or digital sharing
                    </li>
                    <li>
                      <strong>Share with referrer:</strong> Give the QR code to
                      staff for their business cards or partners for their
                      website
                    </li>
                    <li>
                      <strong>Track performance:</strong> Monitor clicks,
                      bookings, and revenue in the leaderboard
                    </li>
                    <li>
                      <strong>Export reports:</strong> Download CSV files for
                      detailed analysis and incentive calculations
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Understanding UTM Parameters
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Source:</strong> Identifies the referral type
                      (staff, partner, event)
                    </li>
                    <li>
                      <strong>Medium:</strong> Always "referral" for these
                      tracking links
                    </li>
                    <li>
                      <strong>Campaign:</strong> The unique referral code (e.g.,
                      BELMONT-ABC123)
                    </li>
                    <li>
                      <strong>Content:</strong> The referrer's name or
                      identifier
                    </li>
                    <li>
                      <strong>Benefits:</strong> Track exactly which referrals
                      convert to bookings
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Referral Code Types
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Staff codes:</strong> Personal QR codes for
                      barbers to include on business cards, social media, etc.
                    </li>
                    <li>
                      <strong>Partner codes:</strong> For local businesses that
                      refer customers to Belmont
                    </li>
                    <li>
                      <strong>Event codes:</strong> For community events,
                      sponsorships, or promotional campaigns
                    </li>
                    <li>
                      <strong>Benefits:</strong> Each type gets different UTM
                      parameters for accurate attribution
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for Referral Programs
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Clear incentives:</strong> Define what
                      staff/partners earn for successful referrals
                    </li>
                    <li>
                      <strong>Easy sharing:</strong> Make QR codes available in
                      multiple formats (print, digital, email)
                    </li>
                    <li>
                      <strong>Regular reporting:</strong> Share performance data
                      with staff and partners monthly
                    </li>
                    <li>
                      <strong>Quality referrals:</strong> Encourage referrals
                      from satisfied customers who will book again
                    </li>
                    <li>
                      <strong>Track all sources:</strong> Use different codes
                      for different marketing channels
                    </li>
                    <li>
                      <strong>Celebrate successes:</strong> Recognize top
                      performers publicly (with permission)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Staff Referral Program Ideas
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Business cards:</strong> Include personal QR codes
                      on all staff business cards
                    </li>
                    <li>
                      <strong>Social media:</strong> Staff can share their
                      referral links on personal Instagram/TikTok
                    </li>
                    <li>
                      <strong>Email signatures:</strong> Add referral links to
                      professional email signatures
                    </li>
                    <li>
                      <strong>Word-of-mouth:</strong> Encourage staff to mention
                      Belmont when out in the community
                    </li>
                    <li>
                      <strong>Commission structure:</strong> Offer percentage of
                      service revenue from referrals
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Partner Referral Opportunities
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Local restaurants:</strong> Partner with nearby
                      cafes and restaurants
                    </li>
                    <li>
                      <strong>Salons and spas:</strong> Cross-promote with other
                      personal care businesses
                    </li>
                    <li>
                      <strong>Gyms and fitness:</strong> Partner with local
                      fitness centers
                    </li>
                    <li>
                      <strong>Real estate agents:</strong> Work with local
                      realtors for new resident welcome packages
                    </li>
                    <li>
                      <strong>Event venues:</strong> Partner with hotels,
                      community centers, and event spaces
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Measuring Success
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Conversion rate:</strong> Percentage of clicks
                      that become bookings
                    </li>
                    <li>
                      <strong>Revenue per referral:</strong> Average revenue
                      generated from each successful referral
                    </li>
                    <li>
                      <strong>Top performers:</strong> Identify which
                      staff/partners bring in the most business
                    </li>
                    <li>
                      <strong>Channel effectiveness:</strong> Compare
                      performance across different referral types
                    </li>
                    <li>
                      <strong>ROI analysis:</strong> Calculate return on
                      investment for referral incentives
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generator" className="space-y-4">
          {/* Add New Code */}
          <Card>
            <CardHeader>
              <CardTitle>Create Referral Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sarah (Barber), Coffee Shop Partner"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    aria-label="Referral type selection"
                  >
                    <option value="staff">Staff</option>
                    <option value="partner">Partner</option>
                    <option value="event">Event</option>
                  </select>
                </div>
              </div>
              <Button onClick={addReferralCode} disabled={!newName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Generate QR Code
              </Button>
            </CardContent>
          </Card>

          {/* QR Code Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {codes.map((code) => (
              <Card key={code.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{code.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {code.type}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(code)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {code.qrDataUrl ? (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Safe data URL preview for generated QR */}
                      <img
                        src={code.qrDataUrl}
                        alt={`QR Code for ${code.name}`}
                        className="w-32 h-32"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto bg-muted flex items-center justify-center rounded">
                      <QrCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="text-xs space-y-1">
                    <div className="font-mono text-xs break-all bg-muted p-2 rounded">
                      {code.code}
                    </div>
                    <div className="text-muted-foreground break-all">
                      {code.utmUrl}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Clicks: {code.clicks}</span>
                    <span>Bookings: {code.bookings}</span>
                    <span>Revenue: ${code.revenue}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((code, index) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{code.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {code.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${code.revenue}</div>
                      <div className="text-sm text-muted-foreground">
                        {code.bookings} bookings, {code.clicks} clicks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Referral Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{code.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {code.code}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{code.type}</Badge>
                      <div className="text-sm mt-1">
                        ${code.revenue} ({code.bookings} bookings)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
