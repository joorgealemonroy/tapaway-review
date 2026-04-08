import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { LandingNav } from "@/components/landing/LandingNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Phone, Star, MapPin, Instagram, Globe, Calendar, ChevronRight, Utensils, Loader2 } from "lucide-react";

const PHONE_NUMBER = "(858) 207-8106";
const PHONE_TEL = "tel:+18582078106";

/* ── Feature callout bullet ── */
const Callout = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex gap-3 items-start">
    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
    <div>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-muted-foreground text-xs">{desc}</p>
    </div>
  </div>
);

/* ── Live phone frame with iframe + fallback ── */
const LivePhoneFrame = ({ slug, fallbackContent }: { slug: string; fallbackContent: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setStatus("loading");
    timeoutRef.current = setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "error" : prev));
    }, 6000);
    return () => clearTimeout(timeoutRef.current);
  }, [slug]);

  return (
    <div className="mx-auto w-[280px] sm:w-[300px] rounded-[2.5rem] border-[6px] border-foreground/80 bg-background shadow-2xl overflow-hidden">
      {/* Notch */}
      <div className="mx-auto mt-2 h-5 w-28 rounded-full bg-foreground/80" />
      <div className="relative" style={{ height: 520 }}>
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {status !== "error" ? (
          <iframe
            src={`/${slug}`}
            className="w-full h-full border-0"
            style={{ pointerEvents: "auto" }}
            onLoad={() => {
              clearTimeout(timeoutRef.current);
              setStatus("success");
            }}
            onError={() => {
              clearTimeout(timeoutRef.current);
              setStatus("error");
            }}
            title={`Live preview of ${slug}`}
          />
        ) : (
          <div className="px-4 py-4 space-y-3 min-h-[520px] overflow-y-auto">
            {fallbackContent}
          </div>
        )}
      </div>
      {/* Home indicator */}
      <div className="mx-auto mb-2 h-1 w-28 rounded-full bg-foreground/30" />
    </div>
  );
};

/* ── Static fallback mock button ── */
const MockButton = ({
  icon: Icon,
  label,
  color = "bg-primary",
}: {
  icon: React.ElementType;
  label: string;
  color?: string;
}) => (
  <div className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white ${color}`}>
    <Icon className="h-5 w-5 shrink-0" />
    <span className="flex-1 text-left">{label}</span>
    <ChevronRight className="h-4 w-4 opacity-60" />
  </div>
);

/* ── Restaurant fallback ── */
const RestaurantFallback = () => (
  <>
    <div className="text-center space-y-1">
      <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl">🌮</div>
      <h2 className="font-bold text-foreground text-lg">Las Islas – Salem</h2>
      <p className="text-xs text-muted-foreground">Authentic Mexican Food</p>
    </div>
    <div className="space-y-2 mt-2">
      <MockButton icon={Star} label="Leave a Google Review" color="bg-[#4285F4]" />
      <MockButton icon={Star} label="Leave a Yelp Review" color="bg-[#D32323]" />
      <MockButton icon={Utensils} label="View Menu" color="bg-primary" />
      <MockButton icon={MapPin} label="Directions" color="bg-emerald-600" />
      <MockButton icon={Instagram} label="Instagram" color="bg-gradient-to-tr from-purple-600 to-pink-500" />
    </div>
  </>
);

/* ── Small business fallback ── */
const SmallBizFallback = () => (
  <>
    <div className="text-center space-y-1">
      <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl">🚗</div>
      <h2 className="font-bold text-foreground text-lg">Reborn Wraps</h2>
      <p className="text-xs text-muted-foreground">Vehicle Wraps & Detailing</p>
    </div>
    <div className="space-y-2 mt-2">
      <MockButton icon={Star} label="Leave a Google Review" color="bg-[#4285F4]" />
      <MockButton icon={Globe} label="Visit Website" color="bg-primary" />
      <MockButton icon={Phone} label="Call Now" color="bg-emerald-600" />
      <MockButton icon={Calendar} label="Book Appointment" color="bg-amber-600" />
      <MockButton icon={Instagram} label="Instagram" color="bg-gradient-to-tr from-purple-600 to-pink-500" />
      <MockButton icon={MapPin} label="Directions" color="bg-slate-700" />
    </div>
  </>
);

/* ════════════════════════════════════════════ */

const Examples = () => {
  return (
    <>
      <Helmet>
        <title>TapAway Examples — See It in Action</title>
        <meta name="description" content="See how TapAway works for restaurants and small businesses. Interactive demos, real features, no app needed." />
      </Helmet>

      <LandingNav />

      {/* ── Hero ── */}
      <section className="pt-24 pb-10 px-4 text-center bg-gradient-to-b from-primary/5 to-background">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          See TapAway in Action
        </h1>
        <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
          These are real businesses using TapAway right now. Tap around inside the phone to see exactly what their customers experience.
        </p>
      </section>

      {/* ── Live examples section ── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <Tabs defaultValue="restaurant" className="w-full">
          <TabsList className="mx-auto mb-8 grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
            <TabsTrigger value="small-biz">Small Business</TabsTrigger>
          </TabsList>

          {/* ── Restaurant tab ── */}
          <TabsContent value="restaurant">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <LivePhoneFrame slug="lasislassalem" fallbackContent={<RestaurantFallback />} />

              <div className="space-y-5 pt-4">
                <h3 className="text-xl font-bold text-foreground">Las Islas – Salem</h3>
                <p className="text-sm text-muted-foreground">This is a live TapAway page. Scroll, tap buttons, and see exactly what customers experience.</p>
                <Callout title="Google & Yelp Reviews" desc="One tap sends customers straight to the review page — no searching required." />
                <Callout title="Digital Menu" desc="Customers browse the full menu right from their phone, no PDF or app needed." />
                <Callout title="Directions" desc="Opens Google Maps with the exact location — great for new customers." />
                <Callout title="Social Media" desc="Grow your Instagram following effortlessly." />
                <Callout title="NFC or QR" desc="Works with our NFC cards or a simple QR code at the register." />
              </div>
            </div>
          </TabsContent>

          {/* ── Small Business tab ── */}
          <TabsContent value="small-biz">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <LivePhoneFrame slug="rebornwraps" fallbackContent={<SmallBizFallback />} />

              <div className="space-y-5 pt-4">
                <h3 className="text-xl font-bold text-foreground">Reborn Wraps</h3>
                <p className="text-sm text-muted-foreground">This is a live TapAway page. Scroll, tap buttons, and see exactly what Reborn Wraps' customers see.</p>
                <Callout title="Collect Reviews Automatically" desc="Hand a customer your card, they tap, and your Google rating grows." />
                <Callout title="Direct Calls & Booking" desc="Let customers call or book with one tap — no hunting for your number." />
                <Callout title="Your Website Front & Center" desc="Drive traffic straight to your site or portfolio." />
                <Callout title="No App Required" desc="Customers don't download anything. Tap → done." />
                <Callout title="Works Everywhere" desc="Auto shops, salons, barbers, gyms, cleaning services — if you want reviews, it works." />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* ── Features accordion ── */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-6">Why TapAway?</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="reviews">
            <AccordionTrigger>Collect More Reviews</AccordionTrigger>
            <AccordionContent>NFC tap or QR scan sends customers straight to your Google or Yelp review page — no searching, no friction. Businesses see 3–5× more reviews in the first month.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="one-link">
            <AccordionTrigger>One Link, Everything</AccordionTrigger>
            <AccordionContent>Menu, socials, directions, phone number, booking — all in one mobile-friendly page. No app for your customers to download.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="any-biz">
            <AccordionTrigger>Works for Any Business</AccordionTrigger>
            <AccordionContent>Restaurants, salons, auto shops, gyms, cleaning services, barbers — if you serve customers in person, TapAway helps you grow.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="no-app">
            <AccordionTrigger>No App Needed</AccordionTrigger>
            <AccordionContent>Your customers just tap the card or scan the QR code. It opens instantly in their browser — nothing to install.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="setup">
            <AccordionTrigger>We Set It Up For You</AccordionTrigger>
            <AccordionContent>
              Not tech-savvy? No problem. Call us at{" "}
              <a href={PHONE_TEL} className="font-semibold text-primary underline">{PHONE_NUMBER}</a>{" "}
              and we'll set up everything for you — free of charge.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* ── CTA section ── */}
      <section className="bg-primary/5 py-16 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Ready to get started?</h2>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Set up takes under 5 minutes — or call us and we'll do it for you.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <a href="/paywall">Start Free Trial</a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={PHONE_TEL} className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> Call {PHONE_NUMBER}
            </a>
          </Button>
        </div>
      </section>

      {/* ── Footer spacer for sticky bar ── */}
      <div className="h-16 md:hidden" />

      {/* ── Sticky mobile call bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-lg">
        <span className="text-sm font-medium">Prefer we set it up?</span>
        <a href={PHONE_TEL} className="flex items-center gap-1.5 font-bold text-sm underline">
          <Phone className="h-4 w-4" /> Call Us
        </a>
      </div>
    </>
  );
};

export default Examples;
