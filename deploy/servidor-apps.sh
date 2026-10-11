#!/bin/bash
# Instala en el servidor nuevo: dmith.app, CajaViva y Audiolibros Gratis.
# Uso (como root):  bash servidor-apps.sh
set -e
IP=$(curl -s -4 ifconfig.me)
read -p "Usuario de GitHub [motorolla0875]: " GHU; GHU=${GHU:-motorolla0875}
read -s -p "Token de GitHub (ghp_...): " GHT; echo
clonar() { # $1 repo  $2 carpeta
  rm -rf "$2"; git clone -q "https://$GHU:$GHT@github.com/$GHU/$1.git" "$2"
  git -C "$2" remote set-url origin "https://github.com/$GHU/$1.git"
}

echo "== 1/3 dmith.app (sitio) =="
clonar dmith-app /var/www/dmith-app
cp /var/www/dmith-app/deploy/nginx-dmith.app.conf /etc/nginx/sites-available/dmith.app
ln -sf /etc/nginx/sites-available/dmith.app /etc/nginx/sites-enabled/

echo "== 2/3 CajaViva =="
clonar cajaviva /root/cajaviva
cd /root/cajaviva && npm install --omit=dev --silent
if [ ! -f .env ]; then
cat > .env <<ENV
PORT=5200
APP_URL=https://cajaviva.app
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
MAIL_FROM=
MAIL_REPLY_TO=dmith.builds@gmail.com
RESEND_API_KEY=
TURNSTILE_SECRET=
GROQ_API_KEY=
MELI_CLIENT_ID=
MELI_CLIENT_SECRET=
ADMIN_USER=
ADMIN_PASS=
ENV
fi
pm2 delete cajaviva >/dev/null 2>&1 || true
pm2 start server.js --name cajaviva --max-memory-restart 500M
cat > /etc/nginx/sites-available/cajaviva.app <<'NGX'
server {
    listen 80;
    listen [::]:80;
    server_name cajaviva.app www.cajaviva.app;
    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:5200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGX
ln -sf /etc/nginx/sites-available/cajaviva.app /etc/nginx/sites-enabled/

echo "== 3/3 Audiolibros Gratis =="
clonar audiolibros-gratis /root/audiolibros-gratis
cd /root/audiolibros-gratis && npm install --omit=dev --silent
pm2 delete audiolibros >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
sed 's#/home/ubuntu/audiolibros-gratis#/root/audiolibros-gratis#' deploy/nginx-audiolibros.conf > /etc/nginx/sites-available/audiolibros.dmith.app
ln -sf /etc/nginx/sites-available/audiolibros.dmith.app /etc/nginx/sites-enabled/

pm2 save
nginx -t && systemctl reload nginx

# Copias diarias también de CajaViva
cat > /root/backup-diario.sh <<'BK'
#!/bin/bash
D=$(date +%F)
[ -f /root/datos/mireparto.db ] && sqlite3 /root/datos/mireparto.db ".backup '/root/backups/mireparto-$D.db'" && gzip -f /root/backups/mireparto-$D.db
[ -f /root/cajaviva/cajaviva.db ] && sqlite3 /root/cajaviva/cajaviva.db ".backup '/root/backups/cajaviva-$D.db'" && gzip -f /root/backups/cajaviva-$D.db
for a in mireparto cajaviva; do ls -1t /root/backups/$a-*.db.gz 2>/dev/null | tail -n +31 | xargs -r rm -f; done
BK
chmod +x /root/backup-diario.sh

echo
echo "=================== LISTO ==================="
sleep 2
for p in 5000 5200 3050; do printf "puerto $p: "; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$p/; done
pm2 status
echo
echo "Ahora los certificados HTTPS (espera a que cada dominio apunte a $IP):"
for d in "dmith.app www.dmith.app" "cajaviva.app www.cajaviva.app" "audiolibros.dmith.app"; do
  set -- $d
  until [ "$(dig +short $1 @8.8.8.8 | tail -1)" = "$IP" ]; do echo "  esperando DNS de $1..."; sleep 20; done
  args=""; for x in $d; do [ "$(dig +short $x @8.8.8.8 | tail -1)" = "$IP" ] && args="$args -d $x"; done
  certbot --nginx $args --non-interactive --agree-tos -m dmith.builds@gmail.com --redirect || echo "  (falló el certificado de $1, lo vemos)"
done
echo "== Todo terminado =="
