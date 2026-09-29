#!/usr/bin/env sh
set -eu

if [ -z "${BOT_TOKEN:-}" ]; then
  echo "BOT_TOKEN is required" >&2
  exit 1
fi

curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --header "Content-Type: application/json" \
  --data '{"url":"https://oiqeetveldjgywpmteei.supabase.co/functions/v1/webhook"}'
