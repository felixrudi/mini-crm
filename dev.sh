#!/bin/bash
# Lokale Entwicklung — SSH-Tunnel zur Hetzner-DB + Vite-Dev-Server
# Usage: ./dev.sh

HETZNER="root@204.168.144.189"
DB_HOST="10.0.1.7"  # twenty-db-1 container IP im coolify-Netz
LOCAL_PORT=5432

echo "🔌 SSH-Tunnel starten (localhost:$LOCAL_PORT → $DB_HOST:5432)..."
ssh -L $LOCAL_PORT:$DB_HOST:5432 $HETZNER -N -q &
TUNNEL_PID=$!

# Warten bis Tunnel steht
sleep 2

if ! nc -z localhost $LOCAL_PORT 2>/dev/null; then
  echo "❌ Tunnel fehlgeschlagen"
  kill $TUNNEL_PID 2>/dev/null
  exit 1
fi

echo "✅ Tunnel läuft (PID $TUNNEL_PID)"
echo "🚀 Dev-Server starten..."

# Dev-Server starten
npm run dev &
DEV_PID=$!

# Beim Beenden beides stoppen
trap "echo ''; echo 'Stopping...'; kill $DEV_PID $TUNNEL_PID 2>/dev/null" INT TERM

wait $DEV_PID
kill $TUNNEL_PID 2>/dev/null
