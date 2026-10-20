import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: "signout_failed" }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "signout_failed" }, { status: 503 });
  }

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, 303);
}
