# Server setup (linkedinflow.duckdns.org)

## Fix 503 "Server misconfigured" on admin login

Admin login needs Supabase. On the server, set these in **backend/.env**:

1. SSH in:
   ```bash
   ssh -i "path/to/postpilot.pem" ubuntu@13.215.254.246
   ```

2. Edit backend env:
   ```bash
   cd ~/linkedin-saas
   nano backend/.env
   ```

3. Ensure these exist (get values from [Supabase Dashboard](https://supabase.com/dashboard) → your project → Settings → API):
   ```
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key
   ```

4. Restart the backend so it picks up env:
   ```bash
   pm2 restart postpilot-backend
   ```

5. Try admin login again: http://linkedinflow.duckdns.org/admin/login

## Full backend .env

Copy from `backend/.env.example` and set at least:

- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (required for admin panel and app DB)
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
- `FRONTEND_URL` / `BACKEND_URL` (use `http://linkedinflow.duckdns.org` and backend URL)
- `GROQ_API_KEY` (for automation)
- `ADMIN_API_KEY` (optional fallback if admins table is used)
- SMTP vars if you use email (approval, invoices, etc.)
