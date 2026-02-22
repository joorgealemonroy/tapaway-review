import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Smartphone, CreditCard } from "lucide-react";

const PRODUCTS = [
  {
    name: "Basic NFC Card",
    price: "$20",
    priceNote: "one-time",
    description: "Pre-designed TapAway card with your profile linked. Tap any phone to share instantly.",
    features: ["TapAway branded design", "Pre-programmed with your profile", "Works with all smartphones"],
    badge: null,
    cta: "Coming Soon",
    disabled: true,
  },
  {
    name: "Custom NFC Card",
    price: "$25",
    priceNote: "one-time",
    description: "Your design, your branding. Premium materials with your name and custom artwork.",
    features: ["Upload your own design", "Your name & branding", "Premium PVC materials"],
    badge: "Popular",
    cta: "Coming Soon",
    disabled: true,
  },
];

const BENEFITS = [
  { icon: Smartphone, label: "No app needed", description: "Just tap — works instantly on any phone" },
  { icon: Sparkles, label: "Make a lasting impression", description: "Stand out with a physical card people remember" },
  { icon: CreditCard, label: "Always on you", description: "Fits in your wallet — never miss a connection" },
];

export function PersonalShopTab() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
          <CreditCard className="h-4 w-4" />
          Physical NFC Cards
        </div>
        <h2 className="text-xl font-bold text-foreground">Go Physical</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Share your profile with a single tap — no app required
        </p>
      </div>

      {/* Product Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PRODUCTS.map((product) => (
          <Card key={product.name} className="relative overflow-hidden">
            {product.badge && (
              <Badge className="absolute top-3 right-3 bg-primary">{product.badge}</Badge>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{product.price}</span>
                <span className="text-sm text-muted-foreground">{product.priceNote}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{product.description}</p>
              <ul className="space-y-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full" disabled={product.disabled}>
                {product.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Why Go Physical */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Why go physical?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit.label} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{benefit.label}</p>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
