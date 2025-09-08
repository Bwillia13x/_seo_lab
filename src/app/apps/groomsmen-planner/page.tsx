"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download, Sparkles, Clipboard, Calendar } from "lucide-react";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import { showToast } from "@/lib/toast";

function toISODate(dateStr: string, timeStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0);
    return dt.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function minutesToHhmm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function buildICS({ summary, description, location, startISO, endISO }: { summary: string; description: string; location: string; startISO: string; endISO: string; }) {
  const start = startISO.replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = endISO.replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Belmont SEO Lab//Groomsmen Planner//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@belmont-seo-lab`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export default function GroomsmenPlanner() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [partySize, setPartySize] = useState(6);
  const [chairs, setChairs] = useState(3);
  const [serviceMinutes, setServiceMinutes] = useState(45); // per guest
  const [pricePerPerson, setPricePerPerson] = useState(60);
  const [depositPercent, setDepositPercent] = useState(30);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  const totals = useMemo(() => {
    const totalServiceMins = partySize * serviceMinutes;
    const durationMins = Math.ceil(totalServiceMins / Math.max(1, chairs));
    const totalPrice = partySize * pricePerPerson;
    const deposit = Math.round((totalPrice * depositPercent) / 100);
    return { totalServiceMins, durationMins, totalPrice, deposit };
  }, [partySize, serviceMinutes, chairs, pricePerPerson, depositPercent]);

  const plan = useMemo(() => {
    const rows: { guest: string; service: string; slot: string }[] = [];
    for (let i = 0; i < partySize; i++) {
      const chairIndex = i % Math.max(1, chairs);
      const wave = Math.floor(i / Math.max(1, chairs));
      const startISO = toISODate(date, time);
      const start = new Date(Date.parse(startISO) + wave * serviceMinutes * 60000);
      const slot = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      rows.push({ guest: `Guest ${i + 1}`, service: "Haircut", slot: `Chair ${chairIndex + 1} • ${slot}` });
    }
    return rows;
  }, [partySize, chairs, date, time, serviceMinutes]);

  function downloadICS() {
    try {
      const startISO = toISODate(date, time);
      const end = new Date(Date.parse(startISO) + totals.durationMins * 60000).toISOString();
      const ics = buildICS({
        summary: "Groomsmen Party — The Belmont Barbershop",
        description: `Party size: ${partySize}\\nService: Haircut (${serviceMinutes} min each)\\nChairs: ${chairs}\\nBudget: $${totals.totalPrice} (Deposit $${totals.deposit})\\nBook: ${BELMONT_CONSTANTS.BOOK_URL}`,
        location: BELMONT_CONSTANTS.ADDRESS_STR,
        startISO,
        endISO: end,
      });
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "belmont-groomsmen-party.ics";
      a.click();
    } catch (e) {
      console.error(e);
    }
  }

  async function copyDepositEmail() {
    const url = BELMONT_CONSTANTS.BOOK_URL; // Replace with your deposit link if/when Stripe is enabled
    const msg = `Hi ${contactName || "there"},\n\nWe’re excited to host your groomsmen party at The Belmont Barbershop!\n\nDetails:\n- Date: ${date || "TBD"} at ${time}\n- Party Size: ${partySize}\n- Service: Haircut (${serviceMinutes} min per guest)\n- Estimated Duration: ${minutesToHhmm(totals.durationMins)} with ${chairs} chairs\n- Budget: $${totals.totalPrice} (Deposit $${totals.deposit})\n\nTo confirm your booking, please pay the deposit here:\n${url}\n\nQuestions? Reply to this email or call ${BELMONT_CONSTANTS.PHONE_DISPLAY}.\n\n— The Belmont Barbershop`;
    try {
      await navigator.clipboard.writeText(msg);
      try { showToast("Copied deposit email", "success"); } catch {}
    } catch {}
  }

  function loadDemo() {
    setDate(new Date().toISOString().slice(0,10));
    setTime("13:00");
    setPartySize(6);
    setChairs(3);
    setServiceMinutes(45);
    setPricePerPerson(65);
    setDepositPercent(30);
    setContactName("Jordan");
    setContactEmail("jordan@example.com");
    setNotes("Prefers classic cuts; photos before & after.");
    try { showToast("Loaded demo plan", "success"); } catch {}
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Groomsmen Party Planner"
        subtitle="Quote, draft schedule, deposit email, and calendar block in minutes."
        showLogo={true}
        actions={
          <div className="flex gap-2">
            <Button onClick={loadDemo} variant="secondary"><Sparkles className="h-4 w-4 mr-2"/>Load Demo</Button>
            <Button onClick={downloadICS} variant="outline"><Calendar className="h-4 w-4 mr-2"/>Download ICS</Button>
            <Button onClick={copyDepositEmail}><Clipboard className="h-4 w-4 mr-2"/>Copy Deposit Email</Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
          <CardDescription>Set date, party size, timing, and budget</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="time">Start time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="size">Party size</Label>
            <Input id="size" type="number" min={2} value={partySize} onChange={(e) => setPartySize(Number(e.target.value || 2))} />
          </div>
          <div>
            <Label htmlFor="chairs">Chairs (simultaneous)</Label>
            <Input id="chairs" type="number" min={1} value={chairs} onChange={(e) => setChairs(Number(e.target.value || 1))} />
          </div>
          <div>
            <Label htmlFor="mins">Service minutes per guest</Label>
            <Input id="mins" type="number" min={15} step={5} value={serviceMinutes} onChange={(e) => setServiceMinutes(Number(e.target.value || 45))} />
          </div>
          <div>
            <Label htmlFor="pp">Price per person ($)</Label>
            <Input id="pp" type="number" min={0} value={pricePerPerson} onChange={(e) => setPricePerPerson(Number(e.target.value || 0))} />
          </div>
          <div>
            <Label htmlFor="dep">Deposit (%)</Label>
            <Input id="dep" type="number" min={0} max={100} value={depositPercent} onChange={(e) => setDepositPercent(Number(e.target.value || 0))} />
          </div>
          <div>
            <Label htmlFor="name">Contact name</Label>
            <Input id="name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Contact email</Label>
            <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote & Timing</CardTitle>
          <CardDescription>Auto-calculated based on your inputs</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4 text-sm">
          <div><strong>Total price</strong><div>${totals.totalPrice}</div></div>
          <div><strong>Deposit</strong><div>${totals.deposit}</div></div>
          <div><strong>Duration</strong><div>{minutesToHhmm(totals.durationMins)}</div></div>
          <div><strong>Per guest</strong><div>${pricePerPerson} • {serviceMinutes}m</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draft schedule</CardTitle>
          <CardDescription>Wave-based seating across chairs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Slot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.length ? plan.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.guest}</TableCell>
                    <TableCell>{r.service}</TableCell>
                    <TableCell>{r.slot}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No plan yet — set basics</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription>Internal details for your team</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, beverages, photo plan, etc." />
        </CardContent>
      </Card>
    </div>
  );
}
