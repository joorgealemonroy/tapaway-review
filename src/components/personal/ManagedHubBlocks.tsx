import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Bell, ChevronRight, Loader2, MapPin } from "lucide-react";
import { useManagedHub } from "@/hooks/useManagedHub";
import { pickupLocationDirections, pickupLocationsLimit, profileLocationPath } from "@/lib/profileLocations";
import { sanitizeUrl } from "@/lib/sanitizeUrl";
import { track } from "@/lib/analytics";
import { ManagedSmsOptInDrawer } from "./ManagedSmsOptInDrawer";

interface BlockProps {
  profileId: string;
  username: string;
  content: Record<string, unknown>;
  textColor?: string | null;
  accentColor?: string | null;
  isPreview?: boolean;
}

function locationImageUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^\/(?!\/)[^\\\s<>]*$/.test(value)) return value;
  const url = sanitizeUrl(value);
  return /^https:\/\//i.test(url) ? url : null;
}

export function ManagedLocationBanner({ profileId, username }: { profileId: string; username: string }) {
  const hub = useManagedHub(profileId);
  if (!hub.requestedLocationId) return null;
  if (hub.loading) return <div className="mb-4 flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading location…</div>;
  if (hub.invalidLocation || hub.error) return <div className="mb-4 rounded-xl border border-border bg-card p-4 text-center">
    <p className="text-sm text-foreground">This location is currently unavailable.</p>
    <Link to={profileLocationPath(username)} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />See all locations</Link>
  </div>;
  const location = hub.selectedLocation;
  if (!location) return null;
  return <section className="mb-4 rounded-2xl border border-border bg-card p-4 text-left" aria-label="Your AV location">
    <Link to={profileLocationPath(username)} className="mb-2 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />All locations</Link>
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><MapPin className="h-5 w-5 text-foreground" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-foreground">{location.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{location.is_placeholder ? "Location details coming soon" : location.address || location.subtitle || "Find our meals at this location."}</p>
        {!location.is_placeholder && location.directions_url && sanitizeUrl(location.directions_url) !== "#" && <a href={sanitizeUrl(location.directions_url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary" onClick={() => track("directions_click", { hubId: profileId, hubKind: "solo", props: { location_id: location.id } })}>Get directions<ArrowUpRight className="h-4 w-4" /></a>}
      </div>
    </div>
  </section>;
}

export function ManagedLocationsBlock({ profileId, username, content, textColor, isPreview = false }: BlockProps) {
  const hub = useManagedHub(profileId);
  const pickupMode = content.mode === "pickup";
  if (!pickupMode && !isPreview && hub.requestedLocationId) return null;
  const title = String(content.title || (pickupMode ? "Pickup locations" : "Find meals near you"));
  const subtitle = typeof content.subtitle === "string" ? content.subtitle : pickupMode ? "" : "Choose a location to explore.";
  const ctaLabel = String(content.ctaLabel || (pickupMode ? "Get directions" : "View location"));
  const locations = pickupMode ? hub.locations.slice(0, pickupLocationsLimit(content)) : hub.locations;
  const style = textColor ? { color: textColor } : undefined;
  return <section className="w-full space-y-3 py-2" aria-label={title}>
    <div className="text-center">
      <h2 className="text-lg font-bold text-foreground" style={style}>{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground" style={textColor ? { color: textColor, opacity: .7 } : undefined}>{subtitle}</p>}
    </div>
    {hub.loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : hub.error ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-900"><p>Locations couldn’t load.</p><button type="button" className="mt-1 min-h-11 font-semibold text-[#005b32]" onClick={() => { void hub.refetch(); }}>Try again</button></div> : locations.length === 0 ? <p className="py-3 text-center text-sm text-muted-foreground" style={style}>{pickupMode ? "Pickup details are coming soon." : "Locations are being added. You can still order online below."}</p> : <div className="space-y-2.5">
      {locations.map(location => {
        const imageUrl = locationImageUrl(location.image_url);
        if (pickupMode) {
          const directionsUrl = pickupLocationDirections(location);
          return <article key={location.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-900 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <MapPin className="h-5 w-5 text-[#005b32]" />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-semibold text-slate-900">{location.name}</h3>
                <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">{location.is_placeholder || !location.address?.trim() ? "Address coming soon" : location.address}</p>
                {!location.is_placeholder && location.subtitle && location.subtitle !== location.address && <p className="mt-1 break-words text-xs leading-relaxed text-slate-600">{location.subtitle}</p>}
              </div>
            </div>
            {directionsUrl && (isPreview ? <span className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#005b32]">{ctaLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span> : <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#005b32] transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005b32]" aria-label={`${ctaLabel} to ${location.name}`} onClick={() => track("directions_click", { hubId: profileId, hubKind: "solo", props: { location_id: location.id } })}>{ctaLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>)}
          </article>;
        }
        const inner = <>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
            {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <MapPin className="h-5 w-5 text-muted-foreground" />}
          </span>
          <span className="min-w-0 flex-1"><span className="block font-semibold text-foreground" style={style}>{location.name}</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{location.is_placeholder ? "Details coming soon" : location.subtitle || location.address || "View location & restock alerts"}</span><span className="mt-1 block text-xs font-medium text-primary">{ctaLabel}</span></span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </>;
        const className = "flex min-h-[82px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-transform active:scale-[0.99]";
        return isPreview ? <div key={location.id} className={className}>{inner}</div> : <Link key={location.id} to={profileLocationPath(username, location.id)} className={className} onClick={() => track("cta_click", { hubId: profileId, hubKind: "solo", props: { cta: "location_select", location_id: location.id } })}>{inner}</Link>;
      })}
    </div>}
  </section>;
}

export function ManagedSmsBlock({ profileId, username, content, accentColor, isPreview = false }: BlockProps) {
  const [open, setOpen] = useState(false);
  const hub = useManagedHub(profileId);
  const color = accentColor && /^#[\da-f]{6}$/i.test(accentColor) ? accentColor : "#005b32";
  const pickupMode = content.mode === "pickup";
  const selected = isPreview || pickupMode ? null : hub.selectedLocation;
  const headline = selected && !selected.is_placeholder ? `Fresh arrivals at ${selected.name}` : String(content.headline || "Fresh meals. Stay in the know.");
  const description = selected && !selected.is_placeholder ? "Choose a text alert when this fridge is restocked." : String(content.description || "Choose restock alerts and weekly ordering reminders.");
  const buttonOnly = content.style === "button";
  const button = <button type="button" onClick={() => { if (!isPreview) { setOpen(true); track("cta_click", { hubId: profileId, hubKind: "solo", props: { cta: "managed_sms_open", location_id: selected?.id || null } }); } }} className={`${buttonOnly ? "" : "mt-3 "}flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90`} style={{ backgroundColor: color }}>{String(content.buttonText || "Get AV text updates")}<ChevronRight className="h-4 w-4" /></button>;
  return <>
    {buttonOnly ? button : <section className="w-full rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
      <div className="mb-2 flex items-center justify-center gap-2"><Bell className="h-4 w-4 shrink-0" style={{ color }} /><h2 className="text-base font-semibold text-foreground">{headline}</h2></div>
      <p className="mx-auto max-w-[36ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
      {button}
    </section>}
    {!isPreview && <ManagedSmsOptInDrawer profileId={profileId} open={open} onOpenChange={setOpen} selectedLocationId={selected?.id} invalidLocation={!pickupMode && hub.invalidLocation} accentColor={color} />}
  </>;
}
