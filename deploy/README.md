# Deployment Guide for Ranked Choice Voting App

This guide covers deploying the Ranked Choice Voting App to a DigitalOcean droplet (or similar VPS) running nginx and pm2.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ installed
- nginx installed and running
- pm2 installed globally (`npm install -g pm2`)
- Git installed

## Isolation Principles

This app is designed to run alongside other applications on the same server:

- **Port isolation**: Uses port 3100 (not the common 3000)
- **Process isolation**: Runs as a separate pm2 process named `rcv-lunch`
- **Data isolation**: SQLite database stored outside the repo at `/var/lib/rcv-lunch/`
- **nginx isolation**: Separate site config; does not modify existing configs

## Step-by-Step Deployment

### 1. Create Data Directory

```bash
sudo mkdir -p /var/lib/rcv-lunch
sudo chown $USER:$USER /var/lib/rcv-lunch
chmod 755 /var/lib/rcv-lunch
```

### 2. Create Log Directory

```bash
sudo mkdir -p /var/log/rcv-lunch
sudo chown $USER:$USER /var/log/rcv-lunch
```

### 3. Clone and Build the App

```bash
cd /var/www
git clone <repo-url> rcv-lunch
cd rcv-lunch

# Install dependencies
npm install

# Build for production
npm run build
```

### 4. Configure Environment

```bash
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required environment variables:
- `PORT=3100` (default)
- `DATABASE_PATH=/var/lib/rcv-lunch/rcv.sqlite`
- `BASE_URL=https://your-domain.com` (optional, for generated links)

### 5. Set Up PM2

```bash
# Start the app
pm2 start deploy/pm2/ecosystem.config.cjs

# Verify it's running
pm2 status
pm2 logs rcv-lunch

# Save the process list so it restarts on boot
pm2 save

# Set up PM2 startup script (if not already done)
pm2 startup
```

### 6. Configure nginx

```bash
# Copy the config template
sudo cp deploy/nginx/rcv-lunch.conf /etc/nginx/sites-available/rcv-lunch

# Edit to set your domain
sudo nano /etc/nginx/sites-available/rcv-lunch
# Change: server_name rcv.example.com;
# To: server_name your-actual-domain.com;

# Enable the site
sudo ln -s /etc/nginx/sites-available/rcv-lunch /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

Assumption: This deployment serves the app under `/rcv`. Ensure `basePath: '/rcv'`
is set in `next.config.js` before building, or Nginx will serve broken asset
paths under `/rcv`.

### 7. Set Up HTTPS (Recommended)

```bash
# Install certbot if not already installed
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically update the nginx config
```

## Updating the App

```bash
cd /var/www/rcv-lunch

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build

# Restart the app
pm2 restart rcv-lunch
```

## Useful Commands

```bash
# View logs
pm2 logs rcv-lunch

# Check status
pm2 status

# Restart app
pm2 restart rcv-lunch

# Stop app
pm2 stop rcv-lunch

# View nginx logs
tail -f /var/log/nginx/rcv-lunch.error.log
```

## Backup

The SQLite database is stored at `/var/lib/rcv-lunch/rcv.sqlite`. To backup:

```bash
# Simple copy (stop app first for consistency)
pm2 stop rcv-lunch
cp /var/lib/rcv-lunch/rcv.sqlite /path/to/backup/rcv-$(date +%Y%m%d).sqlite
pm2 start rcv-lunch

# Or use sqlite3 backup command (works while app is running)
sqlite3 /var/lib/rcv-lunch/rcv.sqlite ".backup '/path/to/backup/rcv-$(date +%Y%m%d).sqlite'"
```

## Troubleshooting

### App not starting
```bash
pm2 logs rcv-lunch --lines 50
```

### Database errors
- Check that `/var/lib/rcv-lunch/` exists and is writable
- Check `DATABASE_PATH` in environment

### nginx 502 Bad Gateway
- Check that the app is running: `pm2 status`
- Check that the port matches (3100)
- Check nginx error log: `sudo tail -f /var/log/nginx/rcv-lunch.error.log`

### Permission denied
- Ensure the app user owns `/var/lib/rcv-lunch/`
- Ensure the app user owns `/var/log/rcv-lunch/`
