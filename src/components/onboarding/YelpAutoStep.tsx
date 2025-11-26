import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Restaurant = {
  id: string;
  restaurant_name: string | null;
  google_place_id: string | null;
  yelp_review_url: string | null;
};

type YelpStepProps = {
  restaurant: Restaurant;
  onRestaurantUpdated?: (r: Restaurant) => void;
};

const YelpAutoStep: React.FC<YelpStepProps> = ({
  restaurant,
  onRestaurantUpdated,
}) => {
  const [includeYelp, setIncludeYelp] = useState<boolean>(
    Boolean(restaurant.yelp_review_url)
  );
  const [yelpUrl, setYelpUrl] = useState<string>(
    restaurant.yelp_review_url ?? ""
  );
  const [loading, setLoading] = useState(false);

  const canAutoDetect = Boolean(restaurant.google_place_id);

  const handleAutoDetect = async () => {
    if (!canAutoDetect) {
      toast.error("We need your Google location connected first.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "auto-yelp-from-place",
        {
          body: {
            restaurantId: restaurant.id,
          },
        }
      );

      if (error) {
        throw error;
      }

      const updated = data?.restaurant as Restaurant | undefined;
      if (!updated || !updated.yelp_review_url) {
        throw new Error(
          "We couldn't confidently match a Yelp page for this address."
        );
      }

      setYelpUrl(updated.yelp_review_url);
      setIncludeYelp(true);
      toast.success(
        "We found a Yelp page based on your address and filled it in. You can adjust it if needed."
      );

      if (onRestaurantUpdated) {
        onRestaurantUpdated(updated);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(
        e.message ??
          "We couldn't automatically find your Yelp page. You can paste it in manually if you'd like."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManual = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .update({
          yelp_review_url: includeYelp ? yelpUrl.trim() || null : null,
        })
        .eq("id", restaurant.id)
        .select("id, restaurant_name, google_place_id, yelp_review_url")
        .single();

      if (error) throw error;

      if (onRestaurantUpdated && data) {
        onRestaurantUpdated(data as Restaurant);
      }

      toast.success("Yelp settings saved.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Failed to save Yelp settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card rounded-2xl border shadow-sm p-4 space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          Yelp (optional)
        </h3>
        <p className="text-xs text-muted-foreground">
          If you have a Yelp page, we can try to find it automatically from your
          Google listing, or you can paste it in manually.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="include-yelp"
          checked={includeYelp}
          onCheckedChange={(checked) => setIncludeYelp(checked as boolean)}
        />
        <Label htmlFor="include-yelp" className="text-sm cursor-pointer">
          Include Yelp link on my review hub
        </Label>
      </div>

      {includeYelp && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="yelp-url" className="text-xs font-medium">
              Yelp URL
            </Label>
            <Input
              id="yelp-url"
              type="text"
              value={yelpUrl}
              onChange={(e) => setYelpUrl(e.target.value)}
              placeholder="https://www.yelp.com/biz/las-islas-marias-fontana"
            />
            <p className="text-[11px] text-muted-foreground">
              We'll use this on your hub as your Yelp review button.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoDetect}
              disabled={loading || !canAutoDetect}
            >
              {loading ? "Searching Yelp…" : "Try to auto-detect from Google"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveManual}
              disabled={loading}
            >
              Save Yelp settings
            </Button>
          </div>
        </div>
      )}

      {!canAutoDetect && (
        <p className="text-[11px] text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300 rounded-md px-3 py-2">
          To auto-detect Yelp, make sure you've connected your Google
          location in the previous step.
        </p>
      )}
    </section>
  );
};

export default YelpAutoStep;
