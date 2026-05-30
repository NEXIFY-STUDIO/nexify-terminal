# nexify-hack-api

Express backend that runs real hacking tools via SSE and streams output to the Nexify Terminal frontend.

## Quick deploy to VPS (Ubuntu 22/24)

```bash
# 1. Copy files to VPS
scp -r . root@194.182.87.6:/tmp/nexify-hack-api

# 2. SSH in and run the deploy script
ssh root@194.182.87.6
cd /tmp/nexify-hack-api
bash deploy.sh
```

The script will:

- Install system tools (nmap, whois, dig, nikto, gobuster, sqlmap, hydra, ffuf, openssl)
- Install Node.js 20 LTS if needed
- Copy API files to `/opt/nexify-hack-api/`
- Generate a random `HACK_API_TOKEN` and save it to `/opt/nexify-hack-api/.env`
- Register and start a **systemd** service (`nexify-hack-api`)
- Allow port 3001 in UFW

## After deploy

```bash
# Health check
curl http://194.182.87.6:3001/health

# View logs
journalctl -u nexify-hack-api -f

# Test API (replace TOKEN)
curl -H "X-Hack-Token: TOKEN" \
     "http://194.182.87.6:3001/api/hack/whois?target=google.com"
```

## Optional: nginx reverse proxy (HTTPS)

1. Copy `nginx.conf` to `/etc/nginx/sites-available/nexify-hack-api`
2. Edit: set `server_name` to your subdomain (e.g. `hack-api.isteroidi.it`)
3. Get SSL cert: `certbot --nginx -d hack-api.isteroidi.it`
4. Enable: `ln -s /etc/nginx/sites-available/nexify-hack-api /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx`

## Frontend wiring

Copy `.env.local.example` in the project root to `.env.local` and fill in:

```env
VITE_HACK_API_URL=https://hack-api.isteroidi.it
VITE_HACK_API_TOKEN=<token from /opt/nexify-hack-api/.env>
```

Then rebuild: `npm run build`

## Environment variables (VPS .env)

| Variable        | Description                             |
|-----------------|-----------------------------------------|
| `HACK_API_TOKEN`| Auth token — keep secret                |
| `PORT`          | Default: `3001`                         |
| `ALLOWED_ORIGIN`| CORS origin — set to frontend URL       |

## Supported tools

`nmap` · `whois` · `dig` · `nikto` · `gobuster` · `ffuf` · `sqlmap` · `hydra` · `headers (curl)` · `tls (openssl)`

All tool invocations use `shell: false` + per-tool input validators to prevent injection.
