#!/bin/bash
# Instala/actualiza el servidor de Uma. Se puede correr las veces que haga falta.
set -e
D=/root/uma-datos
mkdir -p $D && chmod 700 $D
if [ ! -f $D/.env ]; then
  printf "GROQ_API_KEY=\nUMA_LIMITE_DIA=40\n" > $D/.env
  chmod 600 $D/.env
  echo ">> Creé $D/.env (falta pegar la GROQ_API_KEY)"
fi
NG=/etc/nginx/sites-available/dmith.app
if ! grep -q uma-api.conf $NG; then
  cp $NG /root/dmith.app.nginx.bak
  sed -i 's#^\(\s*\)location /voxws {#\1include /var/www/dmith-app/deploy/uma-api.conf;\n&#' $NG
  if nginx -t; then systemctl reload nginx; echo ">> nginx listo"; else cp /root/dmith.app.nginx.bak $NG; echo ">> ERROR en nginx, dejé todo como estaba"; exit 1; fi
fi
cd /var/www/dmith-app/uma-servidor
pm2 describe uma >/dev/null 2>&1 && pm2 restart uma || pm2 start server.js --name uma
pm2 save >/dev/null
echo ">> Uma funcionando"
