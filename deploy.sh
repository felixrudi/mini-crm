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

# 2. Docker build (TEABLE_API_KEY wird zur Build-Zeit gebraucht, SvelteKit
#    analysiert Server-Module beim Build und der Client wirft fail-fast ohne Key)
TEABLE_API_KEY=$(grep '^TEABLE_API_KEY=' .env | cut -d= -f2-)
echo "→ docker build $TAG..."
ssh "$HETZNER" "docker build --build-arg TEABLE_API_KEY='$TEABLE_API_KEY' -t $TAG $REMOTE_BUILD/ 2>&1 | tail -5"

# 3. docker-compose image-tag aktualisieren
echo "→ image-tag setzen..."
ssh "$HETZNER" "sed -i \"s|${APP_ID}:.*'|${APP_ID}:${COMMIT}'|\" $COMPOSE_PATH"

# 4. Restart
echo "→ restart..."
ssh "$HETZNER" "cd /data/coolify/applications/$APP_ID && docker compose up -d --force-recreate 2>&1 | tail -3"

# 5. Health-Check
sleep 4
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://crm.hirschfeld.at/)
if [ "$STATUS" = "200" ]; then
  echo "✓ Live @ crm.hirschfeld.at (HTTP $STATUS)"
else
  echo "⚠ HTTP $STATUS — Logs prüfen:"
  ssh "$HETZNER" "docker logs ${APP_ID}-155625765478 2>&1 | tail -20"
fi
