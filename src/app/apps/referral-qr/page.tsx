"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        title="Referral QR Generator"
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

      <Tabs defaultValue="generator">
        <TabsList>
          <TabsTrigger value="generator">QR Generator</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

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
