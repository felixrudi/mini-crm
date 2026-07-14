#!/bin/bash
# Lokale Entwicklung — startet den Vite-Dev-Server.
# Der SSH-Tunnel zur alten Postgres-DB ist seit der Teable-Migration nicht
# mehr nötig (mini-crm spricht direkt mit teable.hirschfeld.at).
#
# Vite lädt .env NICHT automatisch in process.env für Server-Code, der
# process.env.X direkt liest (z.B. src/lib/server/teable.ts) — nur für
# $env/dynamic|static/private-Imports. Deshalb hier explizit sourcen
# (gleiches Muster wie bei den Node-Tests in tests/*.integration.test.ts).
# Usage: ./dev.sh
set -a
source .env
set +a

npm run dev
