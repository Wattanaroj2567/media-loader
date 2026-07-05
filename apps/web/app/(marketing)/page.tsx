"use client";

import { Download, ShieldCheck, Zap, Lock, ArrowRight, Eye, Server, Layers } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

const features = [
  {
    icon: ShieldCheck,
    title: "Rights-Aware",
    body: "Every link is checked dynamically against platform safety guidelines.",
  },
  {
    icon: Zap,
    title: "Fast Local Queue",
    body: "Processing jobs are executed locally using an isolated Docker environment.",
  },
  {
    icon: Lock,
    title: "Strictly Private",
    body: "Session history and request audits are kept in your database instance.",
  },
];

const workflowSteps = [
  { step: "01", name: "URL Input", icon: Download },
  { step: "02", name: "Policy Check", icon: ShieldCheck },
  { step: "03", name: "Queue Job", icon: Layers },
  { step: "04", name: "Local Worker", icon: Server },
];

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setLoading(false);
      console.error("Auth error:", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-20 bg-background">
      {/* Product Badge */}
      <Badge
        variant="outline"
        className="mb-6 px-3.5 py-1 text-xs text-primary bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors uppercase tracking-wider font-mono"
      >
        Personal Rights-Aware Media Workspace
      </Badge>

      {/* Hero Header */}
      <div className="flex flex-col items-center gap-5 text-center max-w-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/35">
          <Download className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Media Loader
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 max-w-md mx-auto leading-relaxed">
            Process allowed media URLs locally. Manage rights-approved media links safely with local policy compliance controls.
          </p>
        </div>

        {/* Action Button Container */}
        <div className="w-full max-w-xs space-y-3 mt-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            id="btn-google-login"
            className={buttonVariants({ size: "lg" }) + " w-full gap-2.5 font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"}
          >
            <GoogleIcon />
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-sans">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Secure Google login powered by Supabase</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 max-w-sm leading-normal">
          Backend API and Worker process run locally via Docker. Media files are stored inside your local temporary environment. Supabase Auth integration active.
        </p>
      </div>

      {/* Workflow Step Indicator */}
      <div className="mt-16 w-full max-w-3xl border border-border/40 rounded-xl bg-card/30 p-6">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6 text-center">
          Execution Lifecycle Flow
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 relative">
          {workflowSteps.map((ws, i) => {
            const Icon = ws.icon;
            return (
              <div key={ws.step} className="flex flex-col items-center text-center p-3 relative group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/30 border border-border/50 text-foreground group-hover:border-primary/40 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] font-mono text-primary/70 mt-2">{ws.step}</span>
                <span className="text-xs font-medium text-foreground mt-1">{ws.name}</span>
                {i < 3 && (
                  <ArrowRight className="absolute top-6 -right-3.5 h-4 w-4 text-border hidden sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl w-full">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col gap-2 rounded-xl border border-border/55 bg-card/65 p-5 hover:border-primary/20 transition-all duration-200"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/40 text-primary border border-border/40">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-zinc-400 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2a10.34 10.34 0 0 0-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908C16.658 14.253 17.64 11.945 17.64 9.2Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
    </svg>
  );
}
