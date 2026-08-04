import { useCallback, useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";

interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  phone?: string | null;
  website?: string | null;
  googleMapsUri?: string | null;
  photoName?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (place: {
    placeId: string;
    name: string;
    address: string;
    phone?: string | null;
    website?: string | null;
    googleMapsUri?: string | null;
    photoName?: string | null;
    lat?: number | null;
    lng?: number | null;
  }) => void;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
  onError?: (error: string) => void;
}

export const GooglePlacesAutocomplete = ({
  onPlaceSelected,
  defaultValue = "",
  disabled = false,
  placeholder = "Search your business…",
  className = "",
  label = "Search Your Business on Google",
  onError,
}: GooglePlacesAutocompleteProps) => {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("lookup-place-id", {
        body: { address: q },
      });

      if (fnError) throw fnError;

      const items: PlaceResult[] = data?.results ?? [];
      setResults(items);
      setShowDropdown(items.length > 0);

      if (data?.error) {
        const msg = data.error;
        setError(msg);
        onError?.(msg);
        setShowDropdown(false);
        return;
      }

      if (items.length === 0) {
        setShowDropdown(true); // show "no results" message
      }
    } catch (err: any) {
      console.error("[GooglePlacesAutocomplete] search error:", err);
      const msg = err?.message || "Search failed";
      setError(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (result: PlaceResult) => {
    setQuery(result.name);
    setShowDropdown(false);
    setResults([]);
    onPlaceSelected({
      placeId: result.placeId,
      name: result.name,
      address: result.formattedAddress,
      phone: result.phone ?? null,
      website: result.website ?? null,
      googleMapsUri: result.googleMapsUri ?? null,
      photoName: result.photoName ?? null,
      lat: result.lat ?? null,
      lng: result.lng ?? null,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <Label className="text-gray-300 text-sm">{label}</Label>}
      <div className="relative mt-1">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`flex h-12 w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-base text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {error && <div className="text-sm text-red-400 mt-1">{error}</div>}

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#1a2236] shadow-xl overflow-hidden">
          {results.length === 0 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-400">No businesses found</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.placeId + i}
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                onClick={() => handleSelect(r)}
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{r.name}</div>
                  <div className="text-xs text-gray-400 truncate">{r.formattedAddress}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
