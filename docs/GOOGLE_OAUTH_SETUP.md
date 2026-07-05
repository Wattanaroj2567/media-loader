# Google OAuth Setup

This guide explains how the human user should configure Google login for Supabase Auth.

The Agent must explain the steps but must never ask the user to paste Google Client Secret into chat.

---

## Goal

Enable Google login through Supabase Auth so the Next.js app can authenticate the user without building a custom auth system.

---

## Step 1 — Open Google Cloud Console

1. Go to Google Cloud Console
2. Create a new project or select an existing project
3. Open **APIs & Services**
4. Open **OAuth consent screen**

---

## Step 2 — Configure OAuth Consent Screen

Recommended for learning/personal use:

- App name: `Media Loader`
- User support email: your own email
- Developer contact email: your own email
- Publishing status: Testing is fine for local development

Add your Google account as a test user if the app is still in testing mode.

---

## Step 3 — Create OAuth Client

1. Go to **Credentials**
2. Click **Create Credentials**
3. Select **OAuth client ID**
4. Choose **Web application**
5. Name it `Media Loader Web`

---

## Step 4 — Add Authorized Redirect URI

In Supabase, open:

```text
Authentication → Providers → Google
```

Copy the callback URL shown by Supabase and paste it into Google OAuth authorized redirect URIs.

Common Supabase callback format:

```text
https://<your-project-ref>.supabase.co/auth/v1/callback
```

Use the exact value shown in your Supabase dashboard.

---

## Step 5 — Add Google Values to Supabase

Google will show:

```text
Client ID
Client Secret
```

Paste both values directly into:

```text
Supabase Dashboard → Authentication → Providers → Google
```

Do not paste Client Secret into chat.

---

## Step 6 — Configure App Redirect URLs in Supabase

Open Supabase:

```text
Authentication → URL Configuration
```

Add local callback URL:

```text
http://localhost:3000/auth/callback
```

Add production callback URL after deploying to Vercel:

```text
https://your-vercel-domain.vercel.app/auth/callback
```

---

## Safe Agent Validation

After the user says setup is done, the Agent may check only behavior:

```text
Google provider enabled: OK
Local callback configured: OK
Production callback configured: Pending or OK
Login button redirects to Google: OK
```

The Agent must not display Client ID or Client Secret values.
