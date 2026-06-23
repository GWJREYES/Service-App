# S.E.R.V.I.C.E. Appointment Checklist

An interactive, step-by-step checklist that walks a technician through a full
service appointment — built so newer techs can follow along and not miss a step.
It runs as a full-screen web app on an iPad and works offline once installed.

The flow follows the seven **S.E.R.V.I.C.E.** stages:

| | Stage | Focus |
|---|---|---|
| **S** | Scout | Prep before you arrive |
| **E** | Engage | Make a great first impression |
| **R** | Review | Understand the customer (read the **Table script** here) |
| **V** | Verify | Inspect & document everything |
| **I** | Impact | Build the plan |
| **C** | Convert | Present & close |
| **E** | Extend | Lock in next steps |

---

## What's in this folder

| File | Purpose |
|---|---|
| `index.html` | The entire app — self-contained, no internet needed once cached |
| `sw.js` | Service worker that caches the app for **offline** use |
| `manifest.webmanifest` | App name, icon, and full-screen settings |
| `app-icon.png` | Home-screen icon |
| `README.md` | This file |

Keep all files together in the **same folder** — `sw.js`, the manifest, and the
icon must sit right next to `index.html`.

---

## Deploy on GitHub Pages

1. Create a repository (public is simplest for Pages).
2. Upload **all files in this folder** to the repo root — keep the names exactly.
3. Go to **Settings → Pages**. Under *Source*, pick the `main` branch and the
   `/ (root)` folder, then **Save**.
4. Wait ~1 minute. GitHub gives you a URL like
   `https://<your-name>.github.io/<repo>/`.
5. Open that URL in **Safari** on the iPad.

> **Why hosting matters:** the microphone and camera features only work over
> **HTTPS**, which GitHub Pages provides automatically. Opening the raw file
> from the iPad's Files app will not run it.

---

## Install on the iPad (home-screen app)

1. Open the Pages URL in **Safari**.
2. Tap the **Share** icon (box with an up-arrow).
3. Choose **Add to Home Screen**.
4. It installs with the gold "S" icon and launches **full-screen**, like a native
   app — in either landscape or portrait.

After it loads online once, the service worker caches everything, so it then
**works with no signal** in the field.

---

## How a technician uses it

- **One stage per screen.** Swipe **left/right** to move through the seven SERVICE
  stages, or use the **Back / Next** buttons. Tap any letter tile up top to jump
  straight to a stage. The dots at the bottom show where you are.
- **Check off** each sub-task as you go (big tap targets); progress is tracked per
  stage and overall, and your place is remembered if the app is closed.
- **Notes & photos** can be added to any step.
- **Voice recording** of the conversation is available on the four
  customer-facing stages (Engage, Review, Convert, Extend) — it records until you
  move to the next stage.
- **Scripts** appear where needed: the *On the Way Call* script (Engage) and the
  *Table script* (Review), with key phrases and fill-in `<name>` chips.
- On the **last stage**, once everything is checked, a **Done — reset** button
  clears the appointment for the next customer.

All notes, photos, recordings, and checkmarks are saved **on that iPad only**
(in the browser's local storage). Nothing is uploaded.

---

## Updating the app later

When the checklist content changes, re-upload the new files **and** bump the
cache name in `sw.js` (e.g. `svc-checklist-v2` → `svc-checklist-v3`). That tells
every installed iPad to pull the new version on next launch.
