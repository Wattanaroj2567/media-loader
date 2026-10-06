# Secrets Protocol

> **Language:** **English** · [ภาษาไทย](../th/SECRETS_PROTOCOL.md)

This project follows a strict secret-handling protocol. The user owns and enters
secret values; agents may explain setup and verify configuration without seeing
or printing those values.

---

## Main Rule

Agents explain where to obtain credentials, where to configure them, and how to
check their presence safely. Never ask users to paste secret values into chat.

---

## Agents May

- Explain how to create a local `.env.local` from the provided example.
- Explain where to configure Supabase and Google OAuth credentials.
- Explain where to configure deployment environment variables.
- Check whether required environment variable names are present.
- Run approved connection or configuration checks that do not reveal values.
- Report only safe statuses such as `OK`, `Missing`, or `Invalid`.

## Agents Must Not

- Read, print, edit, or commit `.env` files or other credential stores.
- Ask the user to paste credentials into chat.
- Print secret values in command output, logs, or generated artifacts.
- Put a Supabase service-role key or OAuth client secret in browser code or
  `NEXT_PUBLIC_` variables.
- Log JWTs, access tokens, tunnel tokens, or signed download URLs.

---

## Safe Setup Flow

1. The user copies the example environment file to `.env.local`.
2. The user obtains and enters credentials locally or in the relevant provider
   dashboard.
3. The user confirms that setup is ready without sharing credential values.
4. An agent may run `pnpm check-env` and report only the variable statuses.

---

## Safe Validation Output

Acceptable output reports status only:

```text
Environment Check
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
WORKER_SECRET: OK
No secret values were printed.
```

Never print assignments or partial credential values. Masking a value is not
necessary for routine checks and should be avoided.

`pnpm check-env` verifies that its required variable names are present and
performs a simple public-variable pattern check. It does not inspect the built
frontend bundle and is not proof that a secret was never bundled.

---

## Secret Placement

### Browser-visible configuration

Only public configuration belongs in variables prefixed with `NEXT_PUBLIC_`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

### Backend-only credentials

Keep Supabase service credentials and other private runtime configuration on
the API/worker host. `SUPABASE_SERVICE_ROLE_KEY` must never be set in the Vercel
frontend project.

`DATABASE_URL` is used by Drizzle Kit tooling and should be supplied only to the
environment that runs those commands. The current `WORKER_SECRET` is checked
by `pnpm check-env`, but application code does not currently use it for worker
authentication. Do not treat setting it as enabling authentication.

Google OAuth Client ID and Client Secret are configured in the Supabase Auth
provider dashboard. Do not put the Client Secret in frontend configuration or
repository files.

See [Environment Variables](ENVIRONMENT_VARIABLES.md) for the current variable
inventory and [Vercel Setup](VERCEL_SETUP.md) for frontend deployment.

---

## Git Rule

Never commit real environment files or credential values. The repository
ignores local environment files; commit only placeholder templates such as
`.env.example` after checking that they contain no real credentials.
