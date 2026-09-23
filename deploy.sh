#!/bin/bash
# Deploy mini-crm auf Hetzner (crm.hirschfeld.at)
# Usage: ./deploy.sh
# Voraussetzung: SSH-Key für root@204.168.144.189 hinterlegt

set -e

HETZNER="root@204.168.144.189"
APP_ID="ld4mpvsus77cn8gs7ocdxjtm"
COMPOSE_PATH="/data/coolify/applications/$APP_ID/docker-compose.yaml"
REMOTE_BUILD="/tmp/mini-crm"

COMMIT=$(git rev-parse --short HEAD)
TAG="${APP_ID}:${COMMIT}"

echo "→ Deploy mini-crm @ $COMMIT"

# 1. Source syncen (kein .env, kein node_modules, kein .git)
echo "→ rsync..."
ssh "$HETZNER" "rm -rf $REMOTE_BUILD && mkdir -p $REMOTE_BUILD"
rsync -a --exclude='node_modules' --exclude='.git' --exclude='.env' --exclude='.env.local' ./ "$HETZNER:$REMOTE_BUILD/"

# 2. Docker build
echo "→ docker build $TAG..."
ssh "$HETZNER" "docker build -t $TAG $REMOTE_BUILD/ 2>&1 | tail -5"

# 3. docker-compose image-tag aktualisieren
echo "→ image-tag setzen..."
ssh "$HETZNER" "sed -i \"s|${APP_ID}:.*'|${APP_ID}:${COMMIT}'|\" $COMPOSE_PATH"

# 4. Restart
echo "→ restart..."
ssh "$HETZNER" "cd /data/coolify/applications/$APP_ID && docker compose up -d --force-recreate 2>&1 | tail -3"

# 5. Health-Check
# Seit dem zentralen Auth-Hook (hooks.server.ts) liefert "/" ohne gültige
# Sitzung korrekt einen Redirect zum Login statt 200 — 302/303 sind hier also
# genauso "gesund" wie 200. Nur 5xx, Timeouts oder Connection-Refused (leerer
# $STATUS) bedeuten einen kaputten Deploy.
sleep 4
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://crm.hirschfeld.at/)
if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "303" ]; then
  echo "✓ Live @ crm.hirschfeld.at (HTTP $STATUS)"
else
  echo "⚠ HTTP $STATUS — Logs prüfen:"
  ssh "$HETZNER" "docker logs ${APP_ID}-155625765478 2>&1 | tail -20"
fi

# 6. Kritische Env-Variablen im laufenden Container prüfen
# deploy.sh baut/startet den Container direkt per SSH+docker, komplett an
# Coolifys eigener Deploy-Pipeline vorbei. Env-Änderungen, die nur über die
# Coolify-UI/API gesetzt werden, landen dadurch NIE in der echten Server-.env
# (die der Container per env_file lädt) — sie bleiben in Coolifys Datenbank
# stecken, ohne dass hier irgendwas fehlschlägt (Vorfall 23.09.2026: SESSION_SECRET
# fehlte, Login gab 503, "/" antwortete trotzdem 302 und sah "gesund" aus).
# Diese Prüfung macht genau das laut, statt es erst beim nächsten Login-Versuch
# zu bemerken.
echo "→ kritische Env-Variablen prüfen..."
MISSING=$(ssh "$HETZNER" "docker exec ${APP_ID}-155625765478 sh -c '
  for v in SESSION_SECRET CRM_PASSWORD CRM_API_KEY TEABLE_API_KEY; do
    eval val=\\\$\$v
    [ -z \"\$val\" ] && echo \$v
  done
  true
'")
if [ -n "$MISSING" ]; then
  echo "⚠ Fehlende Env-Variable(n) im laufenden Container:"
  echo "$MISSING" | sed 's/^/    /'
  echo "  → vermutlich in Coolify gesetzt, aber nie in $COMPOSE_PATH's env_file (.env) gelandet."
  echo "  → von Hand nachtragen: ssh $HETZNER \"nano \$(dirname $COMPOSE_PATH)/.env\" und neu starten."
else
  echo "✓ SESSION_SECRET, CRM_PASSWORD, CRM_API_KEY, TEABLE_API_KEY alle gesetzt"
fi
