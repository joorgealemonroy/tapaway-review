/** A weekly wall-clock cutoff belongs to the business timezone, not the visitor's. */
export interface WeeklyCutoffConfig {
  weekday: number;
  hour: number;
  minute: number;
  timeZone: string;
  label: string;
  deliveryLabel: string;
}

export const DEFAULT_WEEKLY_CUTOFF: Readonly<WeeklyCutoffConfig> = {
  weekday: 5,
  hour: 23,
  minute: 0,
  timeZone: "America/Los_Angeles",
  label: "Order cutoff",
  deliveryLabel: "Sunday delivery",
};

const formatters = new Map<string, Intl.DateTimeFormat>();
const DAY = 24 * 60 * 60 * 1000;

function formatter(timeZone: string): Intl.DateTimeFormat {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    formatters.set(timeZone, value);
  }
  return value;
}

function wallTimestamp(date: Date, timeZone: string): number {
  const parts: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function utcForWallTime(wall: number, timeZone: string): number {
  // Sample both sides of a possible offset transition. Resolve repeated times
  // to the first occurrence, and skipped times forward by the DST gap.
  const offsets = new Set<number>();
  for (const delta of [-1.5 * DAY, 0, 1.5 * DAY]) {
    const sample = wall + delta;
    offsets.add(wallTimestamp(new Date(sample), timeZone) - sample);
  }
  const candidates = [...offsets].map(offset => {
    const utc = wall - offset;
    return { utc, wall: wallTimestamp(new Date(utc), timeZone) };
  });
  const exact = candidates.filter(candidate => candidate.wall === wall);
  if (exact.length) return Math.min(...exact.map(candidate => candidate.utc));
  const forward = candidates.filter(candidate => candidate.wall > wall)
    .sort((a, b) => a.wall - b.wall || a.utc - b.utc);
  if (forward.length) return forward[0].utc;
  throw new RangeError("This cutoff time could not be resolved");
}

export function parseWeeklyCutoffConfig(value?: unknown): WeeklyCutoffConfig {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const integer = (key: string, max: number, fallback: number) => {
    const raw = source[key];
    const number = typeof raw === "number" || (typeof raw === "string" && /^\d+$/.test(raw)) ? Number(raw) : NaN;
    return Number.isInteger(number) && number >= 0 && number <= max ? number : fallback;
  };
  let timeZone = typeof source.timeZone === "string" ? source.timeZone.trim() : DEFAULT_WEEKLY_CUTOFF.timeZone;
  try { formatter(timeZone); } catch { timeZone = DEFAULT_WEEKLY_CUTOFF.timeZone; }
  return {
    weekday: integer("weekday", 6, DEFAULT_WEEKLY_CUTOFF.weekday),
    hour: integer("hour", 23, DEFAULT_WEEKLY_CUTOFF.hour),
    minute: integer("minute", 59, DEFAULT_WEEKLY_CUTOFF.minute),
    timeZone,
    label: typeof source.label === "string" && source.label.trim() ? source.label.trim().slice(0, 80) : DEFAULT_WEEKLY_CUTOFF.label,
    deliveryLabel: typeof source.deliveryLabel === "string" ? source.deliveryLabel.trim().slice(0, 80) : DEFAULT_WEEKLY_CUTOFF.deliveryLabel,
  };
}

export function nextWeeklyCutoff(now: Date, value: Partial<WeeklyCutoffConfig> = DEFAULT_WEEKLY_CUTOFF): Date {
  const config = parseWeeklyCutoffConfig(value);
  const localNow = new Date(wallTimestamp(now, config.timeZone));
  const daysUntil = (config.weekday - localNow.getUTCDay() + 7) % 7;
  let wall = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + daysUntil, config.hour, config.minute);
  let cutoff = utcForWallTime(wall, config.timeZone);
  if (cutoff <= now.getTime()) {
    wall += 7 * DAY;
    cutoff = utcForWallTime(wall, config.timeZone);
  }
  return new Date(cutoff);
}

export function cutoffScheduleLabel(cutoff: Date, config: WeeklyCutoffConfig): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: config.timeZone, weekday: "short" }).format(cutoff);
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone, hour: "numeric", ...(config.minute ? { minute: "2-digit" as const } : {}), hour12: true,
  }).format(cutoff);
  const zone = config.timeZone === "America/Los_Angeles" ? "PT" : new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone, timeZoneName: "short",
  }).formatToParts(cutoff).find(part => part.type === "timeZoneName")?.value || config.timeZone;
  return `${weekday} · ${clock} ${zone}`;
}

export function cutoffCountdown(cutoff: Date, now: number) {
  const total = Math.max(0, Math.ceil((cutoff.getTime() - now) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}
