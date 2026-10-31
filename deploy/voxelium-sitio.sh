#!/bin/bash
# voxelium.app — página de presentación (voxelium-sitio/) y el juego en /jugar/
# Se corre en el servidor (como root):  bash /var/www/dmith-app/deploy/voxelium-sitio.sh
# Se puede volver a correr cuando quieras: actualiza la página y el juego a la última versión.
set -e
cd /var/www/dmith-app && git pull -q

# el juego: la misma versión que está en la web (repo público)
J=/var/www/voxelium-juego
if [ -d "$J/.git" ]; then git -C "$J" fetch -q --depth 1 origin main && git -C "$J" reset -q --hard origin/main
else rm -rf "$J"; git clone -q --depth 1 https://github.com/motorolla0875/motorolla0875.github.io.git "$J"; fi
echo "Juego: $(git -C $J log --oneline -1)"

# la versión congelada de portales (rama portales-v2) para la app de Microsoft Store, en /windows/
P=/var/www/voxelium-portales
if [ -d "$P/.git" ]; then git -C "$P" fetch -q --depth 1 origin portales-v2 && git -C "$P" reset -q --hard FETCH_HEAD
else rm -rf "$P"; git clone -q --depth 1 -b portales-v2 https://github.com/motorolla0875/motorolla0875.github.io.git "$P"; fi
echo "Portales: $(git -C $P log --oneline -1)"

F=/etc/nginx/sites-available/voxelium.app
if [ ! -f "$F" ] || ! grep -q "voxelium-sitio" "$F"; then
cat > "$F" <<'NGX'
server {
    listen 80;
    listen [::]:80;
    server_name voxelium.app www.voxelium.app;
    root /var/www/dmith-app/voxelium-sitio;
    index index.html;
    location = /jugar { return 301 /jugar/; }
    location /jugar/ {
        alias /var/www/voxelium-juego/bloques/;
        index index.html;
        add_header Cache-Control "no-cache";
    }
    include /var/www/dmith-app/voxelium-windows/nginx.conf;
    location / { try_files $uri $uri/ =404; }
}
NGX
ln -sf "$F" /etc/nginx/sites-enabled/voxelium.app
fi
# /windows/ (Microsoft Store) en el sitio que ya existía
grep -q "voxelium-windows/nginx.conf" "$F" || sed -i '0,/location \/ {/s//include \/var\/www\/dmith-app\/voxelium-windows\/nginx.conf;\n    location \/ {/' "$F"
if ! nginx -t 2>/dev/null; then sed -i '/voxelium-windows\/nginx.conf/d' "$F"; echo "La parte /windows/ dio error y la saqué (el resto sigue igual). Copia este mensaje y mándaselo a Claude."; nginx -t; fi
# la dirección principal abre el juego directo (las páginas legales, app-ads.txt, robots y sitemap siguen saliendo de voxelium-sitio)
if ! grep -q "location @sitio" "$F"; then
  cp "$F" /root/voxelium.app.nginx.antes
  sed -i 's#location / { try_files $uri $uri/ =404; }#location / { root /var/www/voxelium-juego/bloques; try_files $uri $uri/ @sitio; add_header Cache-Control "no-cache"; }\n    location @sitio { root /var/www/dmith-app/voxelium-sitio; try_files $uri $uri/ =404; }#g' "$F"
  if ! nginx -t 2>/dev/null; then cp /root/voxelium.app.nginx.antes "$F"; echo "El cambio de la página principal dio error y lo deshice (sigue como antes). Copia este mensaje y mándaselo a Claude."; nginx -t; fi
fi
systemctl reload nginx

# certificado (el candado): .app solo abre con https
if ! grep -q "ssl_certificate" "$F"; then
  IP=$(curl -s -4 ifconfig.me)
  args=""; for x in voxelium.app www.voxelium.app; do [ "$(getent ahostsv4 $x | awk 'NR==1{print $1}')" = "$IP" ] && args="$args -d $x"; done
  if [ -z "$args" ]; then echo "Los DNS de voxelium.app todavía no apuntan a $IP. Espera un rato y vuelve a correr este comando."; exit 1; fi
  certbot --nginx $args --non-interactive --agree-tos -m dmith.builds@gmail.com --redirect || { echo "Falló el certificado. Copia este mensaje y mándaselo a Claude."; exit 1; }
  echo "Certificado listo para:$args"
fi

echo
printf "Página: "; curl -s -o /dev/null -w "%{http_code}\n" https://voxelium.app/
printf "Juego:  "; curl -s -o /dev/null -w "%{http_code}\n" https://voxelium.app/jugar/
printf "Inicio con el juego: "; curl -s https://voxelium.app/ | grep -q "juego de construir con bloques" && echo SI || echo NO
printf "Privacidad: "; curl -s -o /dev/null -w "%{http_code}\n" https://voxelium.app/privacidad/
printf "Sitemap: "; curl -s -o /dev/null -w "%{http_code}\n" https://voxelium.app/sitemap.xml
printf "Windows: "; curl -s -o /dev/null -w "%{http_code}\n" https://voxelium.app/windows/
echo "LISTO: https://voxelium.app"
