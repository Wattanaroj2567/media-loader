"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
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
import {
  getBrowserPushSubscription,
  hasBrowserNotificationsPreference,
  getNotificationPermission,
  registerBrowserPushSubscription,
  requestBrowserNotifications,
  setBrowserNotificationsPreference,
  type BrowserNotificationPermission,
} from "@/lib/browser-notifications";
import { useT } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingIndicator } from "@/components/loading-indicator";
import { UserAvatar } from "@/components/user-avatar";

export default function AccountPage() {
  const router = useRouter();
  const { locale, t } = useT();
  const { toast } = useToast();
  const user = useAppUser();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notifyPermission, setNotifyPermission] =
    useState<BrowserNotificationPermission>("default");
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);

  useEffect(() => {
    // Read browser-only state after mount to avoid hydration mismatches.
    setNotifyPermission(getNotificationPermission());
    let active = true;
    void Promise.all([
      getBrowserPushSubscription().catch(() => null),
      apiClient.getPushSubscriptionStatus().catch(() => null),
    ])
      .then(([subscription, status]) => {
        if (!active) return;
        const enabled =
          status?.enabled ??
          (Boolean(subscription) && hasBrowserNotificationsPreference(user.id));
        setNotifyEnabled(enabled);
        if (!enabled) {
          setBrowserNotificationsPreference(false, user.id);
        }
      })
      .catch(() => {
        if (active) {
          setNotifyEnabled(false);
          setBrowserNotificationsPreference(false, user.id);
        }
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  const toggleNotifications = async () => {
    if (notifyBusy) return;
    setNotifyBusy(true);
    try {
      if (notifyEnabled) {
        const subscription = await getBrowserPushSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        await apiClient.deletePushSubscriptions();
        setBrowserNotificationsPreference(false, user.id);
        setNotifyEnabled(false);
        return;
      }

      const result = await requestBrowserNotifications();
      setNotifyPermission(result);
      if (result !== "granted") return;

      const { public_key: publicKey } = await apiClient.getVapidPublicKey();
      const subscription = await registerBrowserPushSubscription(publicKey);
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
        throw new Error("The browser returned an incomplete push subscription");
      }
      await apiClient.savePushSubscription(
        {
          endpoint: serialized.endpoint,
          keys: {
            p256dh: serialized.keys.p256dh,
            auth: serialized.keys.auth,
          },
        },
        locale
      );
      setBrowserNotificationsPreference(true, user.id);
      setNotifyEnabled(true);
    } catch (error) {
      console.warn(
        "[Browser Push Setup Error]:",
        error instanceof Error ? error.name : "UnknownError"
      );
      setNotifyPermission(getNotificationPermission());
      toast("error", t("account.notifyTitle"), t("account.notifyError"));
    } finally {
      setNotifyBusy(false);
    }
  };

  const isConfirmValid = (text: string) => {
    const trimmed = text.trim();
    return trimmed.toUpperCase() === "DELETE" || trimmed === "ลบ";
  };

  const deleteAccount = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      await apiClient.deleteAccount();
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut();
      toast("success", t("account.deleteSuccess"));
      router.replace("/");
    } catch (error) {
      console.warn("[Delete Account Error]:", error);
      toast("error", t("account.deleteError"), t("error.genericDesc"));
      setDeleting(false);
    }
  };

  return (
    <div
      data-testid="account-page-content"
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12"
    >
      <Link
        href="/dashboard"
        prefetch={true}
        aria-label={t("common.back", {}, "กลับ")}
        className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-medium text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
        <span>{t("common.back", {}, "กลับ")}</span>
      </Link>
      <div className="mb-6 sm:mb-8">
        <p className="ui-kicker mb-2">{t("account.kicker", {}, "ข้อมูลบัญชีของคุณ")}</p>
        <h1 className="ui-page-title">{t("account.title", {}, "บัญชีผู้ใช้")}</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          {t("account.subtitle", {}, "จัดการโปรไฟล์และความปลอดภัยของบัญชี")}
        </p>
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
                  <p className="truncate text-xs font-sans text-text-muted sm:text-sm">
                    {user.email}
                  </p>
                  <span className="rounded-md border border-border bg-bg-base px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                    Google OAuth
                  </span>
                </div>
              </div>
            </div>

            <form
              action="/auth/signout"
              method="post"
              className="w-full sm:w-auto lg:hidden"
            >
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-9.5 w-full cursor-pointer gap-2 rounded-lg border-border bg-bg-base/70 text-xs font-semibold text-text transition-all duration-150 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 sm:w-auto"
              >
                <LogOut className="size-3.5" />
                <span>{t("account.signOut", {}, "ออกจากระบบ")}</span>
              </Button>
            </form>
          </div>
        </section>

        {/* Browser notifications */}
        <section className="ui-panel rounded-3xl border border-border bg-bg-surface/70 p-5 shadow-none sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                <Bell className="size-4" />
                {t("account.notifyTitle", {}, "แจ้งเตือนบนเบราว์เซอร์")}
              </h2>
              <p
                id="browser-notifications-description"
                className="mt-1 text-xs leading-relaxed text-text-muted"
              >
                {notifyPermission === "unsupported"
                  ? t(
                      "account.notifyUnsupported",
                      {},
                      "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน"
                    )
                  : notifyPermission === "denied"
                    ? t(
                        "account.notifyDenied",
                        {},
                        "การแจ้งเตือนถูกบล็อก เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์"
                      )
                    : notifyPermission === "install-required"
                      ? t(
                          "account.notifyInstallRequired",
                          {},
                          "บน iPhone/iPad เปิดใน Safari เลือก แชร์ > เพิ่มไปยังหน้าจอโฮม แล้วเปิดจากไอคอนก่อนตั้งค่าการแจ้งเตือน"
                        )
                      : t(
                          "account.notifyDesc",
                          {},
                          "แจ้งเตือนสถานะงานของบัญชีนี้เมื่อสำเร็จ ล้มเหลว หรือถูกบล็อก แม้ปิดเว็บแอปแล้ว"
                        )}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label={t("account.notifyTitle", {}, "แจ้งเตือนบนเบราว์เซอร์")}
              aria-describedby="browser-notifications-description"
              aria-checked={notifyEnabled}
              disabled={
                notifyBusy ||
                (!notifyEnabled &&
                  (notifyPermission === "unsupported" ||
                    notifyPermission === "install-required" ||
                    notifyPermission === "denied"))
              }
              onClick={() => void toggleNotifications()}
              className="group grid size-11 shrink-0 cursor-pointer place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-11 items-center rounded-full border transition-colors duration-200 motion-reduce:transition-none ${
                  notifyEnabled
                    ? "border-primary bg-primary"
                    : "border-border bg-bg-base/70"
                }`}
              >
                <span
                  className={`size-4 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${
                    notifyEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
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
                    {t(
                      "account.dangerDesc",
                      {},
                      "การลบบัญชีจะยกเลิกงานดาวน์โหลดทั้งหมด ลบประวัติ และลบข้อมูลบัญชีออกจากระบบอย่างถาวร ไม่สามารถกู้คืนได้"
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <Label
                  htmlFor="delete-account"
                  className="text-xs font-semibold text-rose-800 dark:text-rose-200"
                >
                  {t(
                    "account.confirmLabel",
                    {},
                    'พิมพ์ "DELETE" หรือ "ลบ" เพื่อยืนยัน'
                  )}
                </Label>
                <Input
                  id="delete-account"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t("account.confirmPlaceholder", {}, "DELETE")}
                  className="h-10 rounded-lg border-rose-500/30 bg-bg-base/60 text-xs text-text placeholder:text-text-dim focus-visible:ring-rose-500/20"
                />
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!isConfirmValid(confirmText) || deleting}
                  onClick={() => setConfirmOpen(true)}
                  className="h-10 w-full rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {deleting ? (
                    <LoadingIndicator
                      label={t("account.deleting", {}, "กำลังลบบัญชี...")}
                    />
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
          description={t(
            "account.dangerDesc",
            {},
            "การลบบัญชีจะยกเลิกงานดาวน์โหลดทั้งหมด ลบประวัติ และลบข้อมูลบัญชีออกจากระบบอย่างถาวร"
          )}
          confirmText={t("common.delete", {}, "ลบ")}
          cancelText={t("queue.cancel", {}, "ยกเลิก")}
          variant="danger"
          onConfirm={() => void deleteAccount()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
