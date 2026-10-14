export function HowItWorksSection() {
  return <section id="how-it-works" aria-labelledby="how-it-works-heading" className="scroll-mt-20 bg-background px-4 py-12 md:py-16">
    <div className="mx-auto max-w-6xl"><h2 id="how-it-works-heading" className="mb-6 text-3xl font-black md:text-4xl">How it works</h2>
      <ol className="grid gap-6 sm:grid-cols-3">{[
        ["Choose 4 or 15 cards", "Select monthly or yearly billing, then tell us about your business."],
        ["We set it up", "We design your cards, build your hub, and prepare your shipment."],
        ["Tap or scan", "Customers open your links. Update your hub from your dashboard without reprinting."],
      ].map(([title, text], i) => <li key={title} className="border-t border-border pt-4"><span className="font-bold text-primary">0{i + 1}</span><h3 className="mt-2 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></li>)}</ol>
    </div>
  </section>;
}