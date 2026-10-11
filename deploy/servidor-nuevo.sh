#!/bin/bash
# Prepara un servidor Ubuntu 24.04 nuevo (Contabo) y levanta MiReparto.
# Uso (como root):  bash servidor-nuevo.sh
set -e
echo "== 1/6 Actualizando el sistema e instalando herramientas =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y nginx certbot python3-certbot-nginx git build-essential python3 sqlite3 ufw curl

echo "== 2/6 Node.js 22 y pm2 =="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2
pm2 startup systemd -u root --hp /root >/dev/null

echo "== 3/6 Firewall (SSH + web) =="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "== 4/6 Descargando MiReparto (repo privado) =="
read -p "Usuario de GitHub [motorolla0875]: " GHU; GHU=${GHU:-motorolla0875}
read -s -p "Token de GitHub (ghp_...): " GHT; echo
cd /root
rm -rf mireparto-backend
git clone "https://$GHU:$GHT@github.com/$GHU/mireparto-backend.git"
cd mireparto-backend
git remote set-url origin "https://github.com/$GHU/mireparto-backend.git"   # no dejamos el token guardado
npm install --omit=dev

echo "== 5/6 Configuración (.env) =="
mkdir -p /root/datos /root/backups
if [ ! -f .env ]; then
cat > .env <<ENV
PORT=5000
DB_PATH=/root/datos/mireparto.db
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
ADMIN_PASSWORD=
MAIL_FROM=no-reply@mireparto.io
RESEND_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
REVENUECAT_SECRET_KEY=
TURNSTILE_SECRET_KEY=
GOOGLE_CLIENT_ID=
GROQ_API_KEY=
GEMINI_API_KEY=
ENV
fi
pm2 delete mireparto-backend >/dev/null 2>&1 || true
pm2 start server.js --name mireparto-backend --max-memory-restart 500M
pm2 save

echo "== 6/6 nginx para mireparto.io =="
cat > /etc/nginx/sites-available/mireparto.io <<'NGX'
server {
    listen 80;
    listen [::]:80;
    server_name mireparto.io www.mireparto.io;
    client_max_body_size 25m;

    location /ws/qr {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGX
ln -sf /etc/nginx/sites-available/mireparto.io /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Copia diaria de la base (3 AM), guarda las últimas 30 en /root/backups
cat > /root/backup-diario.sh <<'BK'
#!/bin/bash
F=/root/backups/mireparto-$(date +%F).db
[ -f /root/datos/mireparto.db ] && sqlite3 /root/datos/mireparto.db ".backup '$F'" && gzip -f "$F"
ls -1t /root/backups/mireparto-*.db.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
BK
chmod +x /root/backup-diario.sh
( crontab -l 2>/dev/null | grep -v backup-diario; echo "0 3 * * * /root/backup-diario.sh" ) | crontab -

sleep 2
echo
echo "=================== LISTO ==================="
curl -s http://127.0.0.1:5000/api/health && echo
pm2 status
echo "IP de este servidor: $(curl -s -4 ifconfig.me)"
