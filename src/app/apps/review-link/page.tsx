"use client";

import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Copy,
  Check,
  Download,
  QrCode,
  Settings,
  ShieldCheck,
  Info,
  Mail,
  MessageSquare,
  Printer,
  Play,
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------------- Utilities ----------------
function normalizeUrl(input: string): string {
  let u = (input || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    return new URL(u).toString();
  } catch {
    return input;
  }
}

async function qrDataUrl(
  text: string,
  size = 512,
  margin = 4,
  ecLevel: "L" | "M" | "Q" | "H" = "M"
) {
  return await QRCode.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel: ecLevel,
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ---------------- Defaults ----------------
const DEFAULT_EMAIL_ID = "hello@thebelmontbarber.ca";
const DEFAULT_PHONE_ID = "403-000-0000";

// ---------------- Types ----------------
type ConsentLog = {
  date: string;
  name: string;
  channel: "email" | "sms";
  address: string;
  purpose: string;
  consent: "express" | "implied";
  notes?: string;
};

// ---------------- Main Component ----------------
export default function ReviewKit() {
  // Business & links
  const [bizName, setBizName] = useState<string>(
    BELMONT_CONSTANTS.BUSINESS_NAME
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    "Bridgeland, Calgary"
  );
  const [identifyEmail, setIdentifyEmail] = useState<string>(
    "hello@thebelmontbarber.ca"
  );
  const [identifyPhone, setIdentifyPhone] = useState<string>(
    BELMONT_CONSTANTS.PHONE_DISPLAY
  );
  const [googleReviewLink, setGoogleReviewLink] = useState<string>(
    BELMONT_CONSTANTS.REVIEW_GOOGLE_URL
  );
  const [applePlaceLink, setApplePlaceLink] = useState<string>(
    BELMONT_CONSTANTS.REVIEW_APPLE_URL
  );
  const [bookingLink, setBookingLink] = useState<string>(
    BELMONT_CONSTANTS.BOOK_URL
  );

  // Compliance toggles
  const [includeStop, setIncludeStop] = useState<boolean>(true);
  const [includeIdentification, setIncludeIdentification] =
    useState<boolean>(true);
  const [logConsent, setLogConsent] = useState<boolean>(true);

  // QR state
  const [qrSize, setQrSize] = useState<number>(384);
  const [qrGoogle, setQrGoogle] = useState<string>("");
  const [qrApple, setQrApple] = useState<string>("");

  // Consent log (local only)
  const [logRows, setLogRows] = useState<ConsentLog[]>([]);

  const gLink = useMemo(
    () => normalizeUrl(googleReviewLink),
    [googleReviewLink]
  );
  const aLink = useMemo(() => normalizeUrl(applePlaceLink), [applePlaceLink]);

  useEffect(() => {
    (async () => {
      if (gLink) setQrGoogle(await qrDataUrl(gLink, qrSize));
      if (aLink) setQrApple(await qrDataUrl(aLink, qrSize));
    })();
  }, [gLink, aLink, qrSize]);

  // ---------- Template Generators ----------
  function atChairScript() {
    return `If you enjoyed your cut today, a quick Google review really helps neighbors in ${neighborhood} find us. May I send you a one‑time ${"email/SMS"} with the review link?`;
  }

  function emailTemplate(firstName = "[First Name]") {
    const idLine = includeIdentification
      ? `\n\n— ${bizName} · ${identifyPhone} · ${identifyEmail}`
      : "";
    const unsub = `\n\nTo opt out of future messages, click unsubscribe or reply STOP.`; // transactional tone, CASL‑safe
    return {
      subject: `Your ${bizName} visit — quick review?`,
      body: `Hi ${firstName},\n\nThanks for visiting ${bizName} in ${neighborhood}! If you have 30 seconds, a short Google review helps others nearby choose confidently.\n\nReview link: ${gLink}\n${
        aLink ? `Apple Maps: ${aLink}\n` : ""
      }Book again: ${bookingLink}${idLine}${includeStop ? unsub : ""}`,
    };
  }

  function smsTemplate(firstName = "[First Name]") {
    const idLine = includeIdentification ? ` — ${bizName}` : "";
    const stop = includeStop ? " Reply STOP to opt out." : "";
    return `Thanks for visiting ${bizName} in ${neighborhood}, ${firstName}! Review: ${gLink}${
      aLink ? ` | Apple: ${aLink}` : ""
    }. Book: ${bookingLink}.${idLine}${stop}`;
  }

  function whatsappTemplate(firstName = "[First Name]") {
    // WhatsApp doesn't require STOP, but keep identification; CASL governs the initial send/consent.
    return `Hi ${firstName}! If you have 30 seconds, would you leave a quick review for ${bizName}? ${gLink}${
      aLink ? ` (Apple: ${aLink})` : ""
    }. Book: ${bookingLink}. — ${bizName}`;
  }

  // ---------- Copy helpers ----------
  const [copied, setCopied] = useState<string>("");
  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function exportTxtPack() {
    const email = emailTemplate();
    const txt = [
      "--- At‑chair script ---",
      atChairScript(),
      "\n\n--- Email (subject) ---",
      email.subject,
      "\n\n--- Email (body) ---",
      email.body,
      "\n\n--- SMS ---",
      smsTemplate(),
      "\n\n--- WhatsApp ---",
      whatsappTemplate(),
    ].join("\n");
    saveBlob(
      new Blob([txt], { type: "text/plain;charset=utf-8;" }),
      `belmont-review-kit-${todayISO()}.txt`
    );
  }

  // ---------- Consent log ----------
  function addConsentRow(
    name: string,
    channel: "email" | "sms",
    address: string,
    purpose = "review request"
  ) {
    if (!logConsent) return;
    const row: ConsentLog = {
      date: todayISO(),
      name,
      channel,
      address,
      purpose,
      consent: "express",
    };
    setLogRows((prev) => [row, ...prev].slice(0, 200));
  }

  function exportConsentCSV() {
    const csv = toCSV(
      logRows.map((r) => ({
        Date: r.date,
        Name: r.name,
        Channel: r.channel,
        Address: r.address,
        Purpose: r.purpose,
        Consent: r.consent,
      }))
    );
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-consent-log-${todayISO()}.csv`
    );
  }

  // ---------- Print Card ----------
  function openPrintCard() {
    const win = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=720,height=900"
    );
    if (!win) return;
    const css = `body{font-family:ui-sans-serif,system-ui; margin:0; padding:24px;}
      .card{width: 360px; border:1px solid #ddd; border-radius:16px; padding:16px;}
      .title{font-weight:600; font-size:16px; margin-bottom:8px}
      .qr{display:flex; align-items:center; justify-content:center; margin:8px 0}
      .small{color:#555; font-size:12px;}`;
    const html = `<!doctype html><html><head><title>Belmont Review Card</title><style>${css}</style></head>
      <body>
      <div class="card">
        <div class="title">Loved your cut?</div>
        <div>Scan to leave a quick review for <strong>${bizName}</strong>.</div>
        <div class="qr"><img src="${qrGoogle || ""}" style="width:240px;height:240px;"/></div>
        <div class="small">Or visit:<br/>${gLink}</div>
      </div>
      <script>window.print()</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // ---------- Self‑tests ----------
  type Test = { name: string; passed: boolean; details?: string };
  function runTests(): Test[] {
    const tests: Test[] = [];
    // 1) SMS contains STOP when enabled
    const sms = smsTemplate("Alex");
    tests.push({
      name: "SMS has STOP when enabled",
      passed: includeStop ? /STOP/.test(sms) : true,
    });
    // 2) Email includes identification when enabled
    const email = emailTemplate("Alex");
    tests.push({
      name: "Email has identification when enabled",
      passed: includeIdentification
        ? new RegExp(bizName).test(email.body)
        : true,
    });
    // 3) Google link looks like HTTPS
    tests.push({
      name: "Google link is https",
      passed: /^https:\/\//.test(gLink),
      details: gLink,
    });
    // 4) QR size sensible
    tests.push({
      name: "QR size between 256 and 1024",
      passed: qrSize >= 256 && qrSize <= 1024,
      details: String(qrSize),
    });
    return tests;
  }

  const tests = useMemo(
    () => runTests(),
    [includeStop, includeIdentification, gLink, qrSize, bizName]
  );
  const passCount = tests.filter((t) => t.passed).length;

  // ---------- Quick actions ----------
  function copyEmail() {
    const e = emailTemplate();
    copy(`Subject: ${e.subject}\n\n${e.body}`, "email");
    addConsentRow("[Name]", "email", "[email]");
  }
  function copySMS() {
    copy(smsTemplate(), "sms");
    addConsentRow("[Name]", "sms", "[phone]");
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Review Request Links"
        subtitle={`CASL‑safe scripts, email/SMS templates, and QR review cards for ${bizName}.`}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Do this next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Enter or confirm your Google and Apple review links.</li>
            <li>Copy the Email and SMS from the Compose tab.</li>
            <li>Ask permission, then send one message to a recent client.</li>
            <li>Log consent in the Consent Log (optional, recommended).</li>
            <li>Print a counter card with the QR in the QR & Cards tab.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Links Configured"
          value={[googleReviewLink, applePlaceLink].filter(Boolean).length}
          hint="Review URLs"
          icon={<Check className="h-4 w-4" />}
        />
        <KPICard
          label="QR Codes"
          value={[qrGoogle, qrApple].filter(Boolean).length}
          hint="Generated"
          icon={<QrCode className="h-4 w-4" />}
        />
        <KPICard
          label="Templates"
          value={3}
          hint="Email/SMS/HTML"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <KPICard
          label="Compliance"
          value="CASL Ready"
          hint="Legal compliance"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList>
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="qrs">QR & Cards</TabsTrigger>
          <TabsTrigger value="log">Consent Log</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* Compose */}
        <TabsContent value="compose">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Business & Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Business name</Label>
                  <Input
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Neighborhood</Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Identify (email)</Label>
                  <Input
                    value={identifyEmail}
                    onChange={(e) => setIdentifyEmail(e.target.value)}
                    placeholder={DEFAULT_EMAIL_ID}
                  />
                </div>
                <div>
                  <Label>Identify (phone)</Label>
                  <Input
                    value={identifyPhone}
                    onChange={(e) => setIdentifyPhone(e.target.value)}
                    placeholder={DEFAULT_PHONE_ID}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Google review link</Label>
                  <Input
                    value={googleReviewLink}
                    onChange={(e) => setGoogleReviewLink(e.target.value)}
                    placeholder="https://search.google.com/local/writereview?placeid=..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Apple Maps place link (optional)</Label>
                  <Input
                    value={applePlaceLink}
                    onChange={(e) => setApplePlaceLink(e.target.value)}
                    placeholder="https://maps.apple.com/place?..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Booking link</Label>
                  <Input
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                    placeholder="https://thebelmontbarber.ca/book"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>At‑chair script (30s)</Label>
                  <Textarea value={atChairScript()} readOnly className="h-24" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => copy(atChairScript(), "chair")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === "chair" ? "Copied" : "Copy script"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email (transactional tone)</Label>
                  <Textarea
                    value={`Subject: ${emailTemplate().subject}\n\n${emailTemplate().body}`}
                    readOnly
                    className="h-40"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={copyEmail}>
                      <Mail className="h-4 w-4 mr-1" />
                      Copy Email
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SMS (one‑time)</Label>
                  <Textarea value={smsTemplate()} readOnly className="h-24" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={copySMS}>
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Copy SMS
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (optional)</Label>
                  <Textarea
                    value={whatsappTemplate()}
                    readOnly
                    className="h-24"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copy(whatsappTemplate(), "wa")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === "wa" ? "Copied" : "Copy WA"}
                    </Button>
                    <Button size="sm" onClick={exportTxtPack}>
                      <Download className="h-4 w-4 mr-1" />
                      Export .txt Pack
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                CASL/PIPEDA Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={includeStop}
                    onCheckedChange={(v) => setIncludeStop(Boolean(v))}
                  />
                  <span>Include STOP/unsubscribe line</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={includeIdentification}
                    onCheckedChange={(v) =>
                      setIncludeIdentification(Boolean(v))
                    }
                  />
                  <span>Identify sender (name + contact)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={logConsent}
                    onCheckedChange={(v) => setLogConsent(Boolean(v))}
                  />
                  <span>Record express consent in local log</span>
                </div>
              </div>
              <Separator />
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Ask permission before sending any commercial email/SMS.</li>
                <li>
                  Use transactional tone; avoid incentives in the initial
                  consent request.
                </li>
                <li>
                  Store only minimal data (name, channel, date); export/delete
                  on request.
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR & Cards */}
        <TabsContent value="qrs">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR & Print Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>QR size (px)</Label>
                  <Input
                    type="number"
                    min={256}
                    max={1024}
                    value={qrSize}
                    onChange={(e) =>
                      setQrSize(
                        Math.max(
                          256,
                          Math.min(1024, parseInt(e.target.value || "384"))
                        )
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2 text-xs text-muted-foreground flex items-end">
                  Tip: 384–512px prints crisply on small counter cards.
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Google Reviews</Label>
                  <div className="border rounded-md p-3 bg-white min-h-[260px] flex items-center justify-center">
                    {qrGoogle ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Data URL used for on-page preview
                      <img
                        src={qrGoogle}
                        alt="QR Google"
                        className="max-w-full"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Enter a Google review link to render QR
                      </div>
                    )}
                  </div>
                  {qrGoogle && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          downloadDataUrl(
                            qrGoogle,
                            `belmont-google-review-qr-${todayISO()}.png`
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PNG
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Apple Maps (optional)</Label>
                  <div className="border rounded-md p-3 bg-white min-h-[260px] flex items-center justify-center">
                    {qrApple ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Data URL used for on-page preview
                      <img
                        src={qrApple}
                        alt="QR Apple"
                        className="max-w-full"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Enter an Apple Maps link to render QR
                      </div>
                    )}
                  </div>
                  {qrApple && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          downloadDataUrl(
                            qrApple,
                            `belmont-apple-maps-qr-${todayISO()}.png`
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PNG
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={openPrintCard}>
                  <Printer className="h-4 w-4 mr-2" />
                  Open Printable Card
                </Button>
                <Button variant="outline" onClick={exportTxtPack}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Script Pack (.txt)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consent log */}
        <TabsContent value="log">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Consent Log (local)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">
                Record a consent when a client says yes to receiving a one‑time
                review link. Keep minimal data only.
              </div>
              <div className="grid md:grid-cols-6 gap-2 items-end mb-3">
                <div className="md:col-span-2">
                  <Label>Name</Label>
                  <Input id="c_name" placeholder="First Last" />
                </div>
                <div>
                  <Label>Channel</Label>
                  <select
                    id="c_chan"
                    className="w-full border rounded-md h-9 px-2"
                    aria-label="Select communication channel for review request"
                  >
                    <option value="email">email</option>
                    <option value="sms">sms</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    id="c_addr"
                    placeholder="name@example.com or 403‑xxx‑xxxx"
                  />
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const name = (
                        document.getElementById("c_name") as HTMLInputElement
                      )?.value?.trim();
                      const channel = ((
                        document.getElementById("c_chan") as HTMLSelectElement
                      )?.value || "email") as "email" | "sms";
                      const addr = (
                        document.getElementById("c_addr") as HTMLInputElement
                      )?.value?.trim();
                      if (!name || !addr) {
                        alert("Enter name and address");
                        return;
                      }
                      addConsentRow(name, channel, addr);
                      (
                        document.getElementById("c_name") as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById("c_addr") as HTMLInputElement
                      ).value = "";
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Consent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.date}</TableCell>
                        <TableCell className="text-xs">{r.name}</TableCell>
                        <TableCell className="text-xs">{r.channel}</TableCell>
                        <TableCell className="text-xs">{r.address}</TableCell>
                        <TableCell className="text-xs">{r.purpose}</TableCell>
                        <TableCell className="text-xs">{r.consent}</TableCell>
                      </TableRow>
                    ))}
                    {logRows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-xs text-muted-foreground"
                        >
                          No entries yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={exportConsentCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* How To */}
        <TabsContent value="howto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Use the Review Request System
                </CardTitle>
                <CardDescription>
                  Create professional review requests that follow Canadian
                  privacy laws and get more customer reviews for Belmont
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool helps Belmont ask customers for reviews in a
                      professional, legal way. It creates special links that
                      customers can click to leave reviews on Google Maps and
                      Apple Maps. Everything is set up to follow Canadian
                      privacy laws (CASL) so Belmont stays compliant.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Why This Matters for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      Customer reviews are incredibly important for Belmont's
                      success. More reviews mean:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        More customers find Belmont when searching for barbers
                        in Calgary
                      </li>
                      <li>Google shows Belmont higher in search results</li>
                      <li>
                        New customers trust Belmont more when they see positive
                        reviews
                      </li>
                      <li>
                        Belmont builds a stronger reputation in the Bridgeland
                        community
                      </li>
                      <li>
                        Reviews help potential customers choose Belmont over
                        competitors
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      How to Request Reviews the Right Way
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          1
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Choose Your Communication Method
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Decide if you want to send review requests by email,
                            text message, or both. The tool creates ready-to-use
                            templates for each method.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          2
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Customize the Business Information
                          </p>
                          <p className="text-sm text-muted-foreground">
                            The tool is pre-filled with Belmont's information
                            (address, phone, etc.), but you can adjust the
                            wording or add personal touches for each customer.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          3
                        </Badge>
                        <div>
                          <p className="font-medium">Generate Review Links</p>
                          <p className="text-sm text-muted-foreground">
                            Click the buttons to create unique links for Google
                            and Apple Maps reviews. These links take customers
                            directly to the review page for Belmont.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          4
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Create Professional Messages
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Use the pre-written templates to create personalized
                            messages. All templates include the legally required
                            "STOP" option for customers who don't want to
                            receive messages.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          5
                        </Badge>
                        <div>
                          <p className="font-medium">Track Your Consent</p>
                          <p className="text-sm text-muted-foreground">
                            Log when and how you contacted each customer. This
                            helps Belmont stay compliant with Canadian privacy
                            laws and shows you followed the rules.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          6
                        </Badge>
                        <div>
                          <p className="font-medium">Send and Follow Up</p>
                          <p className="text-sm text-muted-foreground">
                            Send your review requests and follow up politely if
                            needed. Always respect customers who don't want to
                            be contacted again.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Legal Compliance (Very Important)
                    </h3>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                            CASL Compliance Requirements
                          </p>
                          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                            <li>
                              • Always include a way for customers to
                              unsubscribe ("STOP")
                            </li>
                            <li>
                              • Get permission before sending marketing messages
                            </li>
                            <li>
                              • Keep records of when and how you contacted
                              customers
                            </li>
                            <li>
                              • Respect customers who ask not to be contacted
                            </li>
                            <li>
                              • Use Belmont's official contact information
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Tips for Belmont
                    </h3>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            💡
                          </span>
                          <span>
                            Send review requests within 24 hours of the
                            customer's visit while the experience is fresh
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            🎯
                          </span>
                          <span>
                            Personalize messages with the customer's name and
                            specific service they received
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            📱
                          </span>
                          <span>
                            Test your review links by clicking them yourself
                            first
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            📊
                          </span>
                          <span>
                            Track which communication method gets the most
                            reviews (email vs text)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            🤝
                          </span>
                          <span>
                            Always thank customers for their reviews, even if
                            they're not positive
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Best Times to Ask for Reviews
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          After Great Service
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Send requests after exceptional service experiences.
                          Customers are more likely to leave positive reviews.
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          After Special Occasions
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Great timing after weddings, proms, or other special
                          events where customers want to share their experience.
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          During Slow Periods
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Use quiet times to catch up on review requests for
                          recent customers.
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          Before Competitor Visits
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Ask for reviews before customers might visit
                          competitors to capture their positive experience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                Self‑tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.passed ? "PASS" : "FAIL"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.details || ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-2 text-xs text-muted-foreground">
                {passCount}/{tests.length} passed
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
