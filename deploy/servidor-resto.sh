#!/bin/bash
# Instala lo que faltaba del servidor viejo: Tintix (ligas + web), Arca CajaViva y Sol Brujas (cliente y pruebas).
# Uso (como root):  bash servidor-resto.sh
set -e
read -p "Usuario de GitHub [motorolla0875]: " GHU; GHU=${GHU:-motorolla0875}
read -s -p "Token de GitHub (ghp_...): " GHT; echo
read -p "Usuario del admin de Sol Brujas [admin]: " SBU; SBU=${SBU:-admin}
read -s -p "Contraseña del admin de Sol Brujas (mínimo 8): " SBP; echo
clonar() { rm -rf "$2"; git clone -q "https://$GHU:$GHT@github.com/$GHU/$1.git" "$2"; git -C "$2" remote set-url origin "https://github.com/$GHU/$1.git"; }
clave() { node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"; }
proxy() { # $1 dominios  $2 puerto  $3 tamaño máx
cat <<NGX
    client_max_body_size ${3:-10m};
    location / {
        proxy_pass http://127.0.0.1:$2;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
NGX
}

echo "== 1/4 Tintix (ligas, Letravio y versión web) =="
clonar tintix-server /root/tintix-server
cd /root/tintix-server && npm install --omit=dev --silent
pm2 delete tintix-ligas >/dev/null 2>&1 || true
PORT=5001 pm2 start server.js --name tintix-ligas --max-memory-restart 400M
clonar tintix-web /var/www/tintix-web
{ echo "server {"; echo "    listen 80; listen [::]:80;"; echo "    server_name tintix.mireparto.io;";
  echo "    location = /jugar { return 301 /jugar/; }";
  echo "    location /jugar/ { alias /var/www/tintix-web/; index index.html; }";
  proxy x 5001 2m; echo "}"; } > /etc/nginx/sites-available/tintix.mireparto.io
ln -sf /etc/nginx/sites-available/tintix.mireparto.io /etc/nginx/sites-enabled/

echo "== 2/4 Arca CajaViva =="
clonar arca-cajaviva /root/arca-cajaviva
cd /root/arca-cajaviva && npm install --omit=dev --silent
mkdir -p certs-arca
[ -f .env ] || printf "PORT=5300\nAPP_URL=https://arca.cajaviva.app\nJWT_SECRET=%s\nMAIL_FROM=\nRESEND_API_KEY=\nTURNSTILE_SECRET=\nGROQ_API_KEY=\nMELI_CLIENT_ID=\nMELI_CLIENT_SECRET=\nADMIN_USER=\nADMIN_PASS=\n" "$(clave)" > .env
pm2 delete arca-cajaviva >/dev/null 2>&1 || true
pm2 start server.js --name arca-cajaviva --max-memory-restart 500M
{ echo "server {"; echo "    listen 80; listen [::]:80;"; echo "    server_name arca.cajaviva.app;"; proxy x 5300 25m; echo "}"; } > /etc/nginx/sites-available/arca.cajaviva.app
ln -sf /etc/nginx/sites-available/arca.cajaviva.app /etc/nginx/sites-enabled/

echo "== 3/4 Sol Brujas (cliente 5101 y pruebas 5100) =="
for v in "sol-brujas-cliente 5101 0" "sol-brujas 5100 1"; do
  set -- $v
  clonar sol-brujas /root/$1
  cd /root/$1 && npm install --omit=dev --silent && mkdir -p data public/uploads
  [ -f .env ] || printf "PORT=%s\nJWT_SECRET=%s\nADMIN_USER=%s\nADMIN_PASS=%s\nGROQ_API_KEY=\nGROQ_MODELO=openai/gpt-oss-20b\n%s" "$2" "$(clave)" "$SBU" "$SBP" "$([ "$3" = 1 ] && echo 'MODO_DEMO=1')" > .env
  pm2 delete $1 >/dev/null 2>&1 || true
  pm2 start server.js --name $1 --max-memory-restart 400M
done
ufw allow 5100/tcp >/dev/null
{ echo "server {"; echo "    listen 80; listen [::]:80;"; echo "    server_name solbrujas.duckdns.org elhogardelasbrujas.com www.elhogardelasbrujas.com;"; proxy x 5101 10m; echo "}"; } > /etc/nginx/sites-available/solbrujas
ln -sf /etc/nginx/sites-available/solbrujas /etc/nginx/sites-enabled/

echo "== 4/4 nginx, copias diarias y estado =="
pm2 save
nginx -t && systemctl reload nginx
cat > /root/backup-diario.sh <<'BK'
#!/bin/bash
D=$(date +%F); B=/root/backups; mkdir -p $B
copiar() { [ -f "$2" ] && sqlite3 "$2" ".backup '$B/$1-$D.db'" && gzip -f "$B/$1-$D.db"; }
copiar mireparto      /root/datos/mireparto.db
copiar cajaviva       /root/cajaviva/cajaviva.db
copiar arca           /root/arca-cajaviva/cajaviva.db
copiar tintix         /root/tintix-server/tintix.db
copiar solbrujas      /root/sol-brujas-cliente/data/sol-brujas.db
tar czf $B/solbrujas-fotos-$D.tgz -C /root/sol-brujas-cliente/public uploads 2>/dev/null || true
tar czf $B/arca-certs-$D.tgz -C /root/arca-cajaviva certs-arca 2>/dev/null || true
find $B -type f -mtime +30 -delete
BK
chmod +x /root/backup-diario.sh
sleep 3
echo
echo "=================== LISTO ==================="
for x in "tintix 5001 /api/salud" "arca 5300 /" "solbrujas-cliente 5101 /" "solbrujas-pruebas 5100 /"; do set -- $x; printf "%-18s %s\n" "$1:" "$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: arca.cajaviva.app' http://127.0.0.1:$2$3)"; done
pm2 status
