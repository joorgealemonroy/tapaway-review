import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { cutoffCountdown, cutoffScheduleLabel, nextWeeklyCutoff, parseWeeklyCutoffConfig } from "@/lib/weeklyCutoff";

interface Props {
  content?: Record<string, unknown>;
  accentColor?: string | null;
}

/** Compact schedule context; it never claims that an order or delivery occurred. */
export function WeeklyCutoff({ content, accentColor }: Props) {
  const config = useMemo(() => parseWeeklyCutoffConfig(content), [content]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 1000);
    const onVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    refresh();
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  const cutoff = useMemo(() => nextWeeklyCutoff(new Date(now), config), [now, config]);
  const schedule = cutoffScheduleLabel(cutoff, config);
  const remaining = cutoffCountdown(cutoff, now);
  const color = accentColor && /^#[\da-f]{6}$/i.test(accentColor) ? accentColor : "#005b32";
  const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4));
  const foreground = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] > .179 ? "#000000" : "#ffffff";
  const units = [[remaining.days, "DAYS"], [remaining.hours, "HRS"], [remaining.minutes, "MIN"], [remaining.seconds, "SEC"]] as const;

  return <section className="w-full rounded-2xl px-3.5 py-3" style={{ backgroundColor: color, color: foreground }} aria-label={`${config.label}: ${schedule}${config.deliveryLabel ? `. ${config.deliveryLabel}` : ""}`}>
    <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] leading-4">
      <span className="inline-flex min-w-0 items-center gap-1.5 font-medium"><Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{config.label}</span>
      <time dateTime={cutoff.toISOString()} className="shrink-0 font-semibold">{schedule}</time>
    </div>
    <div className="mt-2 flex items-center justify-between gap-3">
      <p className="min-w-0 text-xs font-medium leading-4">{config.deliveryLabel || "Time left to order"}</p>
      <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
        {units.map(([value, label]) => <span key={label} className="flex min-w-7 flex-col items-center">
          <span className="text-lg font-semibold tabular-nums leading-5">{String(value).padStart(2, "0")}</span>
          <span className="mt-0.5 text-[8px] font-medium leading-3 opacity-80">{label}</span>
        </span>)}
      </div>
    </div>
  </section>;
}
