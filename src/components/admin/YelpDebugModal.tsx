import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type YelpDebugRestaurant = {
  id: string;
  restaurant_name: string | null;
  google_place_id: string | null;
  google_review_url: string | null;
  yelp_business_id: string | null;
  yelp_review_url: string | null;
};

type Props = {
  restaurant: YelpDebugRestaurant | null;
  onClose: () => void;
  onUpdated: (updated: YelpDebugRestaurant) => void;
};

const YelpDebugModal: React.FC<Props> = ({ restaurant, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!restaurant) return null;

  const appendLog = (msg: string) => {
    setLog((prev) => (prev ? prev + "\n" + msg : msg));
  };

  const handleAutoDetect = async () => {
    if (!restaurant.google_place_id) {
      setError("This restaurant has no google_place_id set yet.");
      return;
    }

    setLoading(true);
    setError(null);
    setLog(null);

    try {
      appendLog("Calling auto-yelp-from-place…");

      const { data, error } = await supabase.functions.invoke(
        "auto-yelp-from-place",
        {
          body: { restaurantId: restaurant.id },
        }
      );

      if (error) {
        throw error;
      }

      const updated = data?.restaurant as YelpDebugRestaurant | undefined;
      if (!updated) {
        throw new Error("Function did not return updated restaurant.");
      }

      appendLog("✅ Yelp auto-detect completed.");
      onUpdated(updated);
    } catch (e: any) {
      console.error(e);
      setError(
        e.message ??
          "Failed to auto-detect Yelp. Check logs or API key configuration."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearYelp = async () => {
    setLoading(true);
    setError(null);
    setLog(null);

    try {
      appendLog("Clearing Yelp fields…");

      const { data, error } = await supabase
        .from("restaurants")
        .update({
          yelp_business_id: null,
          yelp_review_url: null,
        })
        .eq("id", restaurant.id)
        .select(
          "id, restaurant_name, google_place_id, google_review_url, yelp_business_id, yelp_review_url"
        )
        .single();

      if (error) throw error;

      const updated = data as YelpDebugRestaurant;
      appendLog("✅ Yelp fields cleared.");
      onUpdated(updated);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to clear Yelp fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-5 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              Yelp Debug – {restaurant.restaurant_name || "(no name)"}
            </h2>
            <p className="text-xs text-gray-500">
              Inspect and fix Yelp mapping for this restaurant.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 text-sm hover:text-gray-800"
          >
            ✕
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-gray-700">Google place</p>
            <div className="bg-gray-50 rounded-md px-2 py-1.5">
              <div className="text-[11px] text-gray-500 mb-1">
                google_place_id
              </div>
              <div className="font-mono break-all">
                {restaurant.google_place_id || "—"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-md px-2 py-1.5">
              <div className="text-[11px] text-gray-500 mb-1">
                google_review_url
              </div>
              <div className="font-mono break-all">
                {restaurant.google_review_url || "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-gray-700">Yelp</p>
            <div className="bg-gray-50 rounded-md px-2 py-1.5">
              <div className="text-[11px] text-gray-500 mb-1">
                yelp_business_id
              </div>
              <div className="font-mono break-all">
                {restaurant.yelp_business_id || "—"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-md px-2 py-1.5">
              <div className="text-[11px] text-gray-500 mb-1">
                yelp_review_url
              </div>
              <div className="font-mono break-all">
                {restaurant.yelp_review_url || "—"}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-[11px] text-red-700 bg-red-50 rounded-md px-3 py-2 whitespace-pre-line">
            {error}
          </div>
        )}
        {log && (
          <div className="text-[11px] text-gray-700 bg-gray-50 rounded-md px-3 py-2 whitespace-pre-line">
            {log}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={loading}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-black text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Working…" : "Re-run auto-detect"}
            </button>
            <button
              type="button"
              onClick={handleClearYelp}
              disabled={loading}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              Clear Yelp for this restaurant
            </button>
          </div>
          <span className="text-[11px] text-gray-400">
            Changes apply immediately to their hub.
          </span>
        </div>
      </div>
    </div>
  );
};

export default YelpDebugModal;
