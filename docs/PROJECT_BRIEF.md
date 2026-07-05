# Project Brief

## Product Name

Media Loader

## One-Line Pitch

A personal, rights-aware media downloader and converter for URLs the user is allowed to access.

## Problem

Users often have media URLs they are allowed to access, but downloading, converting, organizing, and tracking those files is messy. Many downloader tools also ignore rights, safety, and security concerns.

## Solution

Build a private web application that:

- Lets the user sign in with Google
- Accepts a media URL
- Checks whether it is safe and allowed to process
- Shows available media formats when supported
- Lets the user choose video/audio quality
- Processes the job through a separate worker
- Stores output files securely
- Keeps a private download history

## Primary User

The project is built for one user who wants to learn modern web development and use AI Agents to help build the project.

## Product Values

- Simple over complex
- Safe over aggressive
- Transparent over magical
- Learnable over over-engineered
- Private by default
- Dark modern interface

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

## Initial MVP

The MVP should support:

- Google login
- Dashboard
- Direct media URL analysis
- Policy check
- Job creation
- Download history
- Supabase Storage integration
- Worker architecture
- Basic MP4/MP3 processing path
