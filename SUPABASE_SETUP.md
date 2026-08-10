# Connect the app to Supabase (cloud data)

Your project URL: **https://lnzklhlwkiyuodoglhus.supabase.co**

The app runs in two modes automatically:
- **Local mode** (no keys) — data stays in one browser. Demo logins work.
- **Cloud mode** (keys set) — real email/password login, data saved to Supabase and synced across devices.

Follow these 5 steps to switch to cloud mode.

---

## 1. Create the table (one time)
1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - This creates a `workspaces` table and Row-Level Security so each user only sees their own data.

## 2. Get your API keys
1. Go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
   - ⚠️ Use the **anon public** key only. Never use or share the **service_role** key or the database password.

## 3. Create your `.env` file
In the project folder `D:\Venus_Egg_Traders`, make a file named exactly **`.env`** (copy from `.env.example`) containing:

```
VITE_SUPABASE_URL=https://lnzklhlwkiyuodoglhus.supabase.co
VITE_SUPABASE_ANON_KEY=paste-your-anon-public-key-here
```

(`.env` is git-ignored, so your key is never pushed to GitHub.)

## 4. Create your login user
1. In Supabase → **Authentication → Users → Add user**.
2. Enter an email + password and tick **Auto Confirm User**.
3. This is the email/password you'll sign in with in the app.

## 5. Restart the app
```bash
npm run dev
```
The login screen now says **"☁️ Connected to Supabase"**. Sign in with the user from step 4. On first login the app seeds your two firms and starts saving to the cloud. The top bar shows a **Cloud / Syncing / Saved** badge.

---

## How syncing works
- Every change auto-saves to Supabase (debounced ~1s). The badge shows **Saving → Saved**.
- Sign in on any device/browser with the same user to see the same data.
- **Settings → Cloud Sync** has manual **Push to cloud now** and **Restore latest from cloud** buttons.

## Deploying (Vercel etc.)
Add the same two variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in your host's **Environment Variables**, then redeploy.

## Notes & limits
- This stores the whole app state as one JSON document per user — simple and reliable for a single operator. If two devices edit at the exact same time, the last save wins.
- Want per-record relational tables (multi-user concurrent editing, SQL reports in Supabase) later? That's a bigger upgrade we can do on top of this.
