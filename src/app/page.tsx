import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Link2,
  Tags,
  MessageSquare,
  Image as ImageIcon,
  TrendingUp,
  Shield,
  FileText,
  ArrowRight,
  CheckCircle,
  Clock,
  Target,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

const toolCategories = [
  {
    title: "Marketing & Tracking",
    icon: Tags,
    description:
      "Create tracking links and QR codes for Belmont's marketing campaigns",
    tools: [
      {
        name: "Campaign Link Builder",
        href: "/apps/utm-dashboard",
        description:
          "Create special links that track where your customers come from when they book appointments",
      },
      {
        name: "QR Code Maker",
        href: "/apps/utm-qr",
        description:
          "Generate square barcode images for easy scanning on phones",
      },
      {
        name: "Referral Program QR",
        href: "/apps/referral-qr",
        description: "Create QR codes for staff and partner referral rewards",
      },
    ],
  },
  {
    title: "Content Creation",
    icon: ImageIcon,
    description: "Create posts for social media and Google Business Profile",
    tools: [
      {
        name: "Google Business Posts",
        href: "/apps/gbp-composer",
        description:
          "Write professional posts for your Google Business Profile",
      },
      {
        name: "Social Media Studio",
        href: "/apps/post-studio",
        description:
          "Create content for Facebook, Instagram, and other social platforms",
      },
      {
        name: "Content Calendar",
        href: "/apps/post-oracle",
        description: "Plan and schedule your weekly social media posts",
      },
    ],
  },
  {
    title: "Customer Reviews",
    icon: MessageSquare,
    description: "Collect and manage customer reviews the right way",
    tools: [
      {
        name: "Review Request Links",
        href: "/apps/review-link",
        description:
          "Create links to ask customers for reviews on Google and Apple Maps",
      },
      {
        name: "Review Response Writer",
        href: "/apps/review-composer",
        description: "Write professional responses to customer reviews",
      },
    ],
  },
  {
    title: "Search Performance",
    icon: BarChart3,
    description: "Check how well Belmont appears in Google searches",
    tools: [
      {
        name: "Search Results Analyzer",
        href: "/apps/gsc-ctr-miner",
        description:
          "See how customers find Belmont online and improve your search rankings",
      },
      {
        name: "Local Search Rankings",
        href: "/apps/rank-grid",
        description:
          "Monitor where Belmont appears when people search for barbers in Calgary",
      },
      {
        name: "Ranking Tracker",
        href: "/apps/rankgrid-watcher",
        description:
          "Get automatic updates on Belmont's search position changes",
      },
    ],
  },
  {
    title: "Local Partnerships",
    icon: Link2,
    description: "Find and connect with local businesses in Calgary",
    tools: [
      {
        name: "Partner Finder",
        href: "/apps/link-prospect-kit",
        description:
          "Discover Calgary businesses that could partner with Belmont",
      },
      {
        name: "Neighborhood Content Analyzer",
        href: "/apps/neighbor-signal",
        description: "See what content works best for Bridgeland customers",
      },
      {
        name: "Partnership Map",
        href: "/apps/link-map",
        description: "Visual map showing Belmont's local business connections",
      },
    ],
  },
  {
    title: "Business Insights",
    icon: TrendingUp,
    description: "Understand customer patterns and predict busy times",
    tools: [
      {
        name: "Customer Traffic Predictor",
        href: "/apps/queuetime",
        description:
          "Predict when Belmont will be busiest so you can plan staffing",
      },
      {
        name: "Appointment Optimizer",
        href: "/apps/slot-yield",
        description:
          "See which services make the most money and schedule them better",
      },
      {
        name: "Customer Behavior Tracker",
        href: "/apps/rfm-crm",
        description:
          "Learn which customers are your best and how to keep them happy",
      },
    ],
  },
  {
    title: "Appointment Protection",
    icon: Shield,
    description: "Reduce no-shows and increase revenue",
    tools: [
      {
        name: "No-Show Predictor",
        href: "/apps/noshow-shield",
        description:
          "Identify customers who might not show up and send reminders",
      },
      {
        name: "Service Recommender",
        href: "/apps/addon-recommender",
        description:
          "Suggest extra services customers might like during their visit",
      },
    ],
  },
  {
    title: "Website Optimization",
    icon: FileText,
    description: "Make Belmont's website work better for search engines",
    tools: [
      {
        name: "Page Title Tester",
        href: "/apps/meta-planner",
        description:
          "Test different page titles and descriptions to see what works best",
      },
      {
        name: "Website Improvement Guide",
        href: "/apps/seo-brief",
        description:
          "Get step-by-step instructions to improve Belmont's website",
      },
      {
        name: "Business Info Checker",
        href: "/apps/citation-tracker",
        description:
          "Make sure Belmont's address and phone number are correct everywhere online",
      },
    ],
  },
];

const quickStartSteps = [
  {
    step: "1",
    title: "Create Tracking Links",
    description:
      "Start with the Campaign Link Builder to create special links that track where your customers come from",
    tool: "Campaign Link Builder",
    href: "/apps/utm-dashboard",
  },
  {
    step: "2",
    title: "Set Up Review Collection",
    description:
      "Use the Review Request Links to create easy ways for customers to leave reviews",
    tool: "Review Request Links",
    href: "/apps/review-link",
  },
  {
    step: "3",
    title: "Generate Content",
    description:
      "Use Google Business Posts to create professional content for your business profile",
    tool: "Google Business Posts",
    href: "/apps/gbp-composer",
  },
  {
    step: "4",
    title: "Check Search Performance",
    description:
      "Use the Search Results Analyzer to see how customers find Belmont online",
    tool: "Search Results Analyzer",
    href: "/apps/gsc-ctr-miner",
  },
  {
    step: "5",
    title: "Find Local Partners",
    description:
      "Use the Partner Finder to discover Calgary businesses that could work with Belmont",
    tool: "Partner Finder",
    href: "/apps/link-prospect-kit",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image
            src="/images/PRAIRIESIGNALLOGO.png"
            alt="Prairie Signal"
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <h1 className="text-4xl font-bold tracking-tight belmont-accent-text">
            Belmont SEO Lab
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Professional online marketing toolkit for{" "}
          <a
            href="https://thebelmontbarber.ca/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            The Belmont Barbershop
          </a>{" "}
          in Bridgeland, Calgary. Complete local marketing management with 22
          easy-to-use tools.
        </p>
      </div>

      {/* Start Here (Beginner Guide) */}
      <Card>
        <CardHeader>
          <CardTitle>New? Start here (takes 2 minutes)</CardTitle>
          <CardDescription>
            Three quick steps to get your first win today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              At the top right, click <strong>Simple Mode</strong>. This shows
              short explanations under each tool.
            </li>
            <li>
              Open{" "}
              <Link href="/apps/utm-dashboard" className="underline">
                Campaign Link Builder
              </Link>{" "}
              and make a booking link. Copy it for your Instagram profile.
            </li>
            <li>
              Open{" "}
              <Link href="/apps/review-link" className="underline">
                Review Request Links
              </Link>{" "}
              and copy the SMS. Send it to one recent customer.
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Quick Contact Actions */}
      <div className="flex justify-center gap-4">
        <Button asChild size="sm">
          <a href="tel:403-618-6113" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Belmont
          </a>
        </Button>
        <Button asChild size="sm">
          <a
            href="https://thebelmontbarber.ca/book"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Book Appointment
          </a>
        </Button>
        <Button asChild size="sm">
          <a
            href="https://maps.google.com/?q=915+General+Ave+NE,+Calgary,+AB,+T2E+9E1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Find Us
          </a>
        </Button>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">📍 Local Focus</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Designed specifically for Bridgeland and Riverside neighborhoods
              with Calgary-focused marketing and local business connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">🎯 Ready to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Everything is set up with Belmont's branding, services, contact
              information, and professional templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">🔒 Private & Secure</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              All work happens on your computer - no data is sent to external
              servers for maximum privacy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Start Guide - 5 Steps to Belmont Marketing Success
          </CardTitle>
          <CardDescription>
            Follow these steps to get started with Belmont's marketing toolkit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {quickStartSteps.map((step, index) => (
              <div
                key={step.step}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <div className="flex-shrink-0">
                  <Badge
                    variant="outline"
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                  >
                    {step.step}
                  </Badge>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {step.description}
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={step.href}>
                      Open {step.tool}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tool Categories */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Complete Marketing Toolkit</h2>
          <p className="text-muted-foreground mt-2">
            22 Easy-to-use tools organized by category for comprehensive local
            marketing management
          </p>
        </div>

        <div className="grid gap-6">
          {toolCategories.map((category, index) => (
            <Card key={category.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  {category.title}
                  <Badge variant="secondary" className="ml-2">
                    {category.tools.length} tools
                  </Badge>
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {category.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{tool.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {tool.description}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={tool.href}>
                          Open Tool
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Belmont-Specific Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Everything Set Up for Belmont
          </CardTitle>
          <CardDescription>
            All the settings and information are already configured for The
            Belmont Barbershop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Business Information</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Business Name: The Belmont Barbershop</li>
                <li>• Address: 88 9th St NE, Calgary, AB T2E 7W3</li>
                <li>• Phone: 403-618-6113</li>
                <li>• Website: thebelmontbarber.ca</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Service Offerings</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Men's Haircut & Styling</li>
                <li>• Beard Trim & Grooming</li>
                <li>• Hot Towel Shave</li>
                <li>• Groomsmen Party Packages</li>
                <li>• Veterans & First Responder Discounts</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Popular Search Terms</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "barber shop bridgeland"</li>
                <li>• "mens haircut calgary"</li>
                <li>• "beard trim calgary"</li>
                <li>• "bridgeland barber"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Marketing Campaigns</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Wedding party promotions</li>
                <li>• Military discount offers</li>
                <li>• First responder specials</li>
                <li>• Family and senior deals</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Belmont Marketing Routine
          </CardTitle>
          <CardDescription>
            Recommended daily schedule for the best marketing results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Morning (9-11 AM)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check Search Results Analyzer for performance</li>
                <li>• Review Ranking Tracker updates</li>
                <li>• Plan daily content in Content Calendar</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Afternoon (1-4 PM)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create tracking links for campaigns</li>
                <li>• Write Google Business Profile posts</li>
                <li>• Send review requests to customers</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Evening (4-6 PM)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Look for new local business partners</li>
                <li>• Study customer behavior patterns</li>
                <li>• Plan next day's marketing priorities</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Information */}
      <div className="text-center space-y-4">
        <Separator />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Need Help?</h3>
          <p className="text-muted-foreground">
            Contact The Belmont Barbershop for help or questions about using the
            marketing toolkit.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild variant="outline">
              <a href="tel:403-618-6113">
                <Phone className="h-4 w-4 mr-2" />
                Call Support
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:info@thebelmontbarber.ca">Message Support</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
