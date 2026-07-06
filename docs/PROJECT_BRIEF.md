# Project Brief

## Product Name

Media Loader

## One-Line Pitch

A personal, rights-aware media downloader and converter for URLs the user is allowed to access — built to use every day, not to study frameworks.

## Problem

Users often have media URLs they are allowed to access, but downloading, converting, organizing, and tracking those files is messy. Many downloader tools also ignore rights, safety, and security concerns.

## Solution

A private web application that:

- Lets the user sign in with Google
- Accepts a media URL
- Checks whether it is safe and allowed to process
- Shows available media formats when supported
- Lets the user choose video/audio quality
- Processes the job through a separate worker
- Stores output files securely (local temp by default)
- Keeps a private download history

## Primary User

One owner using the app for **real personal workflows**: save allowed media, convert to MP4/MP3, and review past jobs from any device after login.

## Product Values

- Simple over complex
- Safe over aggressive
- Transparent over magical
- **Reliable over experimental**
- Private by default
- Dark modern interface
- **Ship what you use** — prioritize worker, downloads, and history over demo polish

## Out of Scope

- Public multi-user SaaS
- Payment system
- Admin panel
- Browser extension
- Mobile app
- DRM bypass
- Private platform scraping
- Cookie-based restricted download
- Unrestricted YouTube/Facebook/TikTok/Instagram downloader behavior

## Target for Daily Use

The app is "ready for daily use" when the owner can:

1. Sign in with Google
2. Analyze an allowed URL and pick a format
3. Queue a job and see it progress through the worker
4. Save the finished file from history through the browser/Explorer dialog
5. Cancel/delete queued jobs and delete past history
6. Run frontend + Docker backend locally (or frontend on Vercel + backend at home)

Current gap: production deployment checks require the user's actual Vercel/Supabase environment. See `TODO.md`.

## Initial MVP (technical baseline)

- Google login
- Dashboard
- Direct media URL analysis
- Policy check
- Job creation
- Download history
- Worker architecture
- Basic MP4/MP3 processing path
- Local temporary output by default; optional Supabase Storage only for future/cloud mode
