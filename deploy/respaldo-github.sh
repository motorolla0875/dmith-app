#!/bin/bash
# Copia de seguridad FUERA del servidor: todos los días (3:30 AM) cifra las copias
# y las sube al repo privado github.com/motorolla0875/respaldos-servidor.
# Sube las bases de los últimos 7 días + las fotos, certificados de ARCA y archivos .env de hoy.
# El repo se reescribe cada día (un solo commit), así no crece para siempre.
set -euo pipefail
B=/root/backups
R=/root/respaldo-repo
CLAVE=/root/.respaldo-clave
KEY=/root/.ssh/respaldo_github
D=$(date +%F)

/root/backup-diario.sh                       # primero hace las copias locales de hoy

# Claves y configuración de cada app (.env)
( cd /root && ls -d */.env 2>/dev/null | xargs -r tar czf "$B/claves-env-$D.tgz" ) || true

rm -rf "$R"; mkdir -p "$R"; cd "$R"
git init -q -b main
git config user.name "Servidor Contabo"; git config user.email "dmith.builds@gmail.com"

cifrar() {  # cifra un archivo; si pasa de 90 MB lo corta en partes (GitHub no acepta más de 100 MB)
  local f="$1" n; n=$(basename "$f")
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$CLAVE" -in "$f" -out "$n.enc"
  if [ "$(stat -c%s "$n.enc")" -gt 94371840 ]; then split -b 90m -d "$n.enc" "$n.enc.parte-"; rm "$n.enc"; fi
}
find "$B" -maxdepth 1 -name '*.db.gz' -mtime -7 -print0 | while IFS= read -r -d '' f; do cifrar "$f"; done
for f in "$B"/solbrujas-fotos-"$D".tgz "$B"/arca-certs-"$D".tgz "$B"/claves-env-"$D".tgz; do [ -f "$f" ] && cifrar "$f"; done

cat > LEEME.txt <<TXT
Copias de seguridad del servidor (Contabo 147.93.185.154) — $D
Están cifradas. Para abrir una (en la Mac o en un servidor nuevo):
  openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:'TU-CLAVE-DE-RESPALDO' -in ARCHIVO.enc -out ARCHIVO
Si está en partes:  cat ARCHIVO.enc.parte-* > ARCHIVO.enc   y después el comando de arriba.
Los .db.gz se descomprimen con:  gunzip ARCHIVO.db.gz
TXT

git add -A
git commit -q -m "Respaldo $D"
GIT_SSH_COMMAND="ssh -i $KEY -o StrictHostKeyChecking=accept-new" \
  git push -q --force git@github.com:motorolla0875/respaldos-servidor.git main
echo "Respaldo $D subido a GitHub: $(ls | wc -l) archivos, $(du -sh --exclude=.git . | cut -f1)"
