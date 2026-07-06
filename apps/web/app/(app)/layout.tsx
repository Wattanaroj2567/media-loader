import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopNav } from "@/components/top-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex min-h-dvh flex-col">
      <TopNav user={navUser} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
