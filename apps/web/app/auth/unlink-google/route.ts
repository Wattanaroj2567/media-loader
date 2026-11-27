import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const password =
    body && typeof body === "object" && "password" in body ? body.password : null;
  if (typeof password !== "string" || !password || password.length > 4096) {
    return new Response(null, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return new Response(null, { status: 401 });

    const identities = user.identities;
    if (!identities) return new Response(null, { status: 503 });
    const google = identities.find(({ provider }) => provider === "google");
    if (!google) return new Response(null, { status: 204 });
    if (!user.email || !user.email_confirmed_at || identities.length < 2) {
      return new Response(null, { status: 409 });
    }

    const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
    const { data: proof, error: proofError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password,
    });
    try {
      if (proofError?.status === 429) return new Response(null, { status: 429 });
      if (proofError && (!proofError.status || proofError.status >= 500)) {
        return new Response(null, { status: 503 });
      }
      if (!proof.session || proof.user?.id !== user.id) {
        return new Response(null, { status: 403 });
      }

      const { error: unlinkError } = await supabase.auth.unlinkIdentity(google);
      if (unlinkError?.code === "manual_linking_disabled") {
        return new Response(null, { status: 501 });
      }
      return new Response(null, { status: unlinkError ? 503 : 204 });
    } finally {
      if (proof.session) {
        // Revoke only the temporary password-verification session.
        await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
      }
    }
  } catch {
    return new Response(null, { status: 503 });
  }
}
