# Testing Plan

## Test Categories

- Environment checks
- Auth checks
- Supabase RLS checks
- API checks
- Policy checks
- Worker checks
- UI checks
- Security checks

---

## Environment Tests

- Required env variables exist
- Secret values are not printed
- Frontend only uses public env variables
- Backend can connect to Supabase
- Worker can connect to Supabase server-side

---

## Auth Tests

- User can sign in with Google
- User can sign out
- Dashboard is protected
- Unauthenticated users are redirected
- Profile row is created after login

---

## RLS Tests

- User can read own profile
- User cannot read another user's jobs
- User can insert own download job
- User cannot insert job for another user
- User can delete own history

---

## Policy Tests

- Direct `.mp4` URL can be allowed when safe
- `file://` URLs are blocked
- `localhost` URLs are blocked
- Private IP URLs are blocked
- Unsupported platform URLs are blocked or marked unsupported
- Need-confirmation cases require `rights_confirmed=true`

---

## API Tests

- `/health` returns healthy
- `/media/analyze` validates request body
- `/media/analyze` returns policy result
- `/downloads` creates queued job
- `/downloads/{id}` returns only owner's job
- Signed URL endpoint only works for completed owned jobs

---

## Worker Tests

- Worker picks queued job
- Worker locks job safely
- Worker updates status
- Worker handles failure
- Worker cleans temp files
- Worker uploads completed file
- Worker does not log secrets

---

## UI Tests

- Landing page looks clean
- Login button works
- Dashboard layout is responsive
- URL form validates input
- Policy warnings are visible
- Format selection is readable
- Progress states are clear
- History page is usable on mobile and desktop
- No emoji icons are used

---

## Final Review Checklist

- [ ] No secrets in git
- [ ] No service role in frontend
- [ ] RLS enabled on user-owned tables
- [ ] Policy check before download
- [ ] Worker separated from frontend
- [ ] UI follows dark modern guide
- [ ] README updated
- [ ] Setup guide updated
- [ ] Local development checklist reviewed
- [ ] TODO completed or clearly marked


---

## Docker backend tests

- [ ] `docker compose config` passes
- [ ] `docker compose up --build` starts API and worker services
- [ ] `curl http://localhost:8000/health` returns `{"status":"ok"}`
- [ ] API logs do not print secrets
- [ ] Worker logs do not print secrets
- [ ] Temporary media directory is mounted and ignored by Git
- [ ] Vercel frontend does not include service role keys
