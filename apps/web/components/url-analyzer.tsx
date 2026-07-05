"use client";

import { useState } from "react";
import { Search, Loader2, ShieldAlert, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

type AnalysisState = "idle" | "analyzing" | "allowed" | "blocked";

export function UrlAnalyzer() {
  const [url, setUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<AnalysisState>("idle");
  const [platform, setPlatform] = useState("Unknown");
  const [title, setTitle] = useState("Direct Stream Source");

  function handleAnalyze() {
    if (!url.trim() || !confirmed) return;
    setState("analyzing");

    // Dynamic mock evaluation based on input keywords
    const lowerUrl = url.toLowerCase();
    const isLocalhost = lowerUrl.includes("localhost") || lowerUrl.includes("127.0.0.1") || lowerUrl.includes("192.168") || lowerUrl.includes("10.0");
    const isDrm = lowerUrl.includes("drm") || lowerUrl.includes("private") || lowerUrl.includes("premium") || lowerUrl.includes("protected") || lowerUrl.includes("paywall");
    const isBlocked = isLocalhost || isDrm;
    
    let detectedPlatform = "Public Media Host";
    let detectedTitle = "Public Domain Film Sample";
    let blockReason = "Blocked by Policy: Asset contains active DRM layers or belongs to a restricted origin domain.";

    if (isLocalhost) {
      detectedPlatform = "Restricted Local Target";
      detectedTitle = "Localhost Loopback URL";
      blockReason = "Blocked by Policy: Loopback addresses, localhost, and private networks (RFC 1918) are blocked for safety.";
    } else if (lowerUrl.includes("archive.org")) {
      detectedPlatform = "Internet Archive";
      detectedTitle = "Public Domain Film Sample";
    } else if (lowerUrl.includes("wikimedia")) {
      detectedPlatform = "Wikimedia Commons";
      detectedTitle = "Creative Commons Audio";
    }

    setTimeout(() => {
      setPlatform(detectedPlatform);
      setTitle(detectedTitle);
      if (isBlocked) {
        setState("blocked");
        // Store reason temporarily in title state to render dynamically
        setTitle(blockReason);
      } else {
        setState("allowed");
      }
    }, 1200);
  }

  function handleReset() {
    setUrl("");
    setConfirmed(false);
    setState("idle");
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-4 border-b border-border/40">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <span>URL Analyzer</span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-mono font-normal">
            Policy Layer Active
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* URL Input Form */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="url-input"
            type="url"
            placeholder="Enter public domain or CC-licensed media URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            disabled={state === "analyzing"}
            className="flex-1 bg-input/40 placeholder:text-muted-foreground/40 font-mono text-xs border-border/70"
          />
          <Button
            id="btn-analyze"
            onClick={handleAnalyze}
            disabled={!url.trim() || !confirmed || state === "analyzing"}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/95 shrink-0 text-xs font-semibold px-4"
          >
            {state === "analyzing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {state === "analyzing" ? "Verifying…" : "Analyze Path"}
          </Button>
        </div>

        {/* Rights Confirmation Checkbox */}
        <div className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-accent/5 p-3">
          <Checkbox
            id="confirm-rights"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            disabled={state === "analyzing"}
            className="mt-0.5"
          />
          <div className="grid gap-1 leading-none">
            <label
              htmlFor="confirm-rights"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              Confirm rights & permissions
            </label>
            <p className="text-[10px] text-muted-foreground/80 leading-normal">
              By checking this, you confirm this URL is either public domain, CC licensed, or you own explicit distribution rights. DRM/paywalls will be blocked.
            </p>
          </div>
        </div>

        {/* Dynamic Context Tips for testing mock behaviors */}
        {state === "idle" && (
          <div className="text-[10px] text-zinc-300 bg-accent/15 rounded px-2.5 py-1.5 flex items-center gap-1.5 font-sans">
            <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              Tip: Test blocked states by putting <b>&quot;drm&quot;</b>, <b>&quot;private&quot;</b>, or <b>&quot;localhost&quot;</b>/<b>&quot;192.168&quot;</b> in the URL.
            </span>
          </div>
        )}

        {/* Verification Result Component */}
        {state === "allowed" && (
          <AnalysisResult
            platform={platform}
            title={title}
            formats={["1080p MP4 (Direct)", "720p MP4 (Direct)", "Audio MP3 (Muxed)"]}
            onQueue={() => alert("Successfully simulated job queued!")}
            onReset={handleReset}
          />
        )}

        {state === "blocked" && (
          <BlockedResult
            reason={title}
            onReset={handleReset}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Sub-components ─── */

type AnalysisResultProps = {
  platform: string;
  title: string;
  formats: string[];
  onQueue: () => void;
  onReset: () => void;
};

function AnalysisResult({
  platform,
  title,
  formats,
  onQueue,
  onReset,
}: AnalysisResultProps) {
  const [selectedFormat, setSelectedFormat] = useState(formats[0]);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-foreground tracking-tight">{title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] text-primary bg-primary/5 font-mono px-2 py-0">
              {platform}
            </Badge>
            <span className="text-[10px] text-muted-foreground">· Safe Domain Policy Checked</span>
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-[10px] text-muted-foreground hover:text-foreground hover:underline transition-colors shrink-0"
        >
          Clear
        </button>
      </div>

      {/* Format Switcher */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
          Normalised Stream Formats
        </p>
        <div className="flex flex-wrap gap-2">
          {formats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-mono border transition-all duration-200 ${
                selectedFormat === fmt
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border/60 text-muted-foreground hover:border-muted-foreground hover:bg-accent/20"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
        <div className="text-[10px] text-muted-foreground/80">
          Output Mode: <span className="font-mono text-foreground font-semibold">Local Temp Storage</span>
        </div>
        <Button
          id="btn-queue-job"
          onClick={onQueue}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold px-4"
          size="sm"
        >
          Queue Download
        </Button>
      </div>
    </div>
  );
}

function BlockedResult({
  reason,
  onReset,
}: {
  reason: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 gap-3">
      <div className="flex items-start gap-2.5 text-xs text-destructive">
        <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-[10px]">Access Violation</p>
          <p className="text-muted-foreground leading-normal">{reason}</p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="text-[10px] text-muted-foreground hover:text-foreground hover:underline transition-colors shrink-0 self-end sm:self-start"
      >
        Clear
      </button>
    </div>
  );
}
