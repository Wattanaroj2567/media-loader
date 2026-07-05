import type { Metadata } from "next";
import { Settings, User, Shield, Cpu, AlertTriangle, Sliders } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-8 space-y-8 bg-background">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          System Preferences
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          View execution settings, local Docker ports, and client policy limits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column Settings */}
        <div className="space-y-6">
          {/* Account Detail Card */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-primary" />
                Session Account
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <SettingRow label="Auth User" value="user@example.com" />
              <Separator className="opacity-60" />
              <SettingRow label="Auth Provider" value="Google OAuth (Supabase)" />
              <Separator className="opacity-60" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Session Token</p>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 bg-emerald-400/5 border-emerald-400/20 px-2.5">
                  Mock Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Docker Local Runtime Configuration Card */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4 text-primary" />
                Docker Runtime
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <SettingRow label="FastAPI (Backend)" value="http://localhost:8000" />
              <Separator className="opacity-60" />
              <SettingRow label="Worker Container" value="Local Daemon Polling" />
              <Separator className="opacity-60" />
              <SettingRow label="Shared Volumes" value="./tmp mounted cache" />
            </CardContent>
          </Card>

          {/* Warning: Optional Supabase Storage Bucket card */}
          <Card className="border-amber-500/20 bg-amber-500/5 text-amber-500/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                Storage Architecture Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] leading-relaxed space-y-2">
              <p>
                By default, files are saved to the <b>Local Temp Output mode</b> inside the mounted Docker directory. This is optimal for local execution.
              </p>
              <p>
                Cloud-based Supabase Storage configuration is optional for this stack. To configure, check environment guides in <b>.env.example</b>.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column Settings */}
        <div className="space-y-6">
          {/* Policy Constraints Card */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="h-4 w-4 text-primary" />
                Content Protection Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <SettingRow label="Bypass DRMs" value="Blocked" />
              <Separator className="opacity-60" />
              <SettingRow label="Bypass Paywalls" value="Blocked" />
              <Separator className="opacity-60" />
              <SettingRow label="Internal Extractor Logs" value="Sanitized" />
              <Separator className="opacity-60" />
              <SettingRow label="Rights Confirmation" value="Always Required" />
            </CardContent>
          </Card>

          {/* Strategy & Default Settings Card */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Sliders className="h-4 w-4 text-primary" />
                Client Defaults
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <SettingRow label="Default Video Format" value="1080p MP4 (Direct)" />
              <Separator className="opacity-60" />
              <SettingRow label="Default Audio Codec" value="MP3 conversion target: 192kbps/320kbps mock" />
              <Separator className="opacity-60" />
              <SettingRow label="Max File Buffer Size" value="500 MB limit" />
              <Separator className="opacity-60" />
              <p className="text-[10px] text-zinc-400 leading-normal">
                Note: Free tier configurations do not upload large media files directly to Supabase Storage by default. Local temp mode is preferred.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs font-mono font-medium text-foreground tracking-tight">{value}</p>
    </div>
  );
}
