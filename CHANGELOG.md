# Changelog

High-level summary of Media Loader's commit history from the initial commit on 2026-07-05 through `HEAD` on 2026-11-09. The repository has no release tags, so historical entries use ISO date ranges rather than invented versions. Change categories follow [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/); merge commits and routine dependency updates are consolidated.

## [Unreleased]

### Added

- Added workspace skills in `.agents/skills/`: `taste-skill` for frontend design taste and art direction, `systematic-debugging` for root-cause diagnosis, `verification-before-completion` for evidence-based verification, `security-audit` for repository security reviews, and `skill-creator` for managing project skills.

### Changed

- Configured path filtering in `.github/workflows/codeql.yml` with `paths-ignore` for markdown documentation (`*.md`, `docs/**`) and skill files (`.agents/**`), skipping CodeQL scans on non-code changes.
- Documented CI path filtering behavior in `docs/AGENT_GUIDELINES.md`.
- Optimized Continuous Integration workflow in `.github/workflows/ci.yml` with path filtering via `dorny/paths-filter`: skips heavy Next.js build, Python test suites, and Docker builds on both pull requests and `master` pushes that modify only documentation or non-code files, while maintaining passing status for required checks.
- Documented pull request requirements in `docs/AGENT_GUIDELINES.md`: require CLI descriptions via `--body-file`, mandatory labels, author assignment, and CI/CD validation before merge.
- Updated `AGENTS.md` and `docs/AGENT_GUIDELINES.md` to reference the newly added workspace skills.
- Disabled Dependabot monthly version updates across all package ecosystems, restricting automated PRs to security advisories only.
- Consolidated routine dependency updates for Next.js 16.4.5, Supabase JS 2.119.0, Lucide React 1.70.0, and updated lockfile.
- Adopted GitHub Flow, standardizing on `master` with short-lived PR branches and retargeting CI, CodeQL, and Dependabot workflows from `develop` to `master`.

## 2026-11-09

### Changed

- Replace redundant Tailwind arbitrary widths and scale values with equivalent utilities; preserve the hero's unitless line height with a documented exception for an invalid lint suggestion.
- Match the mobile back-to-top button placement on legal, contact, and how-it-works pages to the signed-out landing page.
- Enable warnings for unnecessary Tailwind CSS arbitrary values in the existing web lint command.

### Fixed

- Extend the legal-page sidebar's sticky boundary through the footer and give contents more width to reduce wrapping, using normal page scrolling without a separate contents scrollbar.
- Keep Privacy and Terms table-of-contents selection aligned with clicked headings during smooth scrolling and at the page end; resume tracking on manual scrolling and history navigation, respect reduced motion, and remeasure the active indicator when the contents layout changes.

## 2026-11-03–2026-11-06

### Added

- Added an advanced CodeQL workflow for GitHub Actions, JavaScript/TypeScript, and Python on pull requests to `develop` and `master`, production pushes, and a weekly schedule.
- Added this curated history of notable project changes.
- Added detailed agent guidance in `docs/AGENT_GUIDELINES.md` and shared `CLAUDE.md` and `GEMINI.md` entry points that import `AGENTS.md`.

### Security

- Updated vulnerable transitive dependencies, including the Drizzle loader's esbuild, TypeScript tooling's minimatch, and packages with high or critical advisories, to patched compatible releases.
- Removed the privileged Dependabot lockfile sync workflow that checked out and executed pull request code.
- Generate guest session identifiers only with cryptographic randomness, match media hosts by hostname boundaries, validate the local auth test redirect, and restrict CI token permissions to read-only contents access.

### Changed

- Make the mobile home top bar opaque and add mobile back-to-top controls to policy, how-it-works, and contact pages.
- Align the mobile download and history header with the account page's solid, sticky theme background to improve iOS status-bar consistency.
- Run CI on pull requests and pushes to `master`, avoiding duplicate runs on pushes to `develop`.
- Allow Vercel deployments to build without a Git-diff ignore command so skipped deployments do not leave production stale.
- Sync the mobile browser theme color with the selected light or dark theme, add press feedback to interactive controls on touchscreens, and cover public and account pages with mobile theme checks.
- Require each project-changing task to update `CHANGELOG.md` in the same task before completion.
- Streamlined the root `AGENTS.md` and linked to detailed, task-specific project guidance.
- Set `develop` as the ongoing integration branch and `master` as the release branch; aligned CI and Dependabot version-update/lockfile-sync branch targets.
- Clarified that standard build, test, and development commands may load environment files automatically when required, while agents must not inspect or expose their values; documented Next.js `NEXT_PUBLIC_` exposure.

### Removed

- Removed the workspace `banner-design`, `brand`, `design`, `design-system`, and `slides` skills; UI implementation and UX remain covered by `ui-styling` and `ui-ux-pro-max`.
- Removed editable architecture-diagram HTML/SVG source files while retaining the published bilingual PNG diagrams referenced by the READMEs.

## 2026-11-02

### Added

- Added resource limits for API metadata reads and media download subprocesses, with tests for worker watchdog cleanup and thumbnail fallback behavior.
- Added bilingual architecture illustrations and documentation for metadata response limits and responsive thumbnails.

### Changed

- Refined responsive authentication flows, shared navigation, progress feedback, and scroll controls. Preserved auth state across viewport changes and improved return navigation and focus behavior.
- Updated recurring maintenance workflows and patched vulnerable Brotli dependencies; refreshed related runtime and development dependencies.

## 2026-10-20–2026-11-01

### Added

- Added localized legal pages and account authentication flows; required accounts for media jobs.
- Added Web Push subscription storage, authenticated subscription management, worker completion alerts, and user-facing background job notifications.

### Changed

- Improved mobile downloader, history selection, queue cards, media viewer controls, save notifications, and startup performance.
- Deferred inactive locale messages and ignored stale locale loads to reduce unnecessary work and prevent outdated translations from rendering.
- Isolated Web Push secrets in deployment configuration and documented setup.

## 2026-10-05–2026-10-14

### Added

- Added app branding and logo usage across the web UI, public repository policies, and an MIT license.
- Encrypted stored URLs and routed media egress through an SSRF proxy.
- Added resumable mobile save-to-photos with progress feedback.

### Changed

- Added dependency automation and lockfile synchronization; expanded CI to check documentation changes and refined deployment build triggers.
- Improved tablet navigation, exposed raw video frame height alongside quality tiers, refreshed setup and policy documentation, and standardized formatting and line endings.

## 2026-09-18–2026-09-22

### Added

- Moved backend access behind Cloudflare Tunnel.
- Added guest download persistence and completed the cross-platform analysis, job-processing, worker lifecycle, and guest queue UI flows.

### Changed

- Aligned repository tooling and documentation CI, and updated deployment and architecture documentation for the Cloudflare Tunnel setup.

## 2026-08-30

### Added

- Added Oracle Cloud setup, keep-alive, Cloud Shell auto-creation, and automated Ampere A1 provisioning tools.
- Added architecture diagram assets and redesigned the diagram for readability and dark-mode support.

### Changed

- Updated deployment architecture to OCI and Vercel and removed Railway deployment references.
- Centralized job polling and user context, modernized the app shell and queue controls, and added production test scripts and cache headers.

## 2026-08-10–2026-08-13

### Added

- Added Playwright end-to-end coverage for core web flows, History, and Settings; added API rate limiting and Python integration tooling.
- Added thumbnail downloads, smart URL paste, richer media quality details, policy status notifications, and improved browser-based media delivery feedback.
- Added mobile sharing and file-saving actions, plus higher-quality audio output.

### Changed

- Reworked the responsive app shell, navigation, analyzer, history, settings, media cards, format selection, themes, lightbox, dialogs, and notifications across mobile and desktop.
- Adopted Drizzle for database schema management and removed the unused `media_formats` table and obsolete environment variables.
- Standardized local development with one `pnpm dev` command and aligned Node.js and pnpm versions across CI and deployment.

### Fixed

- Improved API fallback behavior for missing impersonation targets and corrected CORS handling for Private Network Access.
- Fixed session-expiry polling, mobile download and save behavior, horizontal overflow, and several responsive interaction and rendering issues.

## 2026-07-19

### Changed

- Simplified the media loading flow and refreshed the app UI.

### Fixed

- Prevented prefetched sign-out requests from ending the user's session unexpectedly.

## 2026-07-05–2026-07-06

### Added

- Established the initial monorepo foundation for the Next.js web app, FastAPI backend, Python media worker, and Supabase database.
- Added Google OAuth, route guards, database triggers, schema migrations, and row-level security policies.
- Added Docker Compose and initial Vercel and Railway deployment configuration.
- Added the agent configuration and project documentation structure.

### Changed

- Rebuilt the frontend app shell with internationalization and shared components; added the first API and worker services.
- Refined CORS support for Private Network Access and fixed worker job-status error handling.
