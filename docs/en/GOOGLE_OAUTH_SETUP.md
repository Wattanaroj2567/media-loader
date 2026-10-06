# Google OAuth Setup Guide

> **Language:** **English** · [ภาษาไทย](../th/GOOGLE_OAUTH_SETUP.md)

Configure Google as a sign-in provider through Supabase Auth. The Google OAuth
callback terminates at Supabase; Supabase then redirects back to the Media
Loader application.

---

## Goal

Allow users to sign in to the Next.js application with Google through Supabase
Auth, without placing Google credentials in browser code.

---

## Step 1 — Open Google Auth Platform

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select the Google Cloud project for Media Loader.
3. Open **Google Auth Platform** in the console navigation.

The current Google setup uses the Google Auth Platform sections for Branding,
Audience, Data Access, and Clients. See Google's
[Sign in with Google setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

---

## Step 2 — Configure the Audience and Consent Screen

- In **Branding**, enter an app name and a support email that identify the
  project. Add other requested details shown by Google.
- In **Audience**, choose the audience that matches the intended users. While
  the app is in Testing, add each allowed Google account as a test user.
- In **Data Access**, request only the profile scopes needed for sign-in:
  `openid`, `email`, and `profile`.

Testing mode is suitable for development and limits sign-in to listed test
users. Follow Google's current publishing and verification requirements before
allowing a broader audience.

---

## Step 3 — Create a Web OAuth Client

1. Open **Clients** and create an OAuth client.
2. Choose **Web application** as the application type.
3. Give the client a recognizable name, such as `Media Loader Web`.
4. In **Authorized redirect URIs**, add the callback URL shown by the Google
   provider settings in Supabase. It has this form:

   ```text
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

This is Google's redirect destination for the provider flow. The application's
`/auth/callback` URL is configured separately in Supabase in Step 5.

---

## Step 4 — Add the Client Credentials to Supabase

Google provides a **Client ID** and **Client Secret**. In Supabase Dashboard,
open **Authentication** → **Providers** → **Google**, enable the provider, and
enter both values. See the official
[Supabase Google sign-in guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

Never put the Google Client Secret in frontend variables, repository files, or
public logs.

---

## Step 5 — Configure Application Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- Set **Site URL** to the deployed frontend origin for production, such as
  `https://your-domain.vercel.app`.
- Add the local callback to **Redirect URLs**:
  `http://localhost:3000/auth/callback`.
- Add the production callback to **Redirect URLs**:
  `https://your-domain.vercel.app/auth/callback`.

Use the exact frontend domain and callback path. Supabase documents this list in
its [Redirect URLs guide](https://supabase.com/docs/guides/auth/redirect-urls).

---

## Step 6 — Verify Sign-in

1. Start the frontend with `pnpm dev:web`.
2. Open `http://localhost:3000` and choose **Sign in with Google**.
3. Confirm that Google returns through Supabase to `/auth/callback` and the app
   opens the dashboard.
4. Repeat with the deployed frontend after configuring the production URLs.
