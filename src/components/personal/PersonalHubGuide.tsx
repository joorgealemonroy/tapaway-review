import { useState } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PersonalHubGuide({
  profileId,
  username,
  onGoToTab,
}: {
  profileId: string;
  username: string;
  onGoToTab: (tab: string) => void;
}) {
  const key = `tapaway-hub-guide-${profileId}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === "done";
    } catch {
      return false;
    }
  });
  const named = !/^p[a-f0-9]{32}$/.test(username);
  if (hidden)
    return (
      <Button variant="ghost" size="sm" onClick={() => setHidden(false)}>
        <Sparkles className="mr-2 h-4 w-4" /> Show my hub setup guide
      </Button>
    );
  return (
    <section
      className="relative rounded-2xl border border-violet-400/30 bg-violet-500/10 p-5 md:p-7"
      aria-label="Personal hub setup guide"
    >
      <button
        className="absolute right-4 top-4 rounded p-1"
        aria-label="Hide hub setup guide"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(key, "done");
          } catch {
            /* Guide still hides for this visit. */
          }
        }}
      >
        <X size={16} />
      </button>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Your corner of the internet
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">
        A little you. A lot of possibility.
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        You don't need a website or a list of links. Start with your name, a
        photo, and a few words. Make it a portfolio, a social home, or a little
        collection of things you love.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            tab: "links",
            title: named ? "Your address is yours" : "Pick your address",
            description: named
              ? `tapaway.co/${username}`
              : "Choose an available tapaway.co/yourname and add a name or bio.",
            action: "Name & content",
            done: named,
          },
          {
            tab: "design",
            title: "Give it your personality",
            description:
              "Choose colors, add a photo, and find your style. You can change it anytime.",
            action: "Design my page",
            done: false,
          },
          {
            tab: "analytics",
            title: "See the connections",
            description:
              "Your dashboard shows visits and link activity as people start tapping.",
            action: "Explore my stats",
            done: false,
          },
        ].map((step, i) => (
          <button
            key={step.tab}
            className="flex flex-col rounded-xl border border-border bg-background/70 p-4 text-left transition-colors hover:border-violet-400"
            onClick={() => onGoToTab(step.tab)}
          >
            <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold">
              {step.done ? <Check size={14} /> : i + 1}
            </span>
            <strong className="text-sm">{step.title}</strong>
            <span className="my-2 text-xs leading-relaxed text-muted-foreground break-all">
              {step.description}
            </span>
            <span className="mt-auto flex items-center gap-1 pt-2 text-xs font-medium">
              {step.action}
              <ArrowRight size={13} />
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Your $5/month includes your hosted page, full dashboard, analytics, and
        editing access 24/7. Both cards keep opening this hub—even when you
        change its address or content.
      </p>
    </section>
  );
}
