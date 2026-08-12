# Secrets Protocol

This project uses a strict secret-handling protocol.

The AI Agent must guide the user, but must not see secret values.

---

## Main Rule

The user owns the keys.

The Agent only explains where to get them, where to put them, and how to verify the connection safely.

---

## Agents May Do

- Create `.env.example`
- Explain how to create `.env.local`
- Explain where to get Supabase URL and keys
- Explain where to configure Google OAuth
- Explain where to add Vercel environment variables
- Check if env variables exist
- Run safe connection checks
- Report `OK`, `Missing`, or `Invalid`

---

## Agents Must Not Do

- Ask the user to paste secrets into chat
- Print secret values
- Show the contents of `.env.local`
- Commit `.env.local`
- Put service role key in frontend
- Put client secret in browser code
- Log signed download URLs if optional cloud mode is enabled
- Log JWTs or access tokens

---

## Correct User Setup Flow

```text
1. Agent creates .env.example
2. Agent tells user to copy it to .env.local
3. Agent explains where to get each key
4. User adds key locally
5. User says "added"
6. Agent runs validation script
7. Agent reports safe status only
```

---

## Safe Validation Output

Correct:

```text
Environment Check

NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
FASTAPI_BASE_URL: OK
WORKER_SECRET: OK

No secret values were printed.
```

Incorrect:

```text
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Masking Rule

If a value must be shown for debugging, show only a mask:

```text
SUPABASE_SERVICE_ROLE_KEY: eyJh...9xQw
```

Prefer not showing any part of the value.

---

## Secret Placement

### Browser-safe public variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

### Server/worker-only secrets

```env
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
WORKER_SECRET=
```

### Google OAuth

If using Supabase Auth, Google OAuth values are normally entered in the Supabase dashboard, not exposed in the frontend.

---

## Git Rule

Real env files must be ignored:

```gitignore
.env
.env.local
.env.*.local
```

Only `.env.example` should be committed.
