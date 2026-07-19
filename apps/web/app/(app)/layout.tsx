import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/app-shell";
import { GlobalJobNotifier } from "@/components/global-job-notifier";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const navUser = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: profile?.email || user.email || "",
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  };

  return (
    <AppShell user={navUser}>
      <GlobalJobNotifier />
      {children}
    </AppShell>
  );
}
