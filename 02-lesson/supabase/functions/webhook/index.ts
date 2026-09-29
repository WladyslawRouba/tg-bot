import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD";

type RateResult =
  | { type: "invalid-currency" }
  | { type: "unsupported-currency"; currency: string }
  | { type: "rate-unavailable" }
  | { type: "rate"; currency: string; rate: number; date?: string };

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id?: number;
  date?: number;
  text?: string;
  chat?: { id?: number };
  from?: TelegramUser;
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are missing");
  }

  return createClient(url, serviceRoleKey);
}

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

async function sendTelegramMessage(botToken: string, chatId: number, text: string): Promise<unknown> {
  const response = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.description || "Telegram API request failed");
  }

  return data.result;
}

function messageDate(message: TelegramMessage): string {
  return message.date
    ? new Date(message.date * 1000).toISOString()
    : new Date().toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return Response.json({
      message: "Telegram webhook is running on Supabase Edge.",
      webhook: "POST /functions/v1/webhook",
    });
  }

  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const botToken = Deno.env.get("BOT_TOKEN");

  if (!botToken) {
    return Response.json({ ok: false, error: "BOT_TOKEN is missing" }, { status: 500 });
  }

  const update = await req.json() as TelegramUpdate;
  const message = update.message;
  const chatId = message?.chat?.id;
  const telegramUserId = message?.from?.id ?? chatId;

  if (!message || chatId === undefined || telegramUserId === undefined) {
    return Response.json({ ok: true, skipped: true });
  }

  const admin = getSupabaseAdmin();
  const inboundAt = messageDate(message);

  const { data: client, error: clientError } = await admin
    .from("clients")
    .upsert({
      telegram_user_id: telegramUserId,
      chat_id: chatId,
      username: message.from?.username ?? null,
      first_name: message.from?.first_name ?? null,
      last_name: message.from?.last_name ?? null,
      last_message_at: inboundAt,
      last_client_message_at: inboundAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "telegram_user_id" })
    .select()
    .single();

  if (clientError) {
    console.error(clientError);
    return Response.json({ ok: false, error: "Client sync failed" }, { status: 500 });
  }

  const { error: inboundError } = await admin
    .from("messages")
    .insert({
      client_id: client.id,
      telegram_update_id: update.update_id ?? null,
      telegram_message_id: message.message_id ?? null,
      direction: "client",
      text: message.text ?? "",
      payload: update,
      created_at: inboundAt,
    });

  if (inboundError) {
    console.error(inboundError);
    return Response.json({ ok: false, error: "Inbound message save failed" }, { status: 500 });
  }

  const replyText = getReplyText(await getUsdRate(message.text));
  const sentMessage = await sendTelegramMessage(botToken, chatId, replyText);
  const outboundAt = new Date().toISOString();

  const { error: outboundError } = await admin
    .from("messages")
    .insert({
      client_id: client.id,
      telegram_update_id: update.update_id ?? null,
      telegram_message_id: (sentMessage as { message_id?: number })?.message_id ?? null,
      direction: "bot",
      text: replyText,
      payload: sentMessage,
      created_at: outboundAt,
    });

  if (outboundError) {
    console.error(outboundError);
    return Response.json({ ok: false, error: "Outbound message save failed" }, { status: 500 });
  }

  const { error: updateClientError } = await admin
    .from("clients")
    .update({
      last_message_at: outboundAt,
      last_bot_message_at: outboundAt,
      updated_at: outboundAt,
    })
    .eq("id", client.id);

  if (updateClientError) {
    console.error(updateClientError);
    return Response.json({ ok: false, error: "Client activity update failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
});
