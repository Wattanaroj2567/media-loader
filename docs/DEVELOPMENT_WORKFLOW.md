# Development Workflow

## Working Principle

The user wants to learn while AI Agents help implement the project.

Agents should explain what they are doing, but must avoid exposing secrets or overcomplicating the process.

---

## Recommended Loop

```text
1. Agent reads AGENTS.md and TODO.md
2. Agent selects the next unchecked task
3. Agent makes a small implementation change
4. Agent explains what changed
5. User adds required keys/settings manually when needed
6. Agent runs validation without printing secrets
7. Agent updates TODO status
8. Agent moves to the next task
```

---

## When Keys Are Needed

Agent must pause implementation and say:

```text
This step needs a key or dashboard setting.
Please follow docs/USER_SETUP_GUIDE.md section X.
Add the value to the local env file or deployment dashboard.
After adding it, tell me "added". I will validate without reading the value.
```

---

## What the User Does

The user is responsible for:

- Creating Supabase project
- Creating Google OAuth credentials
- Adding callback URLs
- Copying keys into `.env.local`
- Adding Vercel environment variables
- Confirming when setup is done

---

## What the Agent Does

The Agent is responsible for:

- Generating code structure
- Writing setup guides
- Creating env templates
- Checking variable presence
- Running health checks
- Reporting safe validation results

---

## Safe Validation Output

Correct:

```text
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
No secret values were printed.
```

Incorrect:

```text
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

## Branching Suggestion

Use simple branches:

```text
main
feature/frontend-foundation
feature/supabase-auth
feature/fastapi-core
feature/worker-core
feature/history-page
```

---

## Commit Style

Use clear commits:

```text
feat(web): add dark dashboard shell
feat(api): add media analyze endpoint
feat(worker): add queued job polling
chore(supabase): add download job schema
```


---

## Output Directory Rule

The AI Agent must generate the real project inside `./media-loader`.

Do not place implementation files directly in the work package root. The work package root is reserved for planning documents, prompts, examples, and setup references.

Before Phase 0 starts, verify:

```text
Current directory: media-loader-agent-workpack
Implementation target: ./media-loader
```


---

## Docker backend workflow

When backend phases begin, the Agent must use Docker Compose as the default runtime.

Expected commands:

```bash
docker compose up --build
curl http://localhost:8000/health
```

Do not instruct the user to deploy the backend to Vercel. Vercel is for the Next.js frontend only.
