"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CircleUserRound,
  Loader2,
  ShieldCheck,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";
import { apiClient } from "@/lib/api-client";
import { useT } from "@/lib/i18n/context";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface AccountUser {
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { t } = useT();
  const { toast } = useToast();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(
        currentUser
          ? {
              email: currentUser.email,
              full_name: currentUser.user_metadata?.full_name,
              avatar_url: currentUser.user_metadata?.avatar_url,
            }
          : null,
      );
      setLoading(false);
    }
    void loadUser();
    return () => { cancelled = true; };
  }, []);

  const isConfirmValid = (text: string) => {
    const trimmed = text.trim();
    return trimmed.toUpperCase() === "DELETE" || trimmed === "ลบ";
  };

  const deleteAccount = async () => {
    if (!isConfirmValid(confirmText)) return;
    if (!window.confirm(t("account.deleteConfirm"))) return;
    setDeleting(true);
    try {
      await apiClient.deleteAccount();
      await createClient().auth.signOut();
      toast("success", t("account.deleteSuccess"));
      router.replace("/");
    } catch (error) {
      console.warn("[Delete Account Error]:", error);
      toast(
        "error",
        t("account.deleteError"),
        t("error.genericDesc"),
      );
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text">
          {t("account.title", {}, "บัญชี")}
        </h1>
      </div>

      {loading ? (
        <div className="grid min-h-48 place-items-center">
          <Loader2 className="size-5 animate-spin text-text-dim" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Profile card */}
          <section className="rounded-2xl border border-border bg-bg-surface/50 p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold text-text">
                {t("account.profile", {}, "โปรไฟล์ Google")}
              </h2>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="size-3" />
                {t("account.active", {}, "ใช้งานอยู่")}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div
                role={user?.avatar_url ? "img" : undefined}
                aria-label={user?.full_name || user?.email || "User"}
                className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-bg-surface bg-cover bg-center"
                style={
                  user?.avatar_url
                    ? { backgroundImage: `url("${user.avatar_url}")` }
                    : undefined
                }
              >
                {!user?.avatar_url && (
                  <CircleUserRound className="size-7 text-text-dim" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold text-text">
                    {user?.full_name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <span className="rounded-lg bg-bg-surface border border-border px-2 py-0.5 text-[10px] font-medium text-text-muted">
                    Google
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-text-muted">
                  {user?.email}
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs text-text-dim">
              {t("account.signoutNote", {}, "ออกจากระบบได้จากเมนู avatar มุมบนขวา")}
            </p>
          </section>

          {/* Danger zone collapsible */}
          <div className="rounded-2xl border border-border bg-card">
            <button
              type="button"
              onClick={() => setShowDangerZone(!showDangerZone)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-text-dim" />
                {t("account.dangerTitle", {}, "ลบบัญชี")}
              </span>
              {showDangerZone ? (
                <ChevronDown className="size-4 text-text-dim" />
              ) : (
                <ChevronRight className="size-4 text-text-dim" />
              )}
            </button>

            {showDangerZone && (
              <div className="border-t border-border bg-rose-500/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-500/20 bg-rose-500/10">
                    <AlertTriangle className="size-4 text-rose-500 dark:text-rose-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-rose-800 dark:text-rose-100">
                      {t("account.dangerTitle", {}, "ลบบัญชี")}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-rose-700/80 dark:text-rose-200/60">
                      {t("account.dangerDesc")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <Label htmlFor="delete-account" className="text-sm text-rose-800 dark:text-rose-200">
                    {t("account.confirmLabel")}
                  </Label>
                  <Input
                    id="delete-account"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={t("account.confirmPlaceholder", {}, "DELETE")}
                    className="h-10 border-rose-500/30 bg-bg-base/30 text-text placeholder:text-text-dim focus-visible:ring-rose-500/20"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!isConfirmValid(confirmText) || deleting}
                    onClick={() => void deleteAccount()}
                    className="w-full"
                  >
                    {deleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    {deleting ? t("account.deleting") : t("account.delete")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
