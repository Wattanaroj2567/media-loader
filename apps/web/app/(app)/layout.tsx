import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Retrieve public profile info
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const sidebarUser = {
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    email: profile?.email || user.email || "",
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar user={sidebarUser} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

