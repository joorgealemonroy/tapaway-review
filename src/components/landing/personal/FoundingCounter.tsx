import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";

export function FoundingCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc("get_founding_count").then(({ data }) => {
      if (typeof data === "number") setCount(data);
    });
  }, []);

  if (count === null || count >= 1000) return null;

  const pct = Math.round((count / 1000) * 100);

  return (
    <section className="py-10 px-4">
      <div className="max-w-md mx-auto text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
          <h3 className="text-lg font-bold text-foreground">Founding Creator Spots</h3>
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
        </div>
        <Progress value={pct} className="h-3" />
        <p className="text-muted-foreground text-sm font-medium">
          <span className="text-foreground font-bold text-lg">{count}</span> / 1,000 spots claimed
        </p>
      </div>
    </section>
  );
}
