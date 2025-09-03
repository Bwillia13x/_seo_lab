"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Upload,
  Shield,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Info,
  Phone,
  MessageSquare,
  Mail,
} from "lucide-react";

export default function NoShowShield() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointment Reminders"
        subtitle="Predict and prevent no-show appointments using historical data patterns."
        actions={
          <Button variant="outline" onClick={() => setLoaded(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Load Visit Data
          </Button>
        }
      />

      <Tabs defaultValue="howto" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Appointment Reminders Tool
              </CardTitle>
              <CardDescription>
                Learn how to predict and prevent no-show appointments to protect
                Belmont's revenue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="h3 mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool analyzes historical appointment data to identify
                    patterns that predict which customers are most likely to
                    miss their appointments. It provides automated risk scoring
                    and suggests proactive communication strategies to reduce
                    no-shows and protect Belmont's revenue.
                  </p>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Why No-Show Prevention Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    No-show appointments represent lost revenue and wasted time
                    for Belmont:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Revenue protection:</strong> Every no-show costs
                      Belmont the full price of the missed service
                    </li>
                    <li>
                      <strong>Staff productivity:</strong> Barbers have
                      unproductive time that could be filled with paying
                      customers
                    </li>
                    <li>
                      <strong>Customer satisfaction:</strong> Proactive
                      reminders show Belmont cares about their customers' time
                    </li>
                    <li>
                      <strong>Resource optimization:</strong> Better appointment
                      attendance means more efficient use of chairs and staff
                    </li>
                    <li>
                      <strong>Business reputation:</strong> Reliable service
                      builds trust and encourages repeat business
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Load your appointment data:</strong> Click "Load
                      Visit Data" to analyze historical patterns and train the
                      risk prediction model
                    </li>
                    <li>
                      <strong>Review the risk dashboard:</strong> Check the
                      "Dashboard" tab to see current risk levels and appointment
                      statistics
                    </li>
                    <li>
                      <strong>Identify at-risk appointments:</strong> The tool
                      highlights appointments with high no-show risk based on
                      historical patterns
                    </li>
                    <li>
                      <strong>Send proactive reminders:</strong> Use the
                      suggested communication methods (phone, text, email) for
                      high-risk appointments
                    </li>
                    <li>
                      <strong>Track effectiveness:</strong> Monitor how reminder
                      strategies reduce no-show rates over time
                    </li>
                    <li>
                      <strong>Refine your approach:</strong> Use the risk factor
                      analysis to improve your reminder timing and messaging
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Understanding Risk Factors
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>First-time customers:</strong> New customers are
                      more likely to miss appointments (28% higher risk)
                    </li>
                    <li>
                      <strong>Late bookings:</strong> Appointments booked close
                      to the service time have higher no-show rates
                    </li>
                    <li>
                      <strong>Weekend appointments:</strong> Friday and Saturday
                      appointments show higher cancellation rates
                    </li>
                    <li>
                      <strong>Longer services:</strong> More expensive or
                      time-intensive services have slightly higher no-show rates
                    </li>
                    <li>
                      <strong>Time of day:</strong> Early morning and late
                      afternoon slots sometimes have different attendance
                      patterns
                    </li>
                    <li>
                      <strong>Historical behavior:</strong> Customers with
                      previous no-shows are flagged for extra attention
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Reminder Strategies for Belmont
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>High-risk appointments:</strong> Call 24 hours in
                      advance + text reminder 2 hours before
                    </li>
                    <li>
                      <strong>Medium-risk appointments:</strong> Automated text
                      reminder 24 hours before + confirmation request
                    </li>
                    <li>
                      <strong>First-time customers:</strong> Personal phone call
                      to confirm appointment and answer questions
                    </li>
                    <li>
                      <strong>Weekend appointments:</strong> Extra reminder on
                      Friday for Saturday appointments
                    </li>
                    <li>
                      <strong>Late bookings:</strong> Immediate confirmation
                      call when appointment is booked
                    </li>
                    <li>
                      <strong>Longer services:</strong> Specific reminder about
                      service duration and what to expect
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Measuring Success
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>No-show rate reduction:</strong> Track percentage
                      decrease in missed appointments
                    </li>
                    <li>
                      <strong>Revenue protection:</strong> Calculate dollars
                      saved by preventing no-shows
                    </li>
                    <li>
                      <strong>Reminder effectiveness:</strong> Compare no-show
                      rates for reminded vs. non-reminded appointments
                    </li>
                    <li>
                      <strong>Customer satisfaction:</strong> Monitor if
                      proactive reminders improve overall experience
                    </li>
                    <li>
                      <strong>Staff time savings:</strong> Track time saved by
                      reducing unproductive appointment slots
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for No-Show Prevention
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Multiple reminder methods:</strong> Use phone +
                      text + email for maximum effectiveness
                    </li>
                    <li>
                      <strong>Strategic timing:</strong> Send reminders at
                      optimal intervals (24h before, 2h before)
                    </li>
                    <li>
                      <strong>Personal touch:</strong> Include customer's name
                      and specific service details in reminders
                    </li>
                    <li>
                      <strong>Easy cancellation:</strong> Make it simple for
                      customers to cancel/reschedule if they can't make it
                    </li>
                    <li>
                      <strong>Follow-up on no-shows:</strong> Contact no-show
                      customers to reschedule and understand reasons
                    </li>
                    <li>
                      <strong>Continuous learning:</strong> Update your risk
                      model with new data to improve predictions
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Communication Templates
                  </h3>
                  <div className="space-y-3 text-muted-foreground">
                    <div>
                      <p className="font-medium text-sm">Phone Script:</p>
                      <p className="text-sm italic">
                        "Hi [Name], this is Belmont calling to confirm your
                        [service] appointment for [time]. We're looking forward
                        to seeing you!"
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Text Reminder:</p>
                      <p className="text-sm italic">
                        "Hi [Name]! Just a reminder of your [service] at Belmont
                        tomorrow at [time]. See you then! 💺✂️"
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Email Confirmation:</p>
                      <p className="text-sm italic">
                        "Dear [Name], We're excited about your upcoming
                        [service] appointment. Please reply to confirm you're
                        still able to make it."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Risk Level"
              value={loaded ? "High" : "—"}
              hint="Current assessment"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <KPICard
              label="Appointments"
              value={loaded ? "1,247" : "—"}
              hint="Total tracked"
              icon={<Calendar className="h-4 w-4" />}
            />
            <KPICard
              label="No-Show Rate"
              value={loaded ? "12%" : "—"}
              hint="Historical average"
              icon={<TrendingDown className="h-4 w-4" />}
            />
            <KPICard
              label="Protection"
              value={loaded ? "Active" : "Inactive"}
              hint="Risk prevention"
              icon={<Shield className="h-4 w-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Appointment Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {!loaded ? (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Load Visit Data" to analyze appointment patterns and
                  identify at-risk bookings.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Risk Analysis Active</span>
                    <Badge variant="secondary">
                      Monitoring {loaded ? "1,247" : "0"} appointments
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">
                        High Risk Appointments
                      </p>
                      <p className="font-medium text-red-600">3 today</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Medium Risk Appointments
                      </p>
                      <p className="font-medium text-yellow-600">7 today</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Low Risk Appointments
                      </p>
                      <p className="font-medium text-green-600">12 today</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue Protected</p>
                      <p className="font-medium text-green-600">$2,400/month</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Risk Factors Analysis</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          First-time customers
                        </p>
                        <p className="font-medium">28%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Late bookings</p>
                        <p className="font-medium">15%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Weekend appointments
                        </p>
                        <p className="font-medium">22%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Longer services</p>
                        <p className="font-medium">18%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated Reminder Settings</CardTitle>
              <CardDescription>
                Configure when and how to send appointment reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                Reminder automation settings would be configured here, including
                timing preferences, message templates, and communication channel
                preferences for different risk levels.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
