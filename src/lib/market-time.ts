import { timezone } from "@/lib/market-config";

export type MarketRangeType =
  | "today"
  | "7d"
  | "month"
  | "30d"
  | "90d"
  | "custom";

function getMarketParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function marketLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const marketParts = getMarketParts(new Date(utcGuess));
  const marketAsUtc = Date.UTC(
    marketParts.year,
    marketParts.month - 1,
    marketParts.day,
    marketParts.hour,
    marketParts.minute,
    marketParts.second,
  );
  const offset = marketAsUtc - utcGuess;

  return new Date(utcGuess - offset);
}

export function formatMarketTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatMarketDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function marketDateInputValue(date: Date) {
  const parts = getMarketParts(date);

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

export function marketDateInputToStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return marketLocalToUtc(year, month, day, 0, 0, 0);
}

export function marketDateInputToEnd(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return marketLocalToUtc(year, month, day, 23, 59, 59);
}

export function getMarketDateRange(
  rangeType: MarketRangeType,
  customStartDate: string,
  customEndDate: string,
) {
  const now = new Date();
  const marketNow = getMarketParts(now);

  if (rangeType === "today") {
    return {
      start: marketLocalToUtc(marketNow.year, marketNow.month, marketNow.day),
      end: now,
    };
  }

  if (rangeType === "month") {
    return {
      start: marketLocalToUtc(marketNow.year, marketNow.month, 1),
      end: now,
    };
  }

  if (rangeType === "custom") {
    return {
      start: marketDateInputToStart(customStartDate),
      end: marketDateInputToEnd(customEndDate),
    };
  }

  const days = rangeType === "7d" ? 7 : rangeType === "30d" ? 30 : 90;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    start,
    end: now,
  };
}

export function getDefaultMarketMonthRange() {
  const now = new Date();
  const marketNow = getMarketParts(now);

  return {
    start: marketLocalToUtc(marketNow.year, marketNow.month, 1).toISOString(),
    end: now.toISOString(),
  };
}

export function getMarketRetentionCutoff(days = 90) {
  const now = new Date();
  const marketNow = getMarketParts(now);
  const startOfToday = marketLocalToUtc(
    marketNow.year,
    marketNow.month,
    marketNow.day,
  );

  startOfToday.setUTCDate(startOfToday.getUTCDate() - days);

  return startOfToday;
}

export function getMarketDateBounds(referenceDate = new Date()) {
  const maxDate = marketDateInputValue(referenceDate);
  const minDateValue = getMarketRetentionCutoff(90);

  return {
    minDate: marketDateInputValue(minDateValue),
    maxDate,
  };
}

export function validateMarketCustomRange(
  startDate: string,
  endDate: string,
  referenceDate = new Date(),
) {
  const { minDate, maxDate } = getMarketDateBounds(referenceDate);

  if (
    !startDate ||
    !endDate ||
    startDate < minDate ||
    endDate > maxDate ||
    startDate > endDate
  ) {
    return {
      ok: false,
      message: "系统仅保留最近 90 天订单数据，请选择最近 90 天内的日期范围。",
    };
  }

  return {
    ok: true,
    message: "",
  };
}
