import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (place: {
    placeId: string;
    name: string;
    address: string;
  }) => void;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the Google Maps script
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      setError("Google Maps API key not configured");
      onError?.("Google Maps API key not configured");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    window.initGoogleMaps = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError("Failed to load Google Maps");
      onError?.("Failed to load Google Maps");
    };

    document.head.appendChild(script);

    return () => {
      delete window.initGoogleMaps;
    };
  }, []);

  // Initialize the classic Autocomplete widget
  useEffect(() => {
    if (!isLoaded || !inputRef.current || disabled) return;

    if (!window.google?.maps?.places?.Autocomplete) {
      setError("Google Places library not fully loaded");
      onError?.("Google Places library not fully loaded");
      return;
    }

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["establishment"],
          componentRestrictions: { country: "us" },
          fields: ["place_id", "name", "formatted_address"],
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        console.log("[GooglePlacesAutocomplete] place_changed:", place);

        if (!place?.place_id) {
          console.warn("[GooglePlacesAutocomplete] No place_id in selected place");
          return;
        }

        onPlaceSelected({
          placeId: place.place_id,
          name: place.name || "",
          address: place.formatted_address || "",
        });

        setError(null);
      });

      autocompleteRef.current = autocomplete;

      console.log("[GooglePlacesAutocomplete] Classic Autocomplete initialized");

      return () => {
        if (autocompleteRef.current) {
          window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (err) {
      console.error("[GooglePlacesAutocomplete] Error initializing:", err);
      setError("Error initializing autocomplete");
    }
  }, [isLoaded, disabled, onPlaceSelected]);

  if (error) {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <div className="text-sm text-destructive mt-2">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {label && <Label className="text-gray-300 text-sm">{label}</Label>}
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder={placeholder}
        className={`mt-1 flex h-12 w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-base text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
      {!isLoaded && (
        <div className="text-xs text-gray-500 mt-1">
          Loading Google Places...
        </div>
      )}
    </div>
  );
};
