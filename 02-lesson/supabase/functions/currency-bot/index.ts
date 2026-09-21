import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD";

type RateResult =
  | { type: "invalid-currency" }
  | { type: "unsupported-currency"; currency: string }
  | { type: "rate-unavailable" }
  | { type: "rate"; currency: string; rate: number; date?: string };

function getCurrencyCode(text: unknown): string | null {
  const currency = String(text || "").trim().toUpperCase().replace(",", ".");

  if (/^[A-Z]{3}$/.test(currency)) {
    return currency;
  }

  const amountWithCurrency = currency.match(/^\d+(?:\.\d+)?\s*([A-Z]{3})$/);

  return amountWithCurrency ? amountWithCurrency[1] : null;
}

function formatRate(rate: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 6,
  }).format(rate);
}

async function getUsdRate(messageText: unknown): Promise<RateResult> {
  const currency = getCurrencyCode(messageText);

  if (!currency) {
    return { type: "invalid-currency" };
  }

  if (currency === "USD") {
    return { type: "rate", currency, rate: 1 };
  }

  try {
    const response = await fetch(FRANKFURTER_URL);

    if (!response.ok) {
      throw new Error("Frankfurter API request failed");
    }

    const data = await response.json();
    const rate = data.rates?.[currency];

    return typeof rate === "number"
      ? { type: "rate", currency, rate, date: data.date }
      : { type: "unsupported-currency", currency };
  } catch {
    return { type: "rate-unavailable" };
  }
}

function getReplyText(result: RateResult): string {
  if (result.type === "invalid-currency") {
    return "Отправь код валюты, например: EUR, 1EUR, GBP или JPY.";
  }

  if (result.type === "unsupported-currency") {
    return "Frankfurter не предоставляет курс для " + result.currency + ". Попробуй EUR, GBP или JPY.";
  }

  if (result.type === "rate-unavailable") {
    return "Не удалось получить курс. Попробуй еще раз чуть позже.";
  }

  const date = result.date ? "\nДата курса: " + result.date : "";
  return "1 USD = " + formatRate(result.rate) + " " + result.currency + date;
}

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string): Promise<void> {
  const response = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error("Telegram API request failed");
  }
}

async function handleTelegramUpdate(update: unknown, botToken: string): Promise<void> {
  const message = (update as { message?: { chat?: { id?: number | string }; text?: string } })?.message;
  const chatId = message?.chat?.id;

  if (chatId === undefined || chatId === null) {
    return;
  }

  const result = await getUsdRate(message?.text);
  await sendTelegramMessage(botToken, chatId, getReplyText(result));
}

export default {
  fetch: withSupabase({ auth: ["none" as never, "secret"] }, async (req, ctx) => {
    if (req.method === "GET") {
      return Response.json({
        message: "Currency Telegram Bot webhook is running on Supabase Edge.",
        webhook: "POST /functions/v1/currency-bot",
        authMode: ctx.authMode,
      });
    }

    if (req.method !== "POST") {
      return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
    }

    const botToken = Deno.env.get("BOT_TOKEN");

    if (!botToken) {
      return Response.json({ ok: false, error: "BOT_TOKEN is missing" }, { status: 500 });
    }

    try {
      await handleTelegramUpdate(await req.json(), botToken);
      return Response.json({ ok: true, authMode: ctx.authMode });
    } catch (error) {
      console.error(error);
      return Response.json({ ok: false }, { status: 502 });
    }
  }),
};
