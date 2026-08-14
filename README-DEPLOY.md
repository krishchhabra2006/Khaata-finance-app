# Deploying Khaata to AWS

This is a single Node/Express server that:
1. Serves the built React frontend
2. Exposes `POST /api/advice`, which calls the Anthropic API **from the server**, using a key that lives only in an environment variable — never in the browser

You have two options below. **Elastic Beanstalk is recommended** — it's far less to maintain than raw EC2 (handles the OS, scaling, health checks, deploys for you). EC2 instructions are included too since you asked about both.

---

## 0. Before you deploy — get your Anthropic API key

1. Go to https://console.anthropic.com/settings/keys and create a key.
2. Keep it somewhere private. You'll paste it into AWS as an environment variable in the steps below — it never goes into your code or git repo.

## 1. Test it locally first (do this before touching AWS)

```bash
# from the project root
cp .env.example .env
# edit .env and paste your real ANTHROPIC_API_KEY

npm run install-all      # installs server + client deps
npm run build             # builds the React app into client/dist
npm start                 # starts the server on http://localhost:8080
```

Open http://localhost:8080 — you should see the app, and reaching the final
"plan" step should show a real Claude-generated note under "Claude's take".

If `/api/advice` errors, check the terminal — it logs the exact Anthropic
API error (bad key, wrong model name, etc).

---

## Option A — AWS Elastic Beanstalk (recommended)

Elastic Beanstalk runs your Node app on a managed EC2 instance behind a load
balancer, and handles deploys, health checks, and scaling for you.

### One-time setup

```bash
# install the EB CLI (needs Python)
pip install awsebcli --upgrade --user

# configure AWS credentials if you haven't already
aws configure
```

### Deploy

```bash
cd finance-app
eb init -p node.js-18 khaata-app --region ap-south-1
# choose "no" when asked about CodeCommit, "yes" for SSH if you want it

eb create khaata-env --single
# --single = one instance, no load balancer (cheapest, fine for a first deploy)
# drop --single for a real production setup with a load balancer + auto scaling

# set your API key as an environment variable ON AWS (not in git)
eb setenv ANTHROPIC_API_KEY=sk-ant-your-real-key CLAUDE_MODEL=claude-sonnet-5

eb deploy
eb open      # opens your live URL in the browser
```

Elastic Beanstalk automatically runs `npm install` then `npm start` — which
is why the root `package.json` has a `postinstall` script that builds the
client automatically. You don't need to run `npm run build` yourself for EB.

### Updating the app later

```bash
eb deploy
```

### Custom domain + HTTPS

In the EB console: Configuration → Load balancer → add an HTTPS listener
with an ACM certificate (free) for your domain, then point your domain's
DNS (Route 53 or elsewhere) at the EB environment's CNAME.

---

## Option B — Raw EC2

More control, more to maintain yourself (OS patching, process manager,
reverse proxy, TLS renewal).

### 1. Launch the instance

- AWS Console → EC2 → Launch instance
- Ubuntu Server 22.04 LTS, t3.small (t3.micro works but is tight)
- Security group: allow inbound **22** (SSH, restrict to your IP), **80**,
  **443**
- Launch, download the `.pem` key

### 2. Connect and install Node

```bash
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # confirm v18+
```

### 3. Get your code onto the instance

```bash
# from your local machine
scp -i your-key.pem -r ./finance-app ubuntu@<your-ec2-public-ip>:~/finance-app
```

(or `git clone` your repo on the instance instead)

### 4. Install, build, configure

```bash
cd ~/finance-app
npm run install-all
npm run build

# create the real .env with your key
nano .env
# paste in:
# ANTHROPIC_API_KEY=sk-ant-your-real-key
# CLAUDE_MODEL=claude-sonnet-5
# PORT=8080
```

### 5. Keep it running with pm2

```bash
sudo npm install -g pm2
pm2 start server.js --name khaata
pm2 save
pm2 startup   # follow the printed command to enable pm2 on reboot
```

### 6. Put nginx in front (port 80 → your app on 8080)

```bash
sudo apt-get install -y nginx
sudo tee /etc/nginx/sites-available/khaata << 'NGINX'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/khaata /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Updating the app later

```bash
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
cd ~/finance-app
git pull   # or re-scp your changes
npm run build
pm2 restart khaata
```

---

## Security checklist before going live

- [ ] `.env` is in `.gitignore` and never committed
- [ ] `ANTHROPIC_API_KEY` is set as an AWS environment variable, not hardcoded
- [ ] The rate limiter in `server.js` (12 req/min/IP on `/api/advice`) is
      tuned to your expected traffic — raise or lower `max` as needed
- [ ] HTTPS is enabled (ACM on EB, or certbot on EC2) — don't ship a finance
      app over plain HTTP
- [ ] Set a spend limit / budget alert on your Anthropic account so a bug
      or abuse can't run up an unexpected bill
- [ ] If you outgrow the `--single` EB instance or one EC2 box, add a load
      balancer + auto scaling group in front of 2+ instances
