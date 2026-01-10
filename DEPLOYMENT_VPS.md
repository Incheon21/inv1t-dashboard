# 🚀 Panduan Deployment Wedding Dashboard ke VPS

Panduan lengkap untuk deploy Wedding Dashboard (Next.js) ke VPS menggunakan Nginx sebagai reverse proxy dan PM2 sebagai process manager.

## 📋 Prerequisites

-   VPS dengan Ubuntu 20.04+ / Debian 10+
-   Domain sudah di-pointing ke IP VPS (opsional, bisa pakai IP)
-   SSH access ke VPS
-   Database PostgreSQL (bisa Neon, Supabase, atau self-hosted)

---

## 1️⃣ Persiapan VPS

### Login ke VPS via SSH

```bash
ssh root@your-vps-ip
# atau
ssh your-username@your-vps-ip
```

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js 20.x

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node --version  # Should show v20.x.x
npm --version
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Setup PM2 untuk auto-start saat reboot
pm2 startup systemd
# Jalankan command yang muncul (biasanya: sudo env PATH=...)
```

### Install Nginx

```bash
sudo apt install nginx -y

# Start dan enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Cek status
sudo systemctl status nginx
```

---

## 2️⃣ Setup Database

### Opsi A: Menggunakan Neon Database (Recommended)

1. Buat database gratis di [neon.tech](https://neon.tech)
2. Copy connection string yang diberikan
3. Format: `postgresql://username:password@hostname/database?sslmode=require`

### Opsi B: Install PostgreSQL di VPS

```bash
sudo apt install postgresql postgresql-contrib -y

# Masuk ke PostgreSQL
sudo -u postgres psql

# Buat database dan user
CREATE DATABASE wedding_dashboard;
CREATE USER wedding_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE wedding_dashboard TO wedding_user;
\q
```

**Connection string:**

```
postgresql://wedding_user:your_strong_password@localhost:5432/wedding_dashboard
```

---

## 3️⃣ Upload Project ke VPS

### Opsi A: Via Git (Recommended)

```bash
# Di VPS, buat direktori untuk project
cd /var/www
sudo mkdir wedding-dashboard
sudo chown $USER:$USER wedding-dashboard
cd wedding-dashboard

# Clone repository (jika pakai git)
git clone https://github.com/your-username/wedding-dashboard.git .

# Atau buat git repo baru di local, push, lalu clone
```

### Opsi B: Via SCP (jika tidak pakai Git)

```bash
# Di komputer local, zip project (exclude node_modules)
cd /Users/alvin/Documents/projects/wedding/wedding-dashboard
tar -czf wedding-dashboard.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  .

# Upload ke VPS
scp wedding-dashboard.tar.gz root@your-vps-ip:/var/www/

# Di VPS, extract
cd /var/www
mkdir wedding-dashboard
tar -xzf wedding-dashboard.tar.gz -C wedding-dashboard
cd wedding-dashboard
```

---

## 4️⃣ Setup Environment Variables

```bash
cd /var/www/wedding-dashboard

# Buat file .env
nano .env
```

**Isi file .env:**

```env
# Database URL (dari Neon atau PostgreSQL lokal)
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"

# NextAuth Secret (generate dengan: openssl rand -base64 32)
AUTH_SECRET="your_auth_secret_here_32_chars_minimum"
NEXTAUTH_URL="https://dashboard.yourwedding.com"  # Atau http://your-vps-ip:3000

# WhatsApp API (WAHA) - Opsional
WAHA_API_URL="http://localhost:3000"
WAHA_API_KEY="your_waha_api_key"

# Invitation URL (Frontend URL)
NEXT_PUBLIC_INVITATION_URL="https://yourwedding.com"
```

**Generate AUTH_SECRET:**

```bash
openssl rand -base64 32
```

Simpan dengan `Ctrl+X`, lalu `Y`, lalu `Enter`.

---

## 5️⃣ Install Dependencies & Build

```bash
cd /var/www/wedding-dashboard

# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Run database migrations
npm run db:push
# ATAU jika pakai migrations:
# npm run db:migrate

# (Opsional) Seed database dengan default admin
npx prisma db seed

# Build production
npm run build
```

---

## 6️⃣ Setup PM2

```bash
cd /var/www/wedding-dashboard

# Start aplikasi dengan PM2
pm2 start npm --name "wedding-dashboard" -- start

# Setup auto-restart
pm2 save
pm2 startup

# Monitor aplikasi
pm2 status
pm2 logs wedding-dashboard
```

**PM2 Commands:**

```bash
pm2 restart wedding-dashboard   # Restart aplikasi
pm2 stop wedding-dashboard      # Stop aplikasi
pm2 delete wedding-dashboard    # Hapus dari PM2
pm2 logs wedding-dashboard      # Lihat logs
pm2 monit                       # Monitor real-time
```

---

## 7️⃣ Setup Nginx Reverse Proxy

### Buat Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/wedding-dashboard
```

**Isi file (Tanpa SSL):**

```nginx
server {
    listen 80;
    server_name dashboard.yourwedding.com;  # Ganti dengan domain/IP Anda

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Jika menggunakan IP (tanpa domain):**

```nginx
server {
    listen 80;
    server_name your-vps-ip;  # Ganti dengan IP VPS

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Aktifkan Site

```bash
# Buat symbolic link
sudo ln -s /etc/nginx/sites-available/wedding-dashboard /etc/nginx/sites-enabled/

# Test konfigurasi Nginx
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 8️⃣ Setup SSL dengan Let's Encrypt (Jika Pakai Domain)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Dapatkan SSL certificate
sudo certbot --nginx -d dashboard.yourwedding.com

# Certbot akan otomatis update Nginx config
# Certificate akan auto-renew
```

**Cek auto-renewal:**

```bash
sudo certbot renew --dry-run
```

---

## 9️⃣ Firewall Setup (Opsional tapi Recommended)

```bash
# Install UFW jika belum ada
sudo apt install ufw -y

# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Cek status
sudo ufw status
```

---

## 🎯 Deployment Selesai!

### Akses Dashboard:

-   **Dengan Domain + SSL:** `https://dashboard.yourwedding.com`
-   **Dengan Domain (HTTP):** `http://dashboard.yourwedding.com`
-   **Dengan IP:** `http://your-vps-ip`

### Login Default:

```
Email: superadmin@wedding.com
Password: superadmin123
```

⚠️ **PENTING:** Segera ganti password default setelah login pertama kali!

---

## 🔄 Update/Deploy Ulang

Jika ada perubahan code:

```bash
# Di komputer local, push ke git
git add .
git commit -m "Update feature"
git push

# Di VPS
cd /var/www/wedding-dashboard
git pull                    # Pull perubahan terbaru
npm install                 # Install dependencies baru (jika ada)
npm run db:generate         # Generate Prisma client (jika schema berubah)
npm run db:push             # Update database schema (jika perlu)
npm run build               # Build ulang
pm2 restart wedding-dashboard  # Restart aplikasi
```

**Atau jika tidak pakai Git:**

```bash
# Di local, buat tar file
tar -czf wedding-dashboard.tar.gz --exclude=node_modules --exclude=.next .

# Upload ke VPS
scp wedding-dashboard.tar.gz root@your-vps-ip:/var/www/

# Di VPS
cd /var/www/wedding-dashboard
tar -xzf ../wedding-dashboard.tar.gz
npm install
npm run build
pm2 restart wedding-dashboard
```

---

## 🐛 Troubleshooting

### Cek Logs

```bash
# PM2 logs
pm2 logs wedding-dashboard

# Nginx error logs
sudo tail -f /var/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Aplikasi tidak bisa diakses

1. Cek PM2: `pm2 status`
2. Cek Nginx: `sudo systemctl status nginx`
3. Cek port 3000: `netstat -tuln | grep 3000`
4. Cek firewall: `sudo ufw status`

### Database connection error

1. Cek DATABASE_URL di `.env`
2. Test koneksi: `npm run db:generate`
3. Pastikan database bisa diakses dari VPS

### Port sudah digunakan

```bash
# Cek proses di port 3000
sudo lsof -i :3000

# Kill proses jika perlu
sudo kill -9 <PID>
```

---

## 📝 Monitoring & Maintenance

### Setup Monitoring dengan PM2 Plus (Opsional)

```bash
pm2 link <secret_key> <public_key>
```

### Backup Database Reguler

```bash
# Buat script backup
nano /var/www/backup-db.sh
```

**Isi script:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/wedding-dashboard"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database (sesuaikan dengan connection string)
pg_dump -h hostname -U username -d database > $BACKUP_DIR/backup_$DATE.sql

# Hapus backup lebih dari 7 hari
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

```bash
# Jadwalkan dengan crontab
chmod +x /var/www/backup-db.sh
crontab -e

# Tambahkan (backup setiap hari jam 2 pagi):
0 2 * * * /var/www/backup-db.sh
```

---

## 🎉 Selamat! Dashboard Sudah Live!

Jika ada pertanyaan atau masalah, cek troubleshooting section atau buka issue di repository.
