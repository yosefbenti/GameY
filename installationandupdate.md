# GameY Installation and Update Guide

This guide covers:
- first-time installation
- how to run GameY after installation
- how to update after code changes
- how to create and use a desktop shortcut

## 1. Requirements

- Linux machine (Debian/Ubuntu/Parrot recommended)
- Node.js `>= 20.19.0` (Node 22 recommended)
- npm
- git

Install required packages:

```bash
sudo apt update
sudo apt install -y curl ca-certificates gnupg git rsync
```

Install Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2. First-Time Installation (Project Mode)

Clone and enter the project:

```bash
git clone <your-repo-url> GameY
cd GameY
```

Install dependencies:

```bash
npm install
```

Make launcher scripts executable:

```bash
chmod +x gamey run-gamey.sh start-all.sh install-desktop-shortcut.sh
```

## 3. Run GameY After Installation

Start GameY:

```bash
./gamey
```

Alternative start command:

```bash
npm run start:prod
```

Open in browser:

- `http://localhost:8000/admin`
- `http://localhost:8000/teamA`
- `http://localhost:8000/teamB`
- `http://localhost:8000/dashboard`

From another device in the same network:

- `http://<server-ip>:8000/admin`
- `http://<server-ip>:8000/teamA`
- `http://<server-ip>:8000/teamB`
- `http://<server-ip>:8000/dashboard`

Find server IP:

```bash
hostname -I
```

If firewall is enabled:

```bash
sudo ufw allow 8000/tcp
sudo ufw status
```

## 4. Update After Installation (Project Mode)

When you update code on the same machine:

```bash
cd /path/to/GameY
git pull
npm install
```

Run again:

```bash
./gamey
```

## 5. Install as Linux Service (systemd)

Use this if you want GameY to run as a background service.

Install service:

```bash
cd /path/to/GameY
chmod +x scripts/install-systemd.sh
sudo ./scripts/install-systemd.sh
```

Protected env file location used by service:

- `/etc/gamey/gamey.env`
- owner/group: `root:gamey`
- permissions: `640`

Edit service env values safely:

```bash
sudo nano /etc/gamey/gamey.env
sudo systemctl restart gamey
```

Check status/logs:

```bash
sudo systemctl status gamey --no-pager
sudo journalctl -u gamey -f
```

Start/stop/restart:

```bash
sudo systemctl start gamey
sudo systemctl stop gamey
sudo systemctl restart gamey
```

## 6. Update After Installation (systemd Service Mode)

When code is updated:

```bash
cd /path/to/GameY
git pull
sudo ./scripts/install-systemd.sh
sudo systemctl status gamey --no-pager
```

What this does:
- syncs latest code to `/opt/gamey`
- installs production dependencies with `npm ci`
- reloads and restarts the `gamey` service
- keeps existing uploads in `/opt/gamey/uploads`

## 7. Create Desktop Shortcut

Create desktop launcher:

```bash
cd /path/to/GameY
./install-desktop-shortcut.sh
```

The script creates:
- `$HOME/.local/share/applications/gamey.desktop`
- `$HOME/Desktop/GameY.desktop` (if Desktop folder exists)

On some desktops, right-click the icon and choose **Allow Launching**.

## 8. Run GameY from Desktop Shortcut

- Double-click `GameY.desktop`
- It runs `run-gamey.sh`, starts GameY, and opens:
- `http://localhost:8000/admin`

## 9. Quick Troubleshooting

If service fails:

```bash
sudo systemctl status gamey --no-pager -l
sudo journalctl -u gamey -n 100 --no-pager
```

If browser cannot connect from another device:
- confirm server is running
- confirm correct `<server-ip>`
- confirm port `8000` is open in firewall

## 10. If You Fixed Code Later, How to Update Installed Game

Use the update steps that match how you run GameY.

### A) You run from project folder (`./gamey`)

```bash
cd /path/to/GameY
git pull
npm install
./gamey
```

If GameY is already running in a terminal, stop it first with `Ctrl + C`, then run `./gamey` again.

### B) You installed as `systemd` service (`gamey.service`)

```bash
cd /path/to/GameY
git pull
sudo ./scripts/install-systemd.sh
sudo systemctl status gamey --no-pager
```

This re-copies your latest code into `/opt/gamey`, reinstalls production dependencies, and restarts the service.

## 11. Licensing (How It Works)

GameY now supports subscription-based access using a license server.

How it works:

1. Customer GameY server sends `LICENSE_KEY` to your license server endpoint.
2. License server responds with `active: true` or `active: false`.
3. If active, app works normally.
4. If inactive, GameY blocks app usage.
5. If license server is temporarily unreachable, GameY can allow a grace period (default 3 days).

## 12. Step-by-Step: Set Up Licensing

### A) On your machine (vendor): run the license server

From the GameY project:

```bash
cd /path/to/GameY
LICENSE_ADMIN_TOKEN='set-a-strong-token' npm run start:license
```

License server default URL:

- `http://<your-server-ip>:8090`

### B) On customer installation: configure GameY to use your license server

Edit customer env file:

```bash
sudo nano /etc/gamey/gamey.env
```

Add/update:

```env
LICENSE_ENFORCEMENT=true
LICENSE_SERVER_URL=http://<your-license-server-ip>:8090/validate
LICENSE_KEY=customer-001
LICENSE_GRACE_DAYS=3
LICENSE_CHECK_INTERVAL_MINUTES=15
LICENSE_REQUEST_TIMEOUT_MS=8000
```

Restart customer app:

```bash
sudo systemctl restart gamey
sudo systemctl status gamey --no-pager
```

## 13. Activate Customer App (After Payment)

Run on your license-server machine:

```bash
LICENSE_ADMIN_TOKEN='set-a-strong-token' npm run license:admin -- upsert --key customer-001 --active true --customer "Customer 001" --expires 2026-12-31T23:59:59Z --reason "Subscription active"
```

Verify key status:

```bash
npm run license:admin -- validate --key customer-001
```

Customer app will unlock on next license check interval, or immediately after:

```bash
sudo systemctl restart gamey
```

## 14. Deactivate Customer App (No Payment / Expired)

Run on your license-server machine:

```bash
LICENSE_ADMIN_TOKEN='set-a-strong-token' npm run license:admin -- deactivate --key customer-001 --reason "Payment overdue"
```

Customer app will block on next check interval, or immediately after restart.

## 15. Useful License Admin Commands

List all license keys:

```bash
LICENSE_ADMIN_TOKEN='set-a-strong-token' npm run license:admin -- list
```

Create or renew another customer:

```bash
LICENSE_ADMIN_TOKEN='set-a-strong-token' npm run license:admin -- upsert --key customer-002 --active true --customer "Customer 002" --expires 2027-01-31T23:59:59Z --reason "Subscription renewed"
```
