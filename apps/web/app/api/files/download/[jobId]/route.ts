import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000"
  ).replace(/\/$/, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบอีกครั้ง" },
      { status: 401 },
    );
  }

  const { jobId } = await context.params;
  const upstream = await fetch(
    `${apiBaseUrl()}/files/download/${encodeURIComponent(jobId)}`,
    {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "ไม่สามารถดาวน์โหลดไฟล์นี้ได้" },
      { status: upstream.status || 502 },
    );
  }

  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type":
      upstream.headers.get("Content-Type") || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["Content-Disposition", "Content-Length", "Accept-Ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
