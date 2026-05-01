# EC2 Deployment

This repository now targets a single Dockerized deployment on one Ubuntu 24.04 EC2 instance, fronted by host-level `nginx` and automated with GitHub-hosted Actions over SSH.

## Provision The Host

1. Create one `t3.medium` Ubuntu 24.04 EC2 instance.
2. Attach an Elastic IP.
3. Open only ports `22`, `80`, and `443` in the security group.
4. Point `MemorEase.tech` and `www.MemorEase.tech` at the Elastic IP.

## Install Host Dependencies

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx git curl
sudo systemctl enable --now docker nginx
```

Add your deploy user to the Docker group, then reconnect your SSH session:

```bash
sudo usermod -aG docker "$USER"
```

Prepare the application directory once on the host:

```bash
sudo mkdir -p /opt/MemorEase
sudo chown "$USER:$USER" /opt/MemorEase
git clone --branch main https://github.com/4regab/MemorEase /opt/MemorEase
```

If `/opt/MemorEase` or its `.git` directory was ever created with `sudo`, fix the ownership before using the deploy workflow:

```bash
sudo chown -R "$USER:$USER" /opt/MemorEase
```

## Prepare Runtime Secrets

Create `/opt/MemorEase/.env` with the same runtime variables documented in the root README. Keep the file on the host only. The deploy workflow reads it, but never writes it.

The file must include the public values used at Docker build time:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_HCAPTCHA_SITEKEY` if enabled
- `NEXT_PUBLIC_POSTHOG_KEY` if enabled
- `NEXT_PUBLIC_POSTHOG_HOST` if enabled

It must also include server-side values such as:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` and any rotated Gemini keys
- `UNSPLASH_ACCESS_KEY`
- `CRON_SECRET`

## Install Nginx

Copy the shipped config into place, enable it, then request the certificates:

```bash
sudo cp deploy/nginx/MemorEase.conf /etc/nginx/sites-available/MemorEase
sudo ln -s /etc/nginx/sites-available/MemorEase /etc/nginx/sites-enabled/MemorEase
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx --redirect -d MemorEase.tech -d www.MemorEase.tech
```

The config proxies traffic to `127.0.0.1:3000` and raises `client_max_body_size` to `25M` so the existing PDF upload limits keep working behind Nginx.

## Install Cron

Copy the wrapper script and cron file into place:

```bash
sudo install -m 755 deploy/scripts/cron-generate-article.sh /usr/local/bin/MemorEase-generate-article
sudo cp deploy/cron/MemorEase-blog /etc/cron.d/MemorEase-blog
sudo chmod 644 /etc/cron.d/MemorEase-blog
```

The host cron triggers blog generation at `08:00 UTC` and `20:00 UTC` by calling `http://127.0.0.1:3000/api/cron/generate-article` with `CRON_SECRET`.

## Configure GitHub Actions

Add these repository secrets:

- `EC2_HOST`
- `EC2_PORT` if you do not use port `22`
- `EC2_USER`
- `EC2_SSH_KEY`

The workflow runs on pushes to `main` and on manual dispatch. It tests the app, builds the Docker image, smoke-checks `/healthz`, then SSHes into the EC2 host and executes `deploy/scripts/deploy.sh`.

## First Deployment

The deploy script bootstraps `/opt/MemorEase` automatically if the repository is not present yet. After the first successful run, validate:

- `https://MemorEase.tech/healthz`
- the homepage, blog, share pages, and auth callback flow
- one PDF upload
- `sudo tail -f /var/log/MemorEase-cron.log`

## Rollback

Keep Vercel serving until the EC2 host is healthy and DNS has propagated. To roll back after cutover:

1. Point DNS back to Vercel.
2. SSH into the EC2 host.
3. Check out the previous git commit in `/opt/MemorEase`.
4. Re-run `deploy/scripts/deploy.sh`.
