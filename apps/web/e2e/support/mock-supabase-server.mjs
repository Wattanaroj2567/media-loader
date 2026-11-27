// Isolated Supabase public auth mock. Request logs contain paths only.
import http from "node:http";
const PORT = Number(process.env.MOCK_SUPABASE_PORT || 9999);
const fakeUser = {
  id: "user-test-1",
  aud: "authenticated",
  role: "authenticated",
  email: "tester@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  identities: [{ provider: "google" }],
  app_metadata: { provider: "google" },
  user_metadata: { full_name: "Test User" },
};
function fakeJwt() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: fakeUser.id, aud: "authenticated", role: "authenticated", exp: now + 7200, iat: now, email: fakeUser.email })}.fakesignature`;
}
function session(user = fakeUser) {
  return {
    access_token: fakeJwt(),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token",
    user,
  };
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  console.log(`[mock-supabase] ${req.method} ${url.pathname}`);
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
  const send = (status, body) => {
    res.writeHead(status, headers);
    res.end(
      status === 204
        ? undefined
        : JSON.stringify(body?.code ? { ...body, error_code: body.code } : body)
    );
  };
  if (req.method === "OPTIONS") return send(204, {});
  let body = {};
  if (req.method === "POST" || req.method === "PUT") {
    let data = "";
    for await (const chunk of req) data += chunk;
    try {
      body = JSON.parse(data || "{}");
    } catch {
      return send(400, { code: "bad_json", message: "Invalid request" });
    }
    // Never retain, compare, or log password fixtures.
    delete body.password;
  }
  if (url.pathname === "/auth/v1/health") return send(200, {});
  if (url.pathname === "/auth/v1/user") {
    if (
      !req.headers.authorization ||
      req.headers.authorization.includes("expired-fixture")
    )
      return send(401, { code: "session_not_found", message: "Invalid session" });
    const claims = req.headers.authorization.split(".")[1];
    let subject;
    try {
      subject = JSON.parse(Buffer.from(claims ?? "", "base64url").toString()).sub;
    } catch {
      // Other fixtures may use opaque authorization values.
    }
    if (subject === "user-settings-email-only" || subject === "user-settings-linked") {
      const linked = subject === "user-settings-linked";
      const providers = linked ? ["email", "google"] : ["email"];
      return send(200, {
        ...fakeUser,
        id: subject,
        app_metadata: { provider: "email", providers },
        identities: providers.map((provider) => ({ provider })),
      });
    }
    return send(200, fakeUser);
  }
  if (url.pathname === "/auth/v1/token") {
    if (body.auth_code === "invalid-code")
      return send(400, { code: "bad_code_verifier", message: "Invalid exchange" });
    if (url.searchParams.get("grant_type") === "password") {
      if (body.email === "invalid@example.com")
        return send(400, {
          code: "invalid_credentials",
          message: "RAW_PRIVATE_ERROR mock-sensitive-marker",
        });
      if (body.email === "unconfirmed@example.com")
        return send(400, { code: "email_not_confirmed", message: "Email unconfirmed" });
      if (body.email === "rate@example.com")
        return send(429, {
          code: "over_request_rate_limit",
          message: "Too many attempts",
        });
    }
    return send(200, session());
  }
  if (url.pathname === "/auth/v1/signup") {
    const confirmed = body.email === "confirmed@example.com";
    const user = {
      ...fakeUser,
      email: body.email,
      email_confirmed_at: confirmed ? fakeUser.email_confirmed_at : undefined,
      identities: [{ provider: "email" }],
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: body.data || {},
    };
    if (confirmed) return send(200, session(user));
    return send(200, user);
  }
  if (url.pathname === "/auth/v1/resend" && req.method === "POST") {
    return send(200, {});
  }

  if (url.pathname === "/auth/v1/recover") {
    if (body.email === "unknown@example.com")
      return send(404, { code: "user_not_found", message: "No account" });
    if (body.email === "rate@example.com")
      return send(429, { code: "over_email_send_rate_limit", message: "Rate limited" });
    return send(200, {});
  }
  if (url.pathname === "/auth/v1/logout") return send(204, {});
  if (url.pathname === "/auth/v1/authorize") {
    const redirectTo = url.searchParams.get("redirect_to");
    let redirectUrl;
    try {
      redirectUrl = new URL(redirectTo || "");
    } catch {
      return send(400, { code: "invalid_redirect", message: "Invalid redirect" });
    }
    if (redirectUrl.origin !== "http://localhost:3100") {
      return send(400, { code: "invalid_redirect", message: "Invalid redirect" });
    }
    redirectUrl.searchParams.set("code", "mock-code");
    res.writeHead(302, {
      ...headers,
      Location: redirectUrl.toString(),
    });
    return res.end();
  }
  if (url.pathname.startsWith("/rest/v1/profiles")) return send(200, []);
  return send(404, { message: "not mocked" });
});
server.listen(PORT, () =>
  console.log(`[mock-supabase] listening on http://localhost:${PORT}`)
);
