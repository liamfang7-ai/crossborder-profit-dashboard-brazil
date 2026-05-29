const mexicoTimeZone = "America/Mexico_City";

export type MexicoRangeType =
  | "today"
  | "7d"
  | "month"
  | "30d"
  | "90d"
  | "custom";

function getMexicoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: mexicoTimeZone,
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

function mexicoLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const mexicoParts = getMexicoParts(new Date(utcGuess));
  const mexicoAsUtc = Date.UTC(
    mexicoParts.year,
    mexicoParts.month - 1,
    mexicoParts.day,
    mexicoParts.hour,
    mexicoParts.minute,
    mexicoParts.second,
  );
  const offset = mexicoAsUtc - utcGuess;

  return new Date(utcGuess - offset);
}

export function formatMexicoTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: mexicoTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatMexicoDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: mexicoTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function mexicoDateInputValue(date: Date) {
  const parts = getMexicoParts(date);

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

export function mexicoDateInputToStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return mexicoLocalToUtc(year, month, day, 0, 0, 0);
}

export function mexicoDateInputToEnd(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return mexicoLocalToUtc(year, month, day, 23, 59, 59);
}

export function getMexicoDateRange(
  rangeType: MexicoRangeType,
  customStartDate: string,
  customEndDate: string,
) {
  const now = new Date();
  const mexicoNow = getMexicoParts(now);

  if (rangeType === "today") {
    return {
      start: mexicoLocalToUtc(mexicoNow.year, mexicoNow.month, mexicoNow.day),
      end: now,
    };
  }

  if (rangeType === "month") {
    return {
      start: mexicoLocalToUtc(mexicoNow.year, mexicoNow.month, 1),
      end: now,
    };
  }

  if (rangeType === "custom") {
    return {
      start: mexicoDateInputToStart(customStartDate),
      end: mexicoDateInputToEnd(customEndDate),
    };
  }

  const days = rangeType === "7d" ? 7 : rangeType === "30d" ? 30 : 90;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    start,
    end: now,
  };
}

export function getDefaultMexicoMonthRange() {
  const now = new Date();
  const mexicoNow = getMexicoParts(now);

  return {
    start: mexicoLocalToUtc(mexicoNow.year, mexicoNow.month, 1).toISOString(),
    end: now.toISOString(),
  };
}

export function getMexicoRetentionCutoff(days = 90) {
  const now = new Date();
  const mexicoNow = getMexicoParts(now);
  const startOfToday = mexicoLocalToUtc(
    mexicoNow.year,
    mexicoNow.month,
    mexicoNow.day,
  );

  startOfToday.setUTCDate(startOfToday.getUTCDate() - days);

  return startOfToday;
}

export function getMexicoDateBounds(referenceDate = new Date()) {
  const maxDate = mexicoDateInputValue(referenceDate);
  const minDateValue = getMexicoRetentionCutoff(90);

  return {
    minDate: mexicoDateInputValue(minDateValue),
    maxDate,
  };
}

export function validateMexicoCustomRange(
  startDate: string,
  endDate: string,
  referenceDate = new Date(),
) {
  const { minDate, maxDate } = getMexicoDateBounds(referenceDate);

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
