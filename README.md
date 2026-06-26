# Groundworks S.E.R.V.I.C.E. — Field App + Report Email

An iPad field app that walks a technician (**Tyler Evans**) through the seven
**S.E.R.V.I.C.E.** stages, captures notes / photos / voice on-device, tracks
scouting + on-site time, and **emails a report to the Service Manager**
(**Justin Reyes — Justin.Reyes@groundworks.com**) when the appointment ends.

It deploys to **Vercel** as one project: the static app **plus** a tiny
serverless function (`/api/send-report`) that sends the email through **Resend**.

---

## ⚠️ About your API key

Your Resend API key is a **secret**. It must live **only** in Vercel's
Environment Variables (server-side) — never in the app code or this repo, or it
would be exposed to anyone who opens the page. The function reads it from
`process.env.RESEND_API_KEY`.

> Because the key was shared in chat to set this up, **regenerate it in Resend**
> (API Keys → ⋯ → Roll) once you've confirmed email works, and update the Vercel
> env var with the new value.

---

## Launch checklist (~15 min, one time)

### 1 — Verify your sending domain in Resend
You bought **`gwservice.org`** for this — verify it first. It lets you send
**from** a `gwservice.org` address **to** Justin (or anyone).
1. Resend → **Domains → Add Domain** → `gwservice.org`.
2. At your domain registrar (where you bought `gwservice.org`), add the
   **SPF / DKIM** DNS records Resend shows you. Wait for **Verified** (usually
   minutes, up to a couple hours for DNS to propagate).

> Skipping this? Resend test mode only delivers **to the email you signed up to
> Resend with**, and only **from** `onboarding@resend.dev`. To test that way,
> temporarily point the recipient at your own signup address (see *Change the
> recipient*).

### 2 — Put these files on GitHub (all in the browser)
Vercel auto-deploys from the **`GWJREYES/Service-App`** repo, so every change
just needs to land there.

**Replacing the old version (one time):**
1. On **github.com**, open **GWJREYES/Service-App**.
2. Delete the old leftover files that aren't part of this app: **`sw.js`**
   (old service worker) — open it → trash icon → commit. (The new `index.html`
   already neutralizes any old service worker still on a device.)
3. **Add file → Upload files** → drag in everything from this folder
   (`index.html`, `manifest.webmanifest`, `app-icon.png`, `vercel.json`,
   `package.json`, and the **`checklist/`** and **`api/`** folders). GitHub keeps
   the folder structure. → **Commit changes**.
4. Vercel sees the commit and deploys automatically (watch **Vercel →
   Deployments**).

**Every later change:** I hand you the changed files → on github.com use
**Add file → Upload files**, drag them in (same path overwrites) → **Commit** →
Vercel redeploys. For a one-line tweak you can instead open the file on GitHub,
click the **pencil**, edit, and commit. No installed programs needed.

### 3 — Set Environment Variables (Vercel → Settings → Environment Variables)

| Name | Value | Required |
|---|---|---|
| `RESEND_API_KEY` | your `re_…` key | **Yes** |
| `REPORT_FROM` | `Groundworks SERVICE <service@gwservice.org>` (must be on the verified domain) | Recommended |

Redeploy after adding them. On the **GitHub workflow** this happens on your next
commit; to apply them without a new commit, go to **Vercel → Deployments → ⋯ →
Redeploy**. The **Send report** button now emails for real.

### 4 — Install on the iPad
1. Open the Vercel **https** URL in **Safari** (landscape).
2. **Share → Add to Home Screen** → launches full-screen with the gold "S" icon.

> Camera, microphone, and home-screen install require **HTTPS** — which Vercel
> provides automatically. Opening a raw file won't work.

---

## How "Send report" works
- Tapping **Send report** (or **End appointment** on the Extend stage) POSTs the
  report — customer, stage completion, scouting/on-site/total time, capture
  counts, flagged items, field notes, tech note — to `/api/send-report`, which
  emails Justin a branded HTML summary.
- **Captured photos** are attached (up to a ~2.5 MB budget — the Vercel request
  limit). **Voice recordings** stay on the iPad and are referenced in the report.
- If the function is ever unreachable, the app **falls back to a mail-app draft**
  so the tech can still send. (That fallback is also what you see in the design
  preview, where there's no server.)

---

## Daily use by the technician
- **One appointment at a time.** Enter the customer, work the stages, capture as
  you go. Time auto-tracks (Scouting → On-site).
- **Next customer:** tap **↻ Reset appointment** in the header. The finished job
  is already filed to **My schedule**; reset clears the workspace for the next.
- Everything (checks, notes, photos, recordings, schedule) is stored **on that
  iPad only**, in the browser — nothing is uploaded except the emailed report.

---

## Change the recipient (e.g. to test to your own inbox first)
Recipient lives in `checklist/report-sheet.jsx`:
```js
const MANAGER = { name: 'Justin Reyes', email: 'Justin.Reyes@groundworks.com', role: 'Service Manager' };
```
Edit on github.com (pencil → commit) and Vercel redeploys.

---

## Troubleshooting
- **"RESEND_API_KEY is not configured"** → set the env var in Vercel and redeploy.
- **Email never arrives** → Resend → **Logs**. Most often the unverified-domain
  rule (Step 1): until `gwservice.org` is verified you can only send to your
  own Resend signup address.
- **"email service was unreachable"** → the function errored; open the Vercel
  deployment **Logs** for the `/api/send-report` request.
- **Photos too large** → the app caps attachments to stay under Vercel's request
  size limit; remaining photos stay on the device.
