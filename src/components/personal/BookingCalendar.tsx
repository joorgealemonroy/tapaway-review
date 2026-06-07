import { useState, useEffect, useMemo } from "react";
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
  onBook: (bookingId: string) => void;
  booking?: boolean;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  timezone: string;
}

interface Booking {
  booking_date: string;
  start_time: string;
  status: string;
  created_at: string;
}

// Convert a time string "HH:MM:SS" on a given date from one timezone to another
function convertTime(dateStr: string, timeStr: string, fromTz: string, toTz: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  // Create a date string in the source timezone
  const dateTimeStr = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  
  // Use Intl to figure out the offset
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: fromTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Parse the date assuming it's in fromTz
  // We create the date in UTC first, then adjust
  const utcDate = new Date(dateTimeStr + "Z");
  
  // Get the offset of fromTz at this moment
  const fromParts = formatter.formatToParts(utcDate);
  const fromObj: Record<string, string> = {};
  fromParts.forEach(p => { fromObj[p.type] = p.value; });
  
  // Build the actual UTC time by working backwards from the timezone
  // Simple approach: use the Date constructor with timezone info
  const tempDate = new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  
  // Get offset in minutes for the source timezone
  const sourceOffset = getTimezoneOffset(fromTz, tempDate);
  const utcMs = tempDate.getTime() + sourceOffset * 60000;
  
  return new Date(utcMs);
}

// Get timezone offset in minutes (positive = behind UTC)
function getTimezoneOffset(tz: string, date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tz });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

function formatTimeLocal(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Convert a local Date to "HH:MM:SS" in creator's timezone
function toCreatorTime(utcMs: number, creatorTz: string): string {
  const d = new Date(utcMs);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: creatorTz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const obj: Record<string, string> = {};
  parts.forEach(p => { obj[p.type] = p.value; });
  return `${obj.hour}:${obj.minute}:${obj.second || "00"}`;
}

// Get date string in creator's timezone from a UTC timestamp
function toCreatorDateString(utcMs: number, creatorTz: string): string {
  const d = new Date(utcMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: creatorTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const obj: Record<string, string> = {};
  parts.forEach(p => { obj[p.type] = p.value; });
  return `${obj.year}-${obj.month}-${obj.day}`;
}

export function BookingCalendar({ creatorId, productId, durationMinutes, priceCents, onBook }: BookingCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<{ utcMs: number } | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const buyerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load availability
  useEffect(() => {
    supabase
      .from("creator_availability")
      .select("day_of_week, start_time, end_time, timezone")
      .eq("creator_id", creatorId)
      .then(({ data }) => {
        if (data) setAvailability(data as AvailabilitySlot[]);
        setLoading(false);
      });
  }, [creatorId]);

  // Load bookings for selected date range (fetch all for the month)
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = toDateString(selectedDate);
    
    supabase
      .from("bookings_public")
      .select("booking_date, start_time, status, created_at")
      .eq("product_id", productId)
      .eq("booking_date", dateStr)
      .then(({ data }) => {
        if (data) setBookings(data as Booking[]);
      });
  }, [selectedDate, productId]);

  // Available days of week
  const availableDays = useMemo(() => new Set(availability.map(a => a.day_of_week)), [availability]);

  // Disable dates with no availability
  const disabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return !availableDays.has(date.getDay());
  };

  // Generate slots for selected date
  const slots = useMemo(() => {
    if (!selectedDate || availability.length === 0) return [];

    const dayOfWeek = selectedDate.getDay();
    const avail = availability.find(a => a.day_of_week === dayOfWeek);
    if (!avail) return [];

    const dateStr = toDateString(selectedDate);
    const creatorTz = avail.timezone;

    // Convert creator's start/end times to UTC
    const startUtc = convertTime(dateStr, avail.start_time, creatorTz, "UTC");
    const endUtc = convertTime(dateStr, avail.end_time, creatorTz, "UTC");

    const slotDurationMs = durationMinutes * 60 * 1000;
    const generated: Array<{ utcMs: number; label: string; booked: boolean }> = [];

    let cursor = startUtc.getTime();
    const endMs = endUtc.getTime();
    const now = Date.now();
    const fifteenMinAgo = now - 15 * 60 * 1000;

    while (cursor + slotDurationMs <= endMs) {
      // Skip past slots
      if (cursor > now) {
        // Check if booked
        const slotCreatorTime = toCreatorTime(cursor, creatorTz);
        const slotCreatorDate = toCreatorDateString(cursor, creatorTz);
        
        const isBooked = bookings.some(b => {
          if (b.booking_date !== slotCreatorDate) return false;
          if (b.start_time !== slotCreatorTime) return false;
          if (b.status === "paid") return true;
          // Pending but recent (< 15 min) — also blocked
          if (b.status === "pending") {
            const createdAt = new Date(b.created_at).getTime();
            return createdAt > fifteenMinAgo;
          }
          return false;
        });

        // Format in buyer's local time
        const buyerDate = new Date(cursor);
        const label = formatTimeLocal(buyerDate);

        generated.push({ utcMs: cursor, label, booked: isBooked });
      }
      cursor += slotDurationMs;
    }

    return generated;
  }, [selectedDate, availability, bookings, durationMinutes]);

  const handleBook = async () => {
    if (!selectedSlot || !buyerEmail.trim()) return;
    
    setBooking(true);
    try {
      const avail = availability.find(a => a.day_of_week === selectedDate?.getDay());
      const creatorTz = avail?.timezone || "UTC";
      
      const creatorDate = toCreatorDateString(selectedSlot.utcMs, creatorTz);
      const creatorTime = toCreatorTime(selectedSlot.utcMs, creatorTz);

      // Insert pending booking
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .insert({
          product_id: productId,
          creator_id: creatorId,
          buyer_email: buyerEmail.trim(),
          booking_date: creatorDate,
          start_time: creatorTime,
          timezone: creatorTz,
          status: "pending",
        } as any)
        .select("id")
        .single();

      if (error) throw error;
      if (bookingData) {
        onBook((bookingData as any).id);
      }
    } catch (err) {
      console.error("Booking error:", err);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (availability.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">No availability set yet. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
          disabled={disabledDates}
          fromDate={new Date()}
          className="rounded-xl border"
        />
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Available times ({buyerTz.replace(/_/g, " ")})
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available slots for this date.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.utcMs}
                  disabled={slot.booked}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg text-sm font-medium transition-all border",
                    slot.booked
                      ? "bg-muted text-muted-foreground/50 border-transparent cursor-not-allowed line-through"
                      : selectedSlot?.utcMs === slot.utcMs
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email + Book button */}
      {selectedSlot && (
        <div className="space-y-3 pt-2">
          <Input
            type="email"
            placeholder="Your email address"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            className="w-full"
          />
          <button
            onClick={handleBook}
            disabled={booking || !buyerEmail.includes("@")}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity text-base disabled:opacity-50"
          >
            {booking ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              `Pay $${(priceCents / 100).toFixed(2)} to Lock In`
            )}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            {formatTimeLocal(new Date(selectedSlot.utcMs))} · {durationMinutes} min
          </p>
        </div>
      )}
    </div>
  );
}
