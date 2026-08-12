// Minimal mock Supabase auth/rest server for e2e tests.
// Handles enough of the @supabase/ssr surface so that BOTH the Next.js
// server layout and the browser client see a signed-in user.
import http from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 9999);

const fakeUser = {
  id: "user-test-1",
  aud: "authenticated",
  role: "authenticated",
  email: "tester@example.com",
  app_metadata: { provider: "google" },
  user_metadata: { full_name: "Test User" },
};

function fakeJwt() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: fakeUser.id,
    aud: "authenticated",
    role: "authenticated",
    exp: now + 7200,
    iat: now,
    email: fakeUser.email,
  });
  return `${header}.${payload}.fakesignature`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  console.log(`[mock-supabase] ${req.method} ${url.pathname}`);
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (url.pathname === "/auth/v1/health") {
    return send(200, {});
  }
  if (url.pathname === "/auth/v1/user") {
    return send(200, fakeUser);
  }
  if (url.pathname === "/auth/v1/token") {
    return send(200, {
      access_token: fakeJwt(),
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "mock-refresh-token",
      user: fakeUser,
    });
  }
  if (url.pathname === "/auth/v1/logout") {
    return send(204, {});
  }
  if (url.pathname.startsWith("/rest/v1/profiles")) {
    return send(200, []);
  }
  return send(404, { message: "not mocked" });
});

server.listen(PORT, () => {
  console.log(`[mock-supabase] listening on http://localhost:${PORT}`);
});
