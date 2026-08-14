# Deploying Khaata

This is **one Node/Express server** (`server.js`) that:
1. Serves the built React frontend as static files
2. Exposes `POST /api/advice`, which calls the Anthropic API server-side,
   using a key that lives only in an environment variable — never in the
   browser

Because the server builds and serves the frontend itself (see `postinstall`
in `package.json`, and the `express.static` + SPA fallback at the bottom of
`server.js`), **there is only one thing to deploy** on every platform below:
this repo, as a single web service. You never deploy `client/` separately.

---

## 0. Before you deploy — get your Anthropic API key

Go to https://console.anthropic.com/settings/keys and create a key. You'll
paste it into your hosting platform as an environment variable — never into
the code or git.

## 1. Test locally first

\```bash
cp .env.example .env
# edit .env, paste your real ANTHROPIC_API_KEY

npm run install-all
npm run build
npm start          # http://localhost:8080
\```

---

## Option A — Render (recommended if you just want it live fast)

Render builds straight from a GitHub repo, so push this project to GitHub
first:

\```bash
cd finance-app
git init && git add . && git commit -m "initial commit"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/khaata-app.git
git push -u origin main
\```

### Deploy

1. Go to https://dashboard.render.com → **New +** → **Web Service**
2. Connect your GitHub repo
3. Render should auto-detect Node. Set:
   - **Build Command:** `npm install`
     (this triggers the `postinstall` script, which builds `client/` too —
     you don't need a separate build step)
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Under **Environment**, add:
   - `ANTHROPIC_API_KEY` = your real key
   - `CLAUDE_MODEL` = `claude-sonnet-5`
5. Click **Create Web Service**. Render gives you a live `https://khaata-app.onrender.com` URL with HTTPS already handled.

**Or skip steps 3–4** by using the included `render.yaml`: on the Blueprints
page (https://dashboard.render.com/blueprints), point it at the same repo —
Render reads `render.yaml` and sets the build/start commands automatically.
You'll still be prompted to paste `ANTHROPIC_API_KEY` since it's marked
`sync: false` (kept out of git on purpose).

### Updating later
Just `git push` — Render redeploys automatically on every push to your
connected branch.

---

## Option B — Railway

Also git-based (or CLI-based if you'd rather not use GitHub).

### Via GitHub (dashboard)

1. Push this repo to GitHub (see commands above if you haven't)
2. https://railway.app → **New Project** → **Deploy from GitHub repo**
3. Railway auto-detects Node via Nixpacks and reads the included
   `railway.json` / `Procfile`, so build (`npm install`, which triggers the
   `postinstall` client build) and start (`npm start`) are already
   configured — no manual settings needed
4. Open the service → **Variables** tab → add:
   - `ANTHROPIC_API_KEY` = your real key
   - `CLAUDE_MODEL` = `claude-sonnet-5`
5. Railway deploys automatically and gives you a live URL under
   **Settings → Networking → Generate Domain**

### Via CLI (no GitHub needed)

\```bash
npm install -g @railway/cli
railway login
cd finance-app
railway init
railway variables set ANTHROPIC_API_KEY=sk-ant-your-real-key
railway variables set CLAUDE_MODEL=claude-sonnet-5
railway up
railway domain     # generates a public URL
\```

### Updating later
`git push` (GitHub-connected) or `railway up` again (CLI).

---

## Option C — AWS Elastic Beanstalk

\```bash
pip install awsebcli --upgrade --user
aws configure

cd finance-app
eb init -p node.js-18 khaata-app --region ap-south-1
eb create khaata-env --single
eb setenv ANTHROPIC_API_KEY=sk-ant-your-real-key CLAUDE_MODEL=claude-sonnet-5
eb deploy
eb open
\```

EB runs `npm install` then `npm start` automatically — the `postinstall`
script handles building the client, same as everywhere else.

Updates later: `eb deploy`

---

## Option D — Raw EC2

1. Launch an Ubuntu 22.04 instance, allow inbound 22/80/443 in its security group
2. `ssh` in, install Node 18 (NodeSource), `scp` or `git clone` this repo
3. `npm run install-all && npm run build`
4. Create `.env` with your real key
5. `sudo npm install -g pm2 && pm2 start server.js --name khaata && pm2 save && pm2 startup`
6. Put nginx in front on port 80, reverse-proxying to `localhost:8080`
7. `sudo certbot --nginx -d your-domain.com` for HTTPS

Updates later: pull/copy new code, `npm run build`, `pm2 restart khaata`

---

## Security checklist before going live (any platform)

- [ ] `.env` is in `.gitignore` and never committed — confirm with
      `git status` after adding your key locally
- [ ] `ANTHROPIC_API_KEY` is set as a platform environment variable, not
      hardcoded anywhere in the repo
- [ ] The rate limiter in `server.js` (12 req/min/IP on `/api/advice`) is
      tuned to your expected traffic
- [ ] HTTPS is on (Render/Railway/EB give you this by default; EC2 needs
      certbot manually — see Option D)
- [ ] Set a spend limit on your Anthropic account so a bug or abuse traffic
      can't run up an unexpected bill
