# Telegram webhook на Fastify

В `03` основной endpoint:

```text
POST /webhook/telegram
```

Сервер читает `BOT_TOKEN` из файла `03/.env` и не выводит токен в лог.

Запуск:

```bash
npm install
npm start
```

Для локальной разработки с Cloudflare tunnel:

```bash
npm run tunnel
```

После этого зарегистрируйте webhook:

```bash
npm run set-webhook -- https://example.trycloudflare.com
```

Если передать только домен, путь `/webhook/telegram` добавится автоматически.

Чтобы получить курс относительно доллара, отправьте боту код валюты:

```text
EUR
```

Также поддерживается запись с числом перед кодом:

```text
1EUR
1 EUR
```

Бот ответит в формате:

```text
1 USD = 0,86371 EUR
Дата курса: 2026-09-02
```

Курсы берутся из Frankfurter с базовой валютой `USD`. Если валюты нет в данных сервиса, бот сообщит об этом.

Для Vercel добавлен serverless entrypoint `api/index.js`. Он направляет публичный путь `/webhook/telegram` в Fastify endpoint.

## Архитектура

- `src/application` — use cases: получение курса и обработка Telegram update.
- `src/domain` — чистые операции с кодом и форматированием валюты.
- `src/adapters` — HTTP-интеграции с Frankfurter и Telegram.
- `server.js` — composition root: создаёт зависимости и подключает Fastify endpoint.
