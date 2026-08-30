import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/app-shell";
import { AppUserProvider } from "@/components/app-user-context";
import { GlobalJobNotifier } from "@/components/global-job-notifier";
import { JobPollingProvider } from "@/components/job-polling-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const navUser = {
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar_url:
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      user.user_metadata?.avatarUrl ||
      "",
  };

  return (
    <AppUserProvider user={navUser}>
      <JobPollingProvider>
        <AppShell user={navUser}>
          <GlobalJobNotifier />
          {children}
        </AppShell>
      </JobPollingProvider>
    </AppUserProvider>
  );
}
