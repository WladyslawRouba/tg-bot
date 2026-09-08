export function getCurrencyCode(text) {
  const currency = String(text || '').trim().toUpperCase().replace(',', '.');

  if (/^[A-Z]{3}$/.test(currency)) {
    return currency;
  }

  const amountWithCurrency = currency.match(/^\d+(?:\.\d+)?\s*([A-Z]{3})$/);

  return amountWithCurrency ? amountWithCurrency[1] : null;
}

export function formatRate(rate) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 6,
  }).format(rate);
}
