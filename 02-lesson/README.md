# 02-lesson

Supabase Edge Functions for Telegram bot homework.

## Endpoints

- `GET /functions/v1/homework` returns the homework #2 JSON.
- `POST /functions/v1/webhook` receives Telegram updates and writes clients/messages to the database.
- `GET /functions/v1/clients` returns clients sorted by latest activity.
- `GET /functions/v1/messages` returns messages sorted from newest to oldest.

## Deploy

```bash
supabase db query --linked --file sql/tables.sql
supabase secrets set BOT_TOKEN=your_telegram_bot_token
supabase functions deploy webhook --no-verify-jwt
supabase functions deploy clients --no-verify-jwt
supabase functions deploy messages --no-verify-jwt
```

Telegram webhook URL:

```txt
https://oiqeetveldjgywpmteei.supabase.co/functions/v1/webhook
```
