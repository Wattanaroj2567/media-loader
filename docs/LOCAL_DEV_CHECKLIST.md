# Local Development Checklist

Use this checklist when running the generated project locally.

The Agent may guide the user through these checks, but must not ask to see secret values.

---

## Before Running

- [ ] The real project exists in `./media-loader`
- [ ] Dependencies are installed
- [ ] `.env.example` exists
- [ ] The user created local env files manually
- [ ] No real secrets are committed

---

## Frontend Check

From the generated project:

```bash
cd apps/web
pnpm dev
```

Expected:

- Landing page loads
- Dark UI appears
- Login button appears
- No service role key is exposed

---

## Supabase Auth Check

Expected:

- Google login redirects correctly
- Callback returns to the app
- User can reach dashboard
- Unauthenticated user cannot access protected pages

---

## FastAPI Check

```bash
cd apps/api
uvicorn app.main:app --reload
```

Expected:

```text
GET /health → healthy
```

---

## Worker Check

```bash
cd apps/worker
python -m worker.main
```

Expected:

- Worker starts
- Worker can read queued jobs when configured
- Worker does not print secret values
- Worker reports safe status messages

---

## Supabase Data Check

Expected:

- Tables exist
- RLS is enabled
- User can read own data
- User cannot read another user's rows
- Private Storage bucket exists

---

## Safe Env Check Output

Correct output example:

```text
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
DATABASE_URL: OK
No secret values were printed.
```

Do not output actual values.
