#!/bin/bash
# Voxelium — enciende (o actualiza) el servidor de salas para jugar en línea.
# Se corre en el servidor:  bash /var/www/dmith-app/deploy/voxelium-servidor.sh
set -e
cd /var/www/dmith-app && git pull -q
cd voxelium-servidor && npm install --omit=dev --no-audit --no-fund --silent
pm2 delete voxelium >/dev/null 2>&1 || true
PUERTO=8820 pm2 start server.js --name voxelium --max-memory-restart 300M --update-env
pm2 save >/dev/null

# nginx: /voxws va al servidor de salas; la carpeta del servidor no se puede ver desde la web
F=/etc/nginx/sites-available/dmith.app
if ! grep -q voxws "$F"; then
  cp "$F" /root/dmith.app.nginx.antes-voxelium
  python3 - "$F" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p).read()
bloque = """
    location ^~ /voxelium-servidor/ { deny all; }
    location /voxws {
        proxy_pass http://127.0.0.1:8820;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
"""
s = re.sub(r"(server_name[^;]*dmith\.app[^;]*;\n)", lambda m: m.group(1) + bloque, s)
open(p, "w").write(s)
PY
fi
if nginx -t 2>/dev/null; then systemctl reload nginx; else echo "ERROR en nginx: se deja como estaba"; cp /root/dmith.app.nginx.antes-voxelium "$F"; nginx -t && systemctl reload nginx; exit 1; fi
sleep 1
echo
echo "Prueba:"; curl -s https://dmith.app/voxws/estado; echo
echo "LISTO: servidor de Voxelium encendido"
