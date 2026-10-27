import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  creatorId: string;
  productId: string;
  durationMinutes: number;
  priceCents: number;
}
interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
}
interface Booking {
  booking_date: string;
  start_time: string;
  status: string;
  created_at: string;
  reserved_until: string | null;
  starts_at: string;
  ends_at: string;
}

/** Resolve a creator's wall-clock time without using the visitor's UTC offset. */
function creatorTime(date: string, time: string, timezone: string): number {
  try {
    const target = Date.parse(`${date}T${time.slice(0, 5)}:00Z`);
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    let candidate = target;
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map(p => [p.type, p.value]));
      const rendered = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
      if (rendered === target) return candidate;
      candidate += target - rendered;
    }
    return NaN; // A nonexistent daylight-saving time is not a selectable slot.
  } catch { return NaN; } // Invalid owner settings must not crash the public page.
}
function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function clockString(utcMs: number, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: timezone,
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(utcMs)).map(p => [p.type, p.value]));
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}
async function checkoutRequestKey(productId: string, binding: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(binding));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const storageKey = `tapaway-booking-request:${productId}`;
  try {
    const previous = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (previous?.fingerprint === fingerprint && typeof previous.key === "string"
      && /^[0-9a-f-]{36}$/i.test(previous.key) && Date.now() - previous.createdAt < 35 * 60 * 1000) return previous.key as string;
  } catch { /* Session storage can be unavailable in private browsing. */ }
  const key = crypto.randomUUID();
  try { sessionStorage.setItem(storageKey, JSON.stringify({ key, fingerprint, createdAt: Date.now() })); } catch { /* The in-memory request still remains stable. */ }
  return key;
}

export function BookingCalendar({ creatorId, productId, durationMinutes, priceCents }: BookingCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<{ utcMs: number; timezone: string } | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [slotsRetry, setSlotsRetry] = useState(0);
  const inFlight = useRef(false);
  const attempt = useRef<{ binding: string; key: string } | null>(null);
  const creatorTimezone = availability[0]?.timezone || "UTC";
  const date = selectedDate ? dateString(selectedDate) : "";

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setSelectedDate(undefined); setSelectedSlot(null);
    void supabase.from("creator_availability").select("day_of_week,start_time,end_time,timezone")
      .eq("creator_id", creatorId).then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError("We couldn’t load available times. Please try again.");
        setAvailability(loadError ? [] : (data || []) as AvailabilitySlot[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [creatorId, retry]);

  useEffect(() => {
    if (!date) return;
    let active = true;
    setSlotsLoading(true); setSelectedSlot(null); setBookings([]); setError("");
    // This service returns occupied time ranges only. Customer email addresses
    // and private booking IDs never leave the database through this calendar.
    const readSlots = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, string>) => Promise<{ data: Booking[] | null; error: unknown }>;
    void readSlots("get_public_booking_slots", { _product_id: productId, _from: date, _to: date })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError("We couldn’t check these times. Please try again.");
        setBookings(loadError ? [] : data || []); setSlotsLoading(false);
      });
    return () => { active = false; };
  }, [date, productId, slotsRetry]);

  const availableDays = useMemo(() => new Set(availability.map(a => a.day_of_week)), [availability]);
  const slots = useMemo(() => {
    if (!selectedDate || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) return [];
    const generated: Array<{ utcMs: number; timezone: string; label: string; booked: boolean }> = [];
    const length = durationMinutes * 60000, now = Date.now();
    for (const available of availability.filter(a => a.day_of_week === selectedDate.getDay())) {
      const start = creatorTime(date, available.start_time, available.timezone);
      const end = creatorTime(date, available.end_time, available.timezone);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      for (let cursor = start; cursor + length <= end; cursor += length) {
        if (cursor <= now) continue;
        const booked = bookings.some(b => (b.status === "paid" || b.status === "pending" && Date.parse(b.reserved_until || "") > now)
          && Date.parse(b.starts_at) < cursor + length && Date.parse(b.ends_at) > cursor);
        generated.push({ utcMs: cursor, timezone: available.timezone, booked,
          label: new Date(cursor).toLocaleTimeString("en-US", { timeZone: available.timezone, hour: "numeric", minute: "2-digit" }) });
      }
    }
    return generated.filter((slot, index, all) => all.findIndex(s => s.utcMs === slot.utcMs) === index).sort((a, b) => a.utcMs - b.utcMs);
  }, [selectedDate, date, availability, bookings, durationMinutes]);

  const handleBook = async () => {
    if (!selectedSlot || !date || inFlight.current || slotsLoading || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(buyerEmail.trim())) return;
    inFlight.current = true; setBooking(true); setError("");
    try {
      const email = buyerEmail.trim().toLowerCase();
      const startTime = clockString(selectedSlot.utcMs, selectedSlot.timezone);
      const binding = JSON.stringify([productId, email, date, startTime, selectedSlot.timezone]);
      if (attempt.current?.binding !== binding) attempt.current = { binding, key: await checkoutRequestKey(productId, binding) };
      const { data, error: checkoutError } = await supabase.functions.invoke("create-product-checkout", {
        body: { productId, buyerEmail: email, booking: { date, startTime, timezone: selectedSlot.timezone, requestKey: attempt.current.key } },
      });
      if (checkoutError || !data?.url) throw new Error(data?.error || "We couldn’t open checkout. This time may have just been taken. Please try again or choose another time.");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Secure checkout is unavailable. Please try again.");
      window.location.assign(url.href);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "We couldn’t open checkout. Please try again.");
      inFlight.current = false; setBooking(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-8" role="status" aria-label="Loading available times"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!availability.length) return <div className="space-y-3 py-6 text-center"><p className="text-sm text-muted-foreground">{error || "No availability set yet. Check back later!"}</p>{error && <button type="button" onClick={() => setRetry(n => n + 1)} className="min-h-11 text-sm font-medium underline">Try again</button>}</div>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Dates and times are shown in {creatorTimezone.replace(/_/g, " ")}.</p>
      <div className="flex justify-center"><Calendar mode="single" selected={selectedDate}
        onSelect={value => { if (!booking) { setSelectedDate(value); setSelectedSlot(null); setError(""); } }}
        disabled={value => booking || value < new Date(new Date().setHours(0, 0, 0, 0)) || !availableDays.has(value.getDay())}
        fromDate={new Date()} className="rounded-xl border" /></div>
      {selectedDate && <div className="space-y-3"><p className="text-sm font-medium text-foreground">Choose a time</p>
        {slotsLoading ? <p className="text-sm text-muted-foreground" role="status">Checking available times…</p> : slots.length === 0 ? <p className="text-sm text-muted-foreground">No available times for this date.</p> :
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map(slot => <button type="button" key={slot.utcMs} disabled={slot.booked || booking || !!error && !selectedSlot}
            onClick={() => { setSelectedSlot(slot); setError(""); }}
            className={cn("min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all", slot.booked ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground/50 line-through" : selectedSlot?.utcMs === slot.utcMs ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50")}>
            {slot.label}</button>)}</div>}
      </div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p role="alert">{error}</p><button type="button" className="mt-2 min-h-10 font-medium underline" onClick={() => setSlotsRetry(n => n + 1)}>Check times again</button></div>}
      {selectedSlot && <div className="space-y-3 pt-2"><label className="block text-sm font-medium" htmlFor={`booking-email-${productId}`}>Your email address</label><Input id={`booking-email-${productId}`} type="email" autoComplete="email" maxLength={254} value={buyerEmail} disabled={booking} onChange={event => setBuyerEmail(event.target.value)} />
        <button type="button" onClick={handleBook} disabled={booking || slotsLoading || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(buyerEmail.trim())}
          className="min-h-12 w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
          {booking ? <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Opening secure checkout…</span> : `Continue to payment · $${(priceCents / 100).toFixed(2)}`}
        </button><p className="text-center text-xs text-muted-foreground">{durationMinutes} minutes. Your booking is confirmed after payment.</p></div>}
    </div>
  );
}
