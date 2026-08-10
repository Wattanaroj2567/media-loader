"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CircleUserRound,
  LogOut,
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingIndicator } from "@/components/loading-indicator";

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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    setConfirmOpen(false);
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
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-clip px-3 py-6 min-[360px]:px-4 sm:px-6 lg:px-8 lg:py-9">
      {/* Page title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="ui-page-title">
          {t("account.title", {}, "บัญชี")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">{t("account.subtitle")}</p>
      </div>

      {loading ? (
        <div className="grid min-h-48 place-items-center text-sm text-text-muted">
          <LoadingIndicator
            label={t("common.loading", {}, "กำลังโหลด...")}
            iconClassName="size-5 text-text-dim"
          />
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start">
          {/* Profile card */}
          <section className="ui-panel min-w-0 max-w-full overflow-hidden rounded-3xl p-4 min-[360px]:p-5 sm:p-6">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 min-[360px]:gap-3">
              <h2 className="min-w-0 text-base font-semibold text-text">
                {t("account.profile", {}, "โปรไฟล์ Google")}
              </h2>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="size-3" />
                {t("account.active", {}, "ใช้งานอยู่")}
              </span>
            </div>

            <div className="mt-6 flex min-w-0 flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
              <div className="flex w-full min-w-0 items-center gap-3 min-[360px]:gap-4 sm:flex-1">
                <div
                  role={user?.avatar_url ? "img" : undefined}
                  aria-label={user?.full_name || user?.email || "User"}
                  className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 bg-cover bg-center min-[360px]:size-14"
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
                <div className="min-w-0 flex-1">
                  <p className="block max-w-full truncate text-sm font-semibold text-text min-[360px]:text-base">
                    {user?.full_name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm text-text-muted">
                      {user?.email}
                    </p>
                    <span className="shrink-0 rounded-lg border border-border bg-bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
                      Google
                    </span>
                  </div>
                </div>
              </div>

              <form action="/auth/signout" method="post" className="w-full sm:w-auto lg:hidden">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-10 w-full cursor-pointer gap-2 border-border text-text-muted hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 sm:w-auto"
                >
                  <LogOut className="size-4" />
                  <span>{t("account.signOut", {}, "ออกจากระบบ")}</span>
                </Button>
              </form>
            </div>

          </section>

          {/* Danger zone collapsible */}
          <div className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-border bg-bg-elevated/60 shadow-[inset_0_1px_0_var(--panel-highlight)]">
            <button
              type="button"
              onClick={() => setShowDangerZone(!showDangerZone)}
              aria-expanded={showDangerZone}
              className="flex min-h-14 w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-text-muted transition-colors hover:bg-bg-surface/60 hover:text-text cursor-pointer"
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
              <div className="border-t border-rose-500/20 bg-rose-500/5 p-5">
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
                    className="h-11 border-rose-500/30 bg-bg-base/40 text-text placeholder:text-text-dim focus-visible:ring-rose-500/20"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!isConfirmValid(confirmText) || deleting}
                    onClick={() => setConfirmOpen(true)}
                    className="w-full"
                  >
                    {deleting ? (
                      <LoadingIndicator label={t("account.deleting")} />
                    ) : (
                      <>
                        <Trash2 className="size-4" />
                        {t("account.delete")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          isOpen={true}
          title={t("account.deleteConfirm", {}, "ยืนยันลบบัญชีถาวร?")}
          description={t("account.dangerDesc", {}, "การลบบัญชีจะยกเลิกงานดาวน์โหลดทั้งหมด ลบประวัติ และลบข้อมูลบัญชีออกจากระบบอย่างถาวร")}
          confirmText={t("common.delete", {}, "ลบ")}
          cancelText={t("queue.cancel", {}, "ยกเลิก")}
          variant="danger"
          onConfirm={() => void deleteAccount()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </main>
  );
}
