import type { Metadata } from "next";
import { UrlAnalyzer } from "@/components/url-analyzer";
import { JobList } from "@/components/job-list";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Server, HardDrive, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

const mockStats = [
  {
    title: "Queue Status",
    value: "0 Active Jobs",
    desc: "All tasks completed",
    icon: Layers,
    accent: "text-primary bg-primary/10",
  },
  {
    title: "Local Worker",
    value: "Active",
    desc: "Docker container healthy",
    icon: Server,
    accent: "text-emerald-400 bg-emerald-400/10",
  },
  {
    title: "Output Mode",
    value: "Local Temp",
    desc: "./tmp mounted volume",
    icon: HardDrive,
    accent: "text-cyan-400 bg-cyan-400/10",
  },
  {
    title: "Policy Mode",
    value: "Strict Policy",
    desc: "DRM, localhost, private IPs blocked",
    icon: ShieldCheck,
    accent: "text-primary bg-primary/10",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8 bg-background">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Media Loader Workspace
          </h1>
          <p className="text-xs text-muted-foreground">
            Verify and retrieve files securely from online paths.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start mt-2 sm:mt-0 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[11px] text-emerald-400 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Docker Engine: Connected
        </div>
      </div>

      {/* Stats Row Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {mockStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80">
                    {stat.desc}
                  </p>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.accent} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Col: URL Input & Analyzer (takes 2 cols on wide screen) */}
        <div className="lg:col-span-2 space-y-6">
          <UrlAnalyzer />
        </div>

        {/* Right Col: Recent Jobs Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Live Queue Status
            </h2>
            <span className="text-[10px] text-primary hover:underline cursor-pointer">
              Refresh
            </span>
          </div>
          <JobList />
        </div>
      </div>
    </div>
  );
}
