"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";
import { useAppUser } from "@/components/app-user-context";
import { apiClient } from "@/lib/api-client";
import { useT } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingIndicator } from "@/components/loading-indicator";
import { UserAvatar } from "@/components/user-avatar";

export default function AccountPage() {
  const router = useRouter();
  const { t } = useT();
  const { toast } = useToast();
  const user = useAppUser();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isConfirmValid = (text: string) => {
    const trimmed = text.trim();
    return trimmed.toUpperCase() === "DELETE" || trimmed === "ลบ";
  };

  const deleteAccount = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      await apiClient.deleteAccount();
      const { createClient } = await import("@/utils/supabase/client");
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
    <div className="mx-auto w-full max-w-2xl px-4 pb-4 sm:px-6 sm:pb-6 lg:pb-9 pt-4 sm:pt-5">
    <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-9">
      {/* Page title */}
      <Link
        href="/dashboard"
        prefetch={true}
        aria-label={t("common.back", {}, "กลับ")}
        className="mb-5 inline-flex h-9 items-center gap-2 rounded-full border border-border bg-bg-surface/90 px-3.5 text-xs font-semibold text-text backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-bg-surface hover:text-primary cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        <span>{t("common.back", {}, "กลับ")}</span>
      </Link>
      <div className="mb-6 sm:mb-8">
        <p className="ui-kicker mb-2">{t("account.kicker", {}, "ข้อมูลบัญชีของคุณ")}</p>
        <h1 className="ui-page-title">
          {t("account.title", {}, "บัญชีผู้ใช้")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">{t("account.subtitle", {}, "จัดการโปรไฟล์และความปลอดภัยของบัญชี")}</p>
      </div>

      <div className="space-y-5">
        {/* 1. Profile Card */}
        <section className="ui-panel rounded-3xl border border-border bg-bg-surface/70 p-5 shadow-none sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">
              {t("account.profile", {}, "โปรไฟล์ Google")}
            </h2>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              {t("account.active", {}, "ยืนยันตัวตนแล้ว")}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="flex items-center gap-4 min-w-0">
              <UserAvatar
                name={user.name || user.email}
                avatarUrl={user.avatar_url}
                className="size-16 shrink-0 rounded-full border-2 border-border ring-4 ring-primary/10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-text">
                  {user.name || user.email.split("@")[0] || "User"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="truncate text-xs font-mono text-text-muted sm:text-sm">
                    {user.email}
                  </p>
                  <span className="rounded-md border border-border bg-bg-base px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                    Google OAuth
                  </span>
                </div>
              </div>
            </div>

            <form action="/auth/signout" method="post" className="w-full sm:w-auto lg:hidden">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-9.5 w-full cursor-pointer gap-2 rounded-xl border-border bg-bg-base/70 text-xs font-semibold text-text transition-all duration-150 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 sm:w-auto"
              >
                <LogOut className="size-3.5" />
                <span>{t("account.signOut", {}, "ออกจากระบบ")}</span>
              </Button>
            </form>
          </div>
        </section>

        {/* 2. Danger Zone Collapsible */}
        <div className="overflow-hidden rounded-3xl border border-border bg-bg-surface/40">
          <button
            type="button"
            onClick={() => setShowDangerZone(!showDangerZone)}
            aria-expanded={showDangerZone}
            className="flex min-h-14 w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-text-muted transition-colors hover:bg-bg-surface/80 hover:text-text cursor-pointer"
          >
            <span className="flex items-center gap-2 font-semibold text-text">
              <AlertTriangle className="size-4 text-rose-500" />
              {t("account.dangerTitle", {}, "ลบบัญชี")}
            </span>
            {showDangerZone ? (
              <ChevronDown className="size-4 text-text-dim" />
            ) : (
              <ChevronRight className="size-4 text-text-dim" />
            )}
          </button>

          {showDangerZone && (
            <div className="border-t border-rose-500/20 bg-rose-500/5 p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-500/25 bg-rose-500/15">
                  <AlertTriangle className="size-4.5 text-rose-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                    {t("account.dangerTitle", {}, "ลบบัญชีถาวร")}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-rose-700/80 dark:text-rose-300/70">
                    {t("account.dangerDesc", {}, "การลบบัญชีจะยกเลิกงานดาวน์โหลดทั้งหมด ลบประวัติ และลบข้อมูลบัญชีออกจากระบบอย่างถาวร ไม่สามารถกู้คืนได้")}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <Label htmlFor="delete-account" className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                  {t("account.confirmLabel", {}, 'พิมพ์ "DELETE" หรือ "ลบ" เพื่อยืนยัน')}
                </Label>
                <Input
                  id="delete-account"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t("account.confirmPlaceholder", {}, "DELETE")}
                  className="h-10 rounded-xl border-rose-500/30 bg-bg-base/60 text-xs text-text placeholder:text-text-dim focus-visible:ring-rose-500/20"
                />
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!isConfirmValid(confirmText) || deleting}
                  onClick={() => setConfirmOpen(true)}
                  className="h-10 w-full rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {deleting ? (
                    <LoadingIndicator label={t("account.deleting", {}, "กำลังลบบัญชี...")} />
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      <span>{t("account.delete", {}, "ยืนยันการลบบัญชี")}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

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
    </div>
    </div>
  );
}
