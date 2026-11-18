#!/usr/bin/env bash
# Monta o zip que vai para a VPS: folego-vps.zip
#   npm run empacotar
# O zip leva o site já compilado, o instalador, o serviço e o folego-admin.
# Nunca leva .env.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
rm -rf pacote folego-vps.zip
mkdir -p pacote/folego
cp -a .next/standalone pacote/folego/app
mkdir -p pacote/folego/app/.next
cp -a .next/static pacote/folego/app/.next/static
[ -d public ] && cp -a public pacote/folego/app/public
find pacote/folego/app -name '.env*' -prune -exec rm -rf {} +
rm -rf pacote/folego/app/dados
cp deploy/instalar.sh deploy/folego.service deploy/env.exemplo deploy/admin.mjs pacote/folego/
(cd pacote && zip -qr ../folego-vps.zip folego -x '*.env' -x '*/.env*')
rm -rf pacote
echo "Pronto: folego-vps.zip ($(du -h folego-vps.zip | cut -f1))"
