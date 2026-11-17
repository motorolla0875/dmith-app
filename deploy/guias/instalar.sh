#!/bin/bash
# Guías automáticas de dmith Sitios (dmith.app/sitios/guias/). Usa la misma clave de Groq que tujuego.
# Instalar o actualizar:  bash /var/www/dmith-app/deploy/guias/instalar.sh
set -e
cd /var/www/dmith-app && git pull -q
mkdir -p /root/dmith-guias /var/www/dmith-app/sitios/guias
set -a; [ -f /root/tujuego.env ] && . /root/tujuego.env; set +a
if ! grep -qE "^(GROQ|XAI|GEMINI)_API_KEY=." /root/tujuego.env 2>/dev/null; then
  echo "Falta la clave de Groq (GROQ_API_KEY) en /root/tujuego.env"; exit 1
fi
pm2 delete dmith-guias >/dev/null 2>&1 || true
DIR_CONFIG=/var/www/dmith-app/deploy/guias/config.json DIR_POR_DIA=${DIR_POR_DIA:-5} \
  pm2 start /var/www/dmith-app/deploy/guias/generador.js --name dmith-guias --max-memory-restart 150M --update-env
pm2 save >/dev/null
echo "== listo: guías de dmith Sitios en marcha (ver: pm2 logs dmith-guias) =="
