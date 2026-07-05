import type { Metadata } from "next";
import { History, Download, Trash2, ShieldAlert, CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "History" };

const mockStats = [
  { label: "Completed Jobs", value: "12", desc: "Successfully saved", icon: CheckCircle2, color: "text-emerald-400" },
  { label: "Blocked Downloads", value: "3", desc: "Rights safety check triggered", icon: ShieldAlert, color: "text-destructive" },
  { label: "Storage Mode", value: "Local Temp", desc: "Fast dev cache active", icon: Download, color: "text-primary" },
];

const HISTORY_ROWS = [
  { id: "h1", title: "Public Domain Film Sample", platform: "Internet Archive", size: "142 MB", date: "2026-07-04", status: "COMPLETED" },
  { id: "h2", title: "Creative Commons Audio", platform: "Wikimedia Commons", size: "4.2 MB", date: "2026-07-03", status: "COMPLETED" },
  { id: "h3", title: "Restricted Protected Media", platform: "DRM Protected Origin", size: "—", date: "2026-07-02", status: "BLOCKED" },
];

export default function HistoryPage() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8 bg-background">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Execution History
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Audit database of local URL requests, rights validations, and file saves.
        </p>
      </div>

      {/* History Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {mockStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-zinc-400">{stat.desc}</p>
                </div>
                <Icon className={`h-6 w-6 shrink-0 ${stat.color}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mock Search and Filter Area */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-border/40 pb-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search local database records..."
            className="pl-9 h-9 text-xs bg-input/40 placeholder:text-zinc-400/50 border-border/70 font-sans"
            disabled
          />
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="flex h-9 items-center gap-1.5 px-3 rounded-lg border border-border/60 bg-card text-xs text-zinc-400 cursor-not-allowed">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table Head */}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-muted/40 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-border/60">
          <span>Title</span>
          <span>Source Platform</span>
          <span>Cached Size</span>
          <span>Date Run</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border/60">
          {HISTORY_ROWS.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center text-xs hover:bg-accent/10 transition-colors"
            >
              {/* Col: Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <Download className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate font-medium text-foreground">{row.title}</span>
              </div>

              {/* Col: Platform */}
              <div>
                <Badge variant="outline" className={`text-[10px] font-sans font-normal ${
                  row.status === "BLOCKED" 
                    ? "bg-destructive/10 text-destructive border-destructive/25" 
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                }`}>
                  {row.platform}
                </Badge>
              </div>

              {/* Col: Size */}
              <span className="text-zinc-400 font-mono text-[11px]">{row.size}</span>

              {/* Col: Date */}
              <span className="text-zinc-400 font-mono text-[11px]">{row.date}</span>

              {/* Col: Actions */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                {row.status === "COMPLETED" ? (
                  <>
                    <button
                      title="Mock Download File"
                      className="p-1.5 rounded border border-border/75 bg-accent/30 text-zinc-300 hover:bg-primary/10 hover:text-primary transition-colors cursor-not-allowed"
                      disabled
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Mock Delete Record"
                      className="p-1.5 rounded border border-border/75 bg-accent/30 text-zinc-300 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-not-allowed"
                      disabled
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      title="View Policy Reason"
                      className="p-1.5 rounded border border-border/75 bg-accent/30 text-destructive hover:bg-destructive/10 transition-colors cursor-not-allowed"
                      disabled
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Mock Delete Record"
                      className="p-1.5 rounded border border-border/75 bg-accent/30 text-zinc-400 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-not-allowed"
                      disabled
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
