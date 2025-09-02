"use client";

import React, { useEffect, useState } from "react";
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
  MapPin,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Plus,
  Info,
} from "lucide-react";
import { saveBlob, createCSVBlob } from "@/lib/blob";
import { toCSV } from "@/lib/csv";
import { todayISO, addDays } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

type Prospect = {
  id: string;
  name: string;
  url: string;
  type: "directory" | "news" | "partner" | "cafe" | "event";
  email: string;
  contact: string;
  localness: number; // 1-5 scale
  relevance: number; // 1-5 scale
  authority: number; // 1-5 scale
  ease: number; // 1-5 scale
  confidence: number; // 1-5 scale
  impact: number; // 1-5 scale
  ice: number; // calculated
  priority: number; // calculated
  status: "todo" | "sent" | "linked" | "followup";
  notes: string;
  sentDate?: string;
  followupDate?: string;
};

const PROSPECT_TYPES = {
  directory: { label: "Directory", color: "bg-blue-100 text-blue-800" },
  news: { label: "News/Media", color: "bg-green-100 text-green-800" },
  partner: { label: "Local Partner", color: "bg-purple-100 text-purple-800" },
  cafe: { label: "Cafe/Restaurant", color: "bg-orange-100 text-orange-800" },
  event: { label: "Event Organizer", color: "bg-pink-100 text-pink-800" },
};

export default function LinkMap() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(
    null
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const calculateICE = (
    prospect: Omit<Prospect, "ice" | "priority">
  ): number => {
    return Math.round(
      (prospect.impact + prospect.ease + prospect.confidence) / 3
    );
  };

  const calculatePriority = (prospect: Omit<Prospect, "priority">): number => {
    // Simple priority calculation based on ICE score and localness
    return prospect.ice * prospect.localness;
  };

  const recompute = (
    prospect: Omit<Prospect, "ice" | "priority">
  ): Prospect => {
    const ice = calculateICE(prospect);
    const priority = calculatePriority({ ...prospect, ice });
    return { ...prospect, ice, priority };
  };

  const loadSampleData = async () => {
    try {
      const response = await fetch("/fixtures/prospects-sample.csv");
      const csv = await response.text();
      const lines = csv.split("\n").slice(1).filter(Boolean);
      const prospectsData: Prospect[] = lines.map((line, idx) => {
        const parts = line.split(",");
        const prospect = {
          id: crypto.randomUUID?.() || `${Date.now()}_${idx}`,
          name: parts[0],
          url: parts[1],
          type: parts[2] as any,
          email: parts[3],
          contact: parts[4],
          localness: parseInt(parts[5]) || 0,
          relevance: parseInt(parts[6]) || 0,
          authority: parseInt(parts[7]) || 0,
          ease: parseInt(parts[8]) || 0,
          confidence: parseInt(parts[9]) || 0,
          impact: parseInt(parts[10]) || 0,
          status: (parts[12] as any) || "todo",
          notes: parts[13] || "",
        };
        return recompute(prospect);
      });
      setProspects(prospectsData);
    } catch (e) {
      alert("Could not load sample data");
    }
  };

  const markAsSent = (prospectId: string) => {
    setProspects(
      prospects.map((p) =>
        p.id === prospectId
          ? {
              ...p,
              status: "sent",
              sentDate: todayISO(),
              followupDate: addDays(7),
            }
          : p
      )
    );
  };

  const markAsLinked = (prospectId: string) => {
    setProspects(
      prospects.map((p) =>
        p.id === prospectId ? { ...p, status: "linked" } : p
      )
    );
  };

  const composeOutreach = (prospect: Prospect) => {
    const template = `Subject: Partnership Opportunity with The Belmont Barbershop

Dear ${prospect.name},

I hope this email finds you well. My name is [Your Name] and I'm reaching out from The Belmont Barbershop, located at 915 General Ave NE in Bridgeland, Calgary.

We're passionate about being an active part of the Bridgeland community and would love to explore partnership opportunities with local businesses like yours.

Would you be interested in featuring us on your website or collaborating on community events? We'd be happy to offer special discounts for your customers or staff.

Looking forward to hearing from you!

Best regards,
[Your Name]
The Belmont Barbershop
88 9th St NE, Calgary, AB T2E 7W3
403-618-6113
https://thebelmontbarber.ca

---
CASL Compliance: You can unsubscribe from future emails at any time.`;
    navigator.clipboard.writeText(template);
    alert("Outreach template copied to clipboard!");
  };

  const exportStatus = () => {
    const data = prospects.map((p) => ({
      name: p.name,
      url: p.url,
      type: p.type,
      status: p.status,
      ice_score: p.ice,
      priority: p.priority,
      sent_date: p.sentDate || "",
      followup_date: p.followupDate || "",
      notes: p.notes,
    }));
    const csv = toCSV(data);
    const blob = createCSVBlob(csv);
    saveBlob(blob, `link-prospects-status-${todayISO()}.csv`);
  };

  const filteredProspects = prospects.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: prospects.length,
    todo: prospects.filter((p) => p.status === "todo").length,
    sent: prospects.filter((p) => p.status === "sent").length,
    linked: prospects.filter((p) => p.status === "linked").length,
  };

  // Group by "neighborhood blocks" (simulated geo clustering)
  const groupedProspects = filteredProspects.reduce(
    (acc, prospect) => {
      // Simple clustering based on type for demo purposes
      const block = `${prospect.type}s`;
      if (!acc[block]) acc[block] = [];
      acc[block].push(prospect);
      return acc;
    },
    {} as Record<string, Prospect[]>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partnership Map"
        subtitle="Track and manage local link building opportunities in Bridgeland for The Belmont Barbershop."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSampleData}>
              <MapPin className="h-4 w-4 mr-2" />
              Load Sample Prospects
            </Button>
            <Button variant="outline" onClick={exportStatus}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Export Status
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Prospects"
          value={stats.total}
          icon={<MapPin className="h-4 w-4" />}
        />
        <KPICard
          label="To Contact"
          value={stats.todo}
          hint="Outreach pending"
          icon={<Clock className="h-4 w-4" />}
        />
        <KPICard
          label="Outreach Sent"
          value={stats.sent}
          hint="Emails sent"
          icon={<Mail className="h-4 w-4" />}
        />
        <KPICard
          label="Links Acquired"
          value={stats.linked}
          hint="Success rate"
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="map">Neighborhood Map</TabsTrigger>
          <TabsTrigger value="prospects">All Prospects</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Partnership Map Tool
              </CardTitle>
              <CardDescription>
                Learn how to identify, track, and acquire local link building
                opportunities for Belmont
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool helps you identify and manage local businesses in
                    Bridgeland that could link to Belmont's website. It uses an
                    ICE scoring system (Impact, Confidence, Ease) to prioritize
                    outreach efforts and track the status of link building
                    campaigns from initial contact to successful link
                    acquisition.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Local Link Building Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Local links from nearby businesses are extremely valuable
                    for Belmont's search engine rankings because:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Google trusts local links more</strong> - Links
                      from nearby businesses carry more weight than distant ones
                    </li>
                    <li>
                      <strong>Relevance signals</strong> - Local links reinforce
                      Belmont's geographic focus on Bridgeland
                    </li>
                    <li>
                      <strong>Community credibility</strong> - Links from local
                      partners build trust and authority
                    </li>
                    <li>
                      <strong>Traffic from partnerships</strong> - Links can
                      drive referral traffic and new customers
                    </li>
                    <li>
                      <strong>Long-term SEO benefits</strong> - Quality local
                      links compound over time for better rankings
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Load sample prospects:</strong> Click "Load Sample
                      Prospects" to see examples of local businesses that could
                      link to Belmont
                    </li>
                    <li>
                      <strong>Review the neighborhood map:</strong> Check the
                      "Neighborhood Map" tab to see prospects organized by
                      business type and location
                    </li>
                    <li>
                      <strong>Evaluate ICE scores:</strong> Each prospect has an
                      ICE score (Impact × Confidence × Ease) to help prioritize
                      outreach
                    </li>
                    <li>
                      <strong>Filter by type and status:</strong> Use the
                      filters to focus on specific types of businesses or
                      prospects at different stages
                    </li>
                    <li>
                      <strong>Compose outreach emails:</strong> Click "Compose"
                      on any prospect to copy a personalized email template to
                      your clipboard
                    </li>
                    <li>
                      <strong>Track outreach status:</strong> Mark prospects as
                      "Sent" after emailing, then "Linked" when they
                      successfully link to Belmont
                    </li>
                    <li>
                      <strong>Export progress:</strong> Download CSV files to
                      track your link building campaign progress
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Understanding ICE Scoring
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Impact (1-5):</strong> How valuable a link from
                      this site would be for Belmont's SEO
                    </li>
                    <li>
                      <strong>Confidence (1-5):</strong> How likely this
                      prospect is to link to Belmont
                    </li>
                    <li>
                      <strong>Ease (1-5):</strong> How easy it will be to get a
                      link from this prospect
                    </li>
                    <li>
                      <strong>ICE Score:</strong> Average of the three factors -
                      higher scores = better prospects
                    </li>
                    <li>
                      <strong>Priority Score:</strong> ICE score multiplied by
                      localness factor
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Prospect Categories
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Directories:</strong> Local business directories,
                      chambers of commerce, community sites
                    </li>
                    <li>
                      <strong>News/Media:</strong> Local newspapers, blogs,
                      community newsletters
                    </li>
                    <li>
                      <strong>Local Partners:</strong> Nearby businesses that
                      could benefit from cross-promotion
                    </li>
                    <li>
                      <strong>Cafes/Restaurants:</strong> Local eateries that
                      often link to local services
                    </li>
                    <li>
                      <strong>Event Organizers:</strong> Businesses that
                      organize community events and festivals
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Outreach Strategy for Belmont
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Start with high-ICE prospects:</strong> Focus on
                      the easiest, most valuable opportunities first
                    </li>
                    <li>
                      <strong>Personalize your approach:</strong> Reference
                      specific Bridgeland locations and Belmont's community
                      involvement
                    </li>
                    <li>
                      <strong>Offer value first:</strong> Propose mutual
                      benefits like staff discounts or cross-promotions
                    </li>
                    <li>
                      <strong>Follow up consistently:</strong> Send gentle
                      follow-up emails 1-2 weeks after initial contact
                    </li>
                    <li>
                      <strong>Provide link guidance:</strong> Make it easy by
                      suggesting specific pages to link to
                    </li>
                    <li>
                      <strong>Track everything:</strong> Use the status tracking
                      to monitor your campaign progress
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Link Building Best Practices
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Focus on relevant pages:</strong> Ask for links to
                      Belmont's homepage, services page, or location page
                    </li>
                    <li>
                      <strong>Use descriptive anchor text:</strong> "Belmont
                      Barbershop", "Bridgeland Barber", "Professional Haircuts
                      Calgary"
                    </li>
                    <li>
                      <strong>Build relationships first:</strong> Don't just ask
                      for links - build genuine partnerships
                    </li>
                    <li>
                      <strong>Diversify anchor text:</strong> Use a variety of
                      natural-sounding link text
                    </li>
                    <li>
                      <strong>Monitor link health:</strong> Check that acquired
                      links remain active over time
                    </li>
                    <li>
                      <strong>Celebrate successes:</strong> Track and celebrate
                      when prospects become links
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Measuring Success
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Link acquisition rate:</strong> Percentage of
                      contacted prospects that provide links
                    </li>
                    <li>
                      <strong>SEO impact:</strong> Monitor improvements in local
                      search rankings for relevant keywords
                    </li>
                    <li>
                      <strong>Referral traffic:</strong> Track visits from
                      acquired links using UTM parameters
                    </li>
                    <li>
                      <strong>Domain authority growth:</strong> Links from
                      quality sites improve Belmont's overall SEO authority
                    </li>
                    <li>
                      <strong>Competitive advantage:</strong> More local links =
                      better visibility than competitors
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Common Link Opportunities in Bridgeland
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Local business directories</strong> like "Best of
                      Bridgeland" or community resource pages
                    </li>
                    <li>
                      <strong>Event sponsorship pages</strong> for community
                      festivals and markets
                    </li>
                    <li>
                      <strong>Restaurant recommendation pages</strong> linking
                      to "nearby services"
                    </li>
                    <li>
                      <strong>Local blog posts</strong> about "where to get a
                      haircut in Bridgeland"
                    </li>
                    <li>
                      <strong>Community resource pages</strong> for "local
                      services and businesses"
                    </li>
                    <li>
                      <strong>Event venue pages</strong> recommending services
                      for event attendees
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div>
              <Label htmlFor="filterType">Filter by Type</Label>
              <select
                id="filterType"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                {Object.entries(PROSPECT_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="filterStatus">Filter by Status</Label>
              <select
                id="filterStatus"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="sent">Sent</option>
                <option value="linked">Linked</option>
              </select>
            </div>
          </div>

          {/* Neighborhood Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedProspects).map(([block, blockProspects]) => (
              <Card key={block}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{block}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {blockProspects.length} prospects
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {blockProspects.slice(0, 5).map((prospect) => (
                    <div
                      key={prospect.id}
                      className="border rounded p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{prospect.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          ICE: {prospect.ice}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${PROSPECT_TYPES[prospect.type]?.color || ""}`}
                        >
                          {PROSPECT_TYPES[prospect.type]?.label ||
                            prospect.type}
                        </Badge>
                        <Badge
                          variant={
                            prospect.status === "linked"
                              ? "default"
                              : prospect.status === "sent"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {prospect.status}
                        </Badge>
                      </div>

                      <div className="flex gap-1">
                        {prospect.status === "todo" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => composeOutreach(prospect)}
                              className="text-xs"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Compose
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsSent(prospect.id)}
                              className="text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Sent
                            </Button>
                          </>
                        )}
                        {prospect.status === "sent" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsLinked(prospect.id)}
                            className="text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Mark Linked
                          </Button>
                        )}
                        {prospect.status === "linked" && (
                          <Badge variant="default" className="text-xs">
                            ✅ Linked
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prospects" className="space-y-4">
          <div className="space-y-4">
            {filteredProspects.map((prospect) => (
              <Card key={prospect.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{prospect.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${PROSPECT_TYPES[prospect.type]?.color || ""}`}
                        >
                          {PROSPECT_TYPES[prospect.type]?.label ||
                            prospect.type}
                        </Badge>
                        <Badge
                          variant={
                            prospect.status === "linked"
                              ? "default"
                              : prospect.status === "sent"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {prospect.status}
                        </Badge>
                        <Badge variant="outline">ICE: {prospect.ice}</Badge>
                        <Badge variant="outline">
                          Priority: {prospect.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {prospect.status === "todo" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => composeOutreach(prospect)}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Compose
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsSent(prospect.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Sent
                          </Button>
                        </>
                      )}
                      {prospect.status === "sent" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsLinked(prospect.id)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Mark Linked
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Localness
                      </Label>
                      <div className="font-medium">{prospect.localness}/5</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Relevance
                      </Label>
                      <div className="font-medium">{prospect.relevance}/5</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Authority
                      </Label>
                      <div className="font-medium">{prospect.authority}/5</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Ease
                      </Label>
                      <div className="font-medium">{prospect.ease}/5</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">URL</Label>
                    <a
                      href={prospect.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm break-all"
                    >
                      {prospect.url}
                    </a>
                  </div>

                  {prospect.email && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Email
                      </Label>
                      <div className="text-sm">{prospect.email}</div>
                    </div>
                  )}

                  {prospect.notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Notes
                      </Label>
                      <div className="text-sm bg-muted p-2 rounded">
                        {prospect.notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
