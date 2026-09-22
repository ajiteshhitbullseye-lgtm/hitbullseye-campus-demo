# Putting this prototype on GitHub (and getting a live link)

The folder is already a git repository with one commit. Nothing else on your PC
is needed — from here everything lives on GitHub.

---

## 1. Create an empty repo on GitHub

1. Sign in at <https://github.com> → **New repository**
2. Name: `hitbullseye-campus-demo`
3. **Private** (recommended — the pages carry real university branding)
4. Do **not** tick "Add a README", "Add .gitignore" or "Choose a license" —
   the repo must be empty, we already have the files
5. **Create repository**

GitHub then shows a page with your repo URL. Copy the HTTPS one, it looks like:

```
https://github.com/<your-username>/hitbullseye-campus-demo.git
```

---

## 2. Push from this folder

Open a terminal in `C:\Users\Admin\hitbullseye-demo` and run:

```bash
git remote add origin https://github.com/<your-username>/hitbullseye-campus-demo.git
git push -u origin main
```

The first push asks you to sign in:

- A browser window opens → **Sign in with your browser** → authorise. Done.
- If it asks for a password instead, GitHub no longer accepts account passwords.
  Create a token at <https://github.com/settings/tokens> →
  *Generate new token (classic)* → tick **repo** → copy it and paste that token
  as the password. Windows remembers it after the first time.

Check it worked:

```bash
git remote -v
git log --oneline -1
```

---

## 3. Make changes later

```bash
git add -A
git commit -m "what changed"
git push
```

---

## 4. Live link — GitHub Pages

Works only on a **public** repo (or a private one on a paid plan).

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)` → **Save**
4. Wait a minute, the link appears at the top:

```
https://<your-username>.github.io/hitbullseye-campus-demo/
```

That URL opens `index.html` and the whole flow works exactly as it does locally,
because everything is plain HTML/CSS/JS with no build step.

### If you want to keep it private

Use **Netlify** instead — it hosts private repos for free and can put a password
in front of the site:

1. <https://app.netlify.com> → **Add new site** → **Import an existing project**
2. Connect GitHub → pick the repo
3. Build command: leave empty · Publish directory: `.`
4. **Site settings → Access control → Password protection** to lock it

Or, with no repo at all: <https://app.netlify.com/drop> and drag the folder in.

---

## 5. Before you share the link widely

The pages use real university logos and ask for a University ID and email, so a
visitor could mistake the demo for the real portal. Either keep the link private
(Netlify password / private repo) or ask me to add a visible **DEMO** banner
across the top of every page.

---

## Notes

- This repo commits as `Ajitesh <ajitesh.hitbullseye@gmail.com>` (set locally,
  so the machine-wide identity `ranganadh-hbe` is not used here). To change the
  display name:

  ```bash
  git config user.name "Your Name"       # inside this folder only
  ```

  Use the same email on GitHub (Settings → Emails) so the commits show up
  against your profile.

- Prototype data (registrations, attempts, config edits) lives in the browser's
  localStorage, not in the repo — every visitor starts with the seeded demo data.
