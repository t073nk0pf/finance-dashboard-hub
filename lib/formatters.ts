const compactMoney = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

const percentNumber = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function money(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${compactMoney.format(abs / 1_000_000_000)} млрд ₽`;
  }

  return `${sign}${compactMoney.format(abs / 1_000_000)} млн ₽`;
}

export function moneyShort(value: number): string {
  return compactMoney.format(value / 1_000_000);
}

export function percent(value: number): string {
  return `${percentNumber.format(value * 100)}%`;
}

export function pp(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${percentNumber.format(value)} п.п.`;
}

export function ratio(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "н/д";
  const sign = value > 0 ? "+" : "";
  return `${sign}${percentNumber.format(value * 100)}%`;
}

export const formatMoney = money;
export const formatMoneyShort = moneyShort;
export const formatPercent = percent;
export const formatPp = pp;
export const formatRatio = ratio;
