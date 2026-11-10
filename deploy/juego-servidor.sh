#!/bin/bash
# dmith.app/juego — enciende (o actualiza) el servidor de juegos personalizados.
# Se corre en el servidor:  bash /var/www/dmith-app/deploy/juego-servidor.sh
set -e
cd /var/www/dmith-app && git pull -q

# carpeta donde quedan los juegos y las fotos (fuera del repo, no se pierde al actualizar)
mkdir -p /var/lib/dmith-juego
if [ ! -f /root/juego-admin.txt ]; then
  node -e "console.log(require('crypto').randomBytes(12).toString('hex'))" > /root/juego-admin.txt
  chmod 600 /root/juego-admin.txt
fi
ADMIN=$(cat /root/juego-admin.txt)

pm2 delete juegos >/dev/null 2>&1 || true
PUERTO=8830 DATOS=/var/lib/dmith-juego PAGO_SIMULADO=1 ADMIN_CLAVE=$ADMIN \
  pm2 start /var/www/dmith-app/juego-servidor/server.js --name juegos --max-memory-restart 200M --update-env
pm2 save >/dev/null

# nginx: /juego/api va al servidor; /juego/j/<codigo> abre la página del juego
F=/etc/nginx/sites-available/dmith.app
if ! grep -q "juego/api" "$F"; then
  cp "$F" /root/dmith.app.nginx.antes-juegos
  python3 - "$F" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p).read()
bloque = """
    location ^~ /juego-servidor/ { deny all; }
    location ^~ /juego/api/ {
        client_max_body_size 5m;
        proxy_pass http://127.0.0.1:8830;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    location ^~ /juego/j/ { try_files $uri /juego/j/index.html; }
"""
s = re.sub(r"(server_name[^;]*dmith\.app[^;]*;\n)", lambda m: m.group(1) + bloque, s)
open(p, "w").write(s)
PY
fi
nginx -t && systemctl reload nginx
sleep 1
echo "== listo =="
curl -s https://dmith.app/juego/api/salud; echo
echo "Clave de administrador (guardala): $ADMIN"
