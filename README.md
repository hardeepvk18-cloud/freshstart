# FreshStart

First year guide for TIET students. MERN stack, Google OAuth login gating.

MongoDB is already connected in `backend/.env`. You only need to add Google OAuth later.

---

## Run it (two terminals)

### Terminal 1 — backend

```bash
cd backend
npm install
npm run seed
npm start
```

Expected output:

```
Seeded 10 subjects and 14 FAQs
MongoDB connected
Server listening on port 5000
```

Check it worked: open http://localhost:5000/api/subjects — you should see JSON.

Leave this terminal running.

### Terminal 2 — frontend

```bash
cd frontend
npm install
npm start
```

The browser opens http://localhost:3000 automatically.

---

## What works right now

- Homepage with animations
- FAQs — 7 free, rest locked behind sign-in
- Subjects — Pool A open, Pool B locked
- Subject detail — topics open, topper tips locked
- Doubts — post anonymously, view answered ones, upvote
- Admin panel — appears only for emails in ADMIN_EMAILS

The Sign in button will not work until you finish the Google OAuth step below.

---

## Add Google OAuth

1. Go to https://console.cloud.google.com and create a project called FreshStart.
2. APIs & Services → OAuth consent screen → External → fill app name and your email → save through to the end. Under Test users, add your own Gmail.
3. APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application.

   Authorized JavaScript origins:
   ```
   http://localhost:3000
   http://localhost:5000
   ```

   Authorized redirect URIs (must match exactly):
   ```
   http://localhost:5000/auth/google/callback
   ```

4. Copy the Client ID and Client Secret into `backend/.env`:

   ```
   GOOGLE_CLIENT_ID=paste_here
   GOOGLE_CLIENT_SECRET=paste_here
   ```

5. Also set your own Gmail in the same file so you get admin access:

   ```
   ADMIN_EMAILS=your.email@gmail.com
   ```

6. Restart the backend (Ctrl+C, then `npm start`). You should see `Google OAuth enabled`.

7. Refresh the frontend and click Sign in.

If you get `redirect_uri_mismatch`, the redirect URI in step 3 is wrong. It must be exactly
`http://localhost:5000/auth/google/callback` — no trailing slash, no https.

---

## Deploy

**Backend → Railway**

1. Push this folder to a private GitHub repo.
2. railway.app → New Project → Deploy from GitHub repo.
3. Settings → Root Directory = `backend`.
4. Variables tab: add MONGODB_URI, SESSION_SECRET, ADMIN_EMAILS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL.
5. Settings → Networking → Generate Domain. Note the URL.

**Frontend → Vercel**

1. vercel.com → Add New Project → same repo.
2. Root Directory = `frontend`.
3. Environment variable: REACT_APP_API_URL = your Railway URL.
4. Deploy. Note the Vercel URL.

**Then wire them together**

- Railway → set FRONTEND_URL to the Vercel URL → redeploy.
- Google Console → add both production URLs to origins, and add
  `https://your-railway-url/auth/google/callback` to redirect URIs.
- MongoDB Atlas → Network Access must allow `0.0.0.0/0` since Railway IPs are not fixed.
- Google Console → OAuth consent screen → Publish App, so anyone can sign in rather than
  only your test users.

---

## Troubleshooting

**MongoDB connection failed** — Atlas → Network Access → Add IP Address → Allow access from anywhere.

**Port 5000 already in use** — change PORT in `backend/.env` to 5001, and update
REACT_APP_API_URL in `frontend/.env` to match.

**npm install fails** — run `npm cache clean --force` then try again.

**Frontend loads but no data** — the backend terminal is not running, or it crashed. Check terminal 1.

---

## Security note

The MongoDB password in `backend/.env` was shared in a chat, so treat it as public.
Before you launch, go to Atlas → Database Access → Edit password, and paste the new one
into `backend/.env`. Avoid `@ # / :` in the password since those break the connection string.
