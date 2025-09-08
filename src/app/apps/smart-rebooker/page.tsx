"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download, Sparkles, Send } from "lucide-react";
import { showToast } from "@/lib/toast";

// Minimal mock customer visit history
export type Visit = {
  id: string;
  name: string;
  lastVisit: string; // ISO
  service: string;
  phone?: string;
  email?: string;
};

function daysSince(dateISO: string) {
  const ms = Date.now() - Date.parse(dateISO);
  return Math.floor(ms / 86400000);
}

export default function SmartRebooker() {
  const [targetService, setTargetService] = useState("mens-cut");
  const [rebookWindowDays, setRebookWindowDays] = useState(35);
  const [demo, setDemo] = useState<Visit[]>([]);
  const [sending, setSending] = useState(false);

  const due = useMemo(() => {
    const lower = rebookWindowDays - 7;
    const upper = rebookWindowDays + 7;
    return demo
      .map((v) => ({ ...v, days: daysSince(v.lastVisit) }))
      .filter((v) => v.service === targetService && v.days >= lower && v.days <= upper)
      .sort((a, b) => b.days - a.days);
  }, [demo, targetService, rebookWindowDays]);

  function loadDemo() {
    const sample: Visit[] = [
      { id: "c1", name: "Alex", lastVisit: new Date(Date.now() - 38*86400000).toISOString(), service: "mens-cut", phone: "4035551001" },
      { id: "c2", name: "Riley", lastVisit: new Date(Date.now() - 33*86400000).toISOString(), service: "mens-cut", email: "riley@example.com" },
      { id: "c3", name: "Sam", lastVisit: new Date(Date.now() - 42*86400000).toISOString(), service: "beard-trim", phone: "4035551002" },
      { id: "c4", name: "Taylor", lastVisit: new Date(Date.now() - 29*86400000).toISOString(), service: "mens-cut", phone: "4035551003" },
    ];
    setDemo(sample);
    try { showToast("Loaded demo customers", "success"); } catch {}
  }

  function exportCSV() {
    const rows = [
      ["name", "days_since", "service", "phone", "email"],
      ...due.map((v) => [v.name, String(v.days), v.service, v.phone||"", v.email||""]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "belmont-smart-rebooker.csv";
    a.click();
  }

  async function sendTest() {
    setSending(true);
    try {
      // Placeholder for messaging integration (Resend/Twilio). For now, just toast.
      await new Promise((r) => setTimeout(r, 600));
      try { showToast("Simulated sending rebooking nudges", "success"); } catch {}
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Smart Rebooker"
        subtitle="Find clients due to rebook and prepare nudges."
        showLogo={true}
        actions={
          <div className="flex gap-2">
            <Button onClick={loadDemo} variant="secondary"><Sparkles className="h-4 w-4 mr-2"/>Load Demo</Button>
            <Button onClick={exportCSV} variant="outline"><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
            <Button onClick={sendTest} disabled={sending}><Send className="h-4 w-4 mr-2"/>{sending ? "Sending..." : "Send Test"}</Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
          <CardDescription>Pick the service and rebooking window</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="service">Service</Label>
            <Input id="service" value={targetService} onChange={(e) => setTargetService(e.target.value)} placeholder="mens-cut" />
          </div>
          <div>
            <Label htmlFor="days">Rebook window (days)</Label>
            <Input id="days" type="number" value={rebookWindowDays} onChange={(e) => setRebookWindowDays(Number(e.target.value||35))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Due to rebook</CardTitle>
          <CardDescription>Clients in ±7 days of the target window</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Days since</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {due.length ? due.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.days}</TableCell>
                    <TableCell>{v.service}</TableCell>
                    <TableCell>{v.phone || "—"}</TableCell>
                    <TableCell>{v.email || "—"}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No due clients yet — click Load Demo</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
