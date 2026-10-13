#!/bin/bash
# Se corre UNA vez: crea la clave para entrar a GitHub, la clave de cifrado y la tarea diaria.
set -e
mkdir -p /root/.ssh
[ -f /root/.ssh/respaldo_github ] || ssh-keygen -q -t ed25519 -N "" -C "respaldo-contabo" -f /root/.ssh/respaldo_github
[ -f /root/.respaldo-clave ] || openssl rand -base64 32 | tr -d '\n' > /root/.respaldo-clave
chmod 600 /root/.respaldo-clave /root/.ssh/respaldo_github
cp /var/www/dmith-app/deploy/respaldo-github.sh /root/respaldo-github.sh && chmod +x /root/respaldo-github.sh
# 3:30 AM todos los días (reemplaza la copia local de las 3, que ahora corre adentro)
( crontab -l 2>/dev/null | grep -v -e backup-diario -e respaldo-github; echo "30 3 * * * /root/respaldo-github.sh >> /root/respaldo-github.log 2>&1" ) | crontab -
echo
echo "================ 1) CLAVE PARA GITHUB (Deploy key) ================"
cat /root/.ssh/respaldo_github.pub
echo
echo "================ 2) CLAVE DE CIFRADO — GUARDALA FUERA DEL SERVIDOR ================"
cat /root/.respaldo-clave; echo
echo "Sin esta clave no se pueden abrir los respaldos. Guardala en tu gestor de contraseñas o en un papel."
