import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Rocket } from "lucide-react";

export function FoundingBanner() {
  const [count, setCount] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    supabase.rpc("get_founding_count").then(({ data }) => {
      if (typeof data === "number") {
        setCount(data);
        if (data >= 1000) setHidden(true);
      }
    });
  }, []);

  if (hidden || count === null) return null;

  return (
    <div className="bg-amber-500 text-black py-2.5 px-4 text-center text-sm font-semibold">
      <Rocket className="inline h-4 w-4 mr-1.5 -mt-0.5" />
      Founding Creator Access: The first 1,000 users get TapAway Pro free for life.
      <span className="ml-2 font-bold">{1000 - count} spots left!</span>
    </div>
  );
}
