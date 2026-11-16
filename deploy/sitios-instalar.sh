#!/bin/bash
# Instala/actualiza el servidor del panel de dmith Sitios. Se puede correr las veces que haga falta.
set -e
D=/root/sitios-datos
mkdir -p $D && chmod 700 $D
if [ ! -f $D/.env ]; then
  printf "MP_ACCESS_TOKEN=\nADMIN_KEY=%s\n" "$(openssl rand -hex 12)" > $D/.env
  chmod 600 $D/.env
  echo ">> Creé $D/.env (falta pegar el MP_ACCESS_TOKEN)"
fi
NG=/etc/nginx/sites-available/dmith.app
if ! grep -q sitios-api.conf $NG; then
  cp $NG /root/dmith.app.nginx.bak
  sed -i 's#^\(\s*\)location /voxws {#\1include /var/www/dmith-app/deploy/sitios-api.conf;\n&#' $NG
  if nginx -t; then systemctl reload nginx; echo ">> nginx listo"; else cp /root/dmith.app.nginx.bak $NG; echo ">> ERROR en nginx, dejé todo como estaba"; exit 1; fi
fi
cd /var/www/dmith-app/sitios-servidor
pm2 describe sitios >/dev/null 2>&1 && pm2 restart sitios || pm2 start server.js --name sitios
pm2 save >/dev/null
echo ">> Panel de sitios funcionando"
