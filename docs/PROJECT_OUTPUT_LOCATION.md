# Project Output Location

This work package is a planning and instruction package for AI Agents.

The real application code must be created in a separate child directory named:

```text
./media-loader
```

Do not mix generated application code with the work package documents.

---

## Required Layout

After implementation starts, the folder should look like this:

```text
media-loader-agent-workpack/
├─ README.md
├─ AGENTS.md
├─ TODO.md
├─ docs/
├─ prompts/
├─ supabase/
├─ examples/
├─ scripts/
└─ media-loader/              # Generated real project code goes here
   ├─ apps/
   │  ├─ web/                 # Next.js app
   │  ├─ api/                 # FastAPI service
   │  └─ worker/              # Python media worker
   ├─ supabase/
   ├─ packages/
   ├─ scripts/
   ├─ README.md
   ├─ AGENTS.md
   ├─ TODO.md
   ├─ .env.example
   └─ package.json
```

---

## Agent Rule

Before creating files, the AI Agent must confirm the current working directory and then create the implementation project under `./media-loader`.

The Agent must not create `apps/`, `package.json`, `.env.example`, or source code files directly at the work package root unless the user explicitly changes the output directory.

---

## User Prompt to Start Implementation

Use this prompt when handing the work package to an AI coding agent:

```text
Read AGENTS.md, TODO.md, WORKTREE_STRUCTURE.md, and docs/PROJECT_OUTPUT_LOCATION.md.
Create the real implementation project inside ./media-loader only.
Start with Phase 0 from TODO.md.
Do not create source code directly in the work package root.
Do not touch or print secrets.
Create placeholder .env.example files only.
```

---

## Verification

After Phase 0, the Agent should report:

```text
Implementation directory: ./media-loader
Work package docs preserved: OK
Generated project structure created: OK
No real secrets created or printed: OK
```
