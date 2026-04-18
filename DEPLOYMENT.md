# FinePrint Studio — Deployment Guide
## From zero to live in ~2 hours

---

## Step 1 — GitHub (10 mins)

1. Go to **github.com** → Sign up (free)
2. Click **New repository**
3. Name: `fineprint-marketplace` → Create
4. On your computer, extract the ZIP you downloaded
5. Drag all files into the GitHub repository page in your browser
6. Click **Commit changes**

---

## Step 2 — Supabase (20 mins)

1. Go to **supabase.com** → Sign up → New project
2. Name: `fineprint-marketplace`
3. Set a strong database password — **save it somewhere safe**
4. Wait ~2 mins for project to start

### Run the database schema

5. Go to **SQL Editor** → New Query
6. Open the file `supabase/migrations/001_schema.sql` from the code
7. Paste the entire contents into the SQL editor
8. Click **Run**
9. You should see "Success" — all tables and storage buckets are created

### Get your API keys

10. Go to **Settings → API**
11. Copy:
    - `Project URL` → looks like `https://xxxx.supabase.co`
    - `anon public` key → long string starting with `eyJ...`
    - `service_role` key → another long string (keep this secret!)

---

## Step 3 — Resend email (5 mins)

1. Go to **resend.com** → Sign up (free)
2. Go to **API Keys** → Create API Key
3. Copy the key (starts with `re_`)
4. Go to **Domains** → Add your domain `fineprintmv.com`
5. Follow their DNS instructions (add 2 records to your domain)

---

## Step 4 — Telegram Bot (5 mins)

1. Open Telegram on your phone
2. Search for `@BotFather` → tap Start
3. Send: `/newbot`
4. Name: `FinePrint Studio`
5. Username: `fineprintstudio_bot` (or any available name)
6. BotFather sends you a token — **copy it**
7. Now send any message to your new bot (search for it and say hi)
8. Open this URL in your browser (replace TOKEN with your actual token):
   ```
   https://api.telegram.org/botTOKEN/getUpdates
   ```
9. Find `"chat":{"id":XXXXXXX}` — copy that number

---

## Step 5 — Environment variables

Open the file `.env.local` in the code and fill in all values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

RESEND_API_KEY=re_...

TELEGRAM_BOT_TOKEN=7743920183:AAFx...
TELEGRAM_CHAT_ID=123456789

NEXT_PUBLIC_APP_URL=https://fineprintmv.com
```

---

## Step 6 — Vercel (10 mins)

1. Go to **vercel.com** → Sign up with your GitHub account
2. Click **Add New Project**
3. Select your `fineprint-marketplace` repository
4. Click **Environment Variables** and add each variable from your `.env.local`:
   - Copy each key and value exactly
5. Click **Deploy**
6. Wait ~3 minutes → you'll get a URL like `fineprint-marketplace.vercel.app`
7. Test it! It should show the storefront.

---

## Step 7 — Connect your domain (15 mins)

1. In Vercel → your project → **Settings → Domains**
2. Type `fineprintmv.com` → Add
3. Also add `www.fineprintmv.com`
4. Vercel shows you DNS records to add:
   - An `A` record pointing to Vercel's IP
   - A `CNAME` for www
5. Go to wherever you registered your domain (GoDaddy, Namecheap, etc.)
6. Find DNS settings → add those records
7. Wait 10–30 minutes → your site is live at `fineprintmv.com`

---

## Step 8 — Create your admin account

1. Go to `fineprintmv.com/auth/signup`
2. Sign up with `hshazil@gmail.com`
3. Choose "Buyer" for now (we'll upgrade to admin manually)
4. Go to Supabase → **Table Editor → profiles**
5. Find your row → change `role` from `buyer` to `admin`
6. Now log in and go to `/admin/dashboard`

---

## Step 9 — Test the full flow

### Test as a buyer:
1. Sign up with a test email
2. Browse storefront → click an artwork → select size
3. Go to checkout → fill details → choose delivery
4. Upload a fake slip image
5. Check your Telegram — you should get two notifications (order + slip)

### Test as an artist:
1. Sign up choosing "Artist"
2. Go to artist dashboard
3. Upload an artwork
4. Check Telegram — you should get an artwork notification
5. Approve it from admin dashboard

### Test order approval:
1. In admin dashboard → Orders tab → click Approve
2. The buyer should receive an invoice email
3. Check Telegram for confirmation

---

## Troubleshooting

**Telegram not working?**
- Check `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are correct in Vercel env vars
- Make sure you sent a message to the bot first (required before getUpdates works)

**Emails not sending?**
- Make sure your Resend domain is verified (check DNS records)
- Check Resend dashboard for failed sends

**Supabase errors?**
- Check that the SQL migration ran successfully
- Check Supabase → Logs for detailed errors

**Images not loading?**
- Check that the `artwork-previews` bucket is set to Public in Supabase → Storage

---

## File structure reference

```
fineprint/
├── app/
│   ├── api/
│   │   ├── artworks/route.ts       ← artwork upload + SKU generation
│   │   ├── orders/route.ts         ← place order + Telegram notification
│   │   ├── orders/slip/route.ts    ← upload transfer slip
│   │   ├── orders/approve/route.ts ← approve/reject + send invoice email
│   │   └── export/route.ts         ← CSV export
│   ├── auth/login/page.tsx
│   ├── auth/signup/page.tsx
│   ├── storefront/page.tsx
│   ├── artwork/[id]/page.tsx
│   ├── checkout/page.tsx
│   ├── order-confirmed/page.tsx
│   ├── artist/dashboard/page.tsx
│   ├── admin/dashboard/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── supabase.ts    ← database client
│   ├── pricing.ts     ← commission + discount calculations
│   ├── telegram.ts    ← all 4 notification types
│   ├── invoice.ts     ← invoice HTML template + Resend
│   ├── csvExport.ts   ← artist + admin CSV generation
│   └── imageProtection.ts ← canvas rendering + keyboard blocking
├── supabase/
│   └── migrations/001_schema.sql  ← run this in Supabase SQL Editor
├── .env.local         ← fill this in (never commit to GitHub!)
├── next.config.js
└── package.json
```

---

## Commission summary

| Item | Amount |
|------|--------|
| FinePrint commission | 25% of original price (always, regardless of discounts) |
| Artist earnings | Buyer paid − FinePrint commission |
| Handling & delivery | MVR 100 (pass-through, not revenue) |
| Pickup | Free |

---

Questions? Email hello@fineprintmv.com
