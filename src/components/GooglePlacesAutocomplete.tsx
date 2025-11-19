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
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const GooglePlacesAutocomplete = ({
  onPlaceSelected,
  defaultValue = "",
  disabled = false,
}: GooglePlacesAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Load script
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      setError("Google Maps API key not configured");
      console.error("[GooglePlacesAutocomplete] Invalid or missing API key");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;

    window.initMap = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError("Failed to load Google Maps");
      console.error("[GooglePlacesAutocomplete] Script failed to load");
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window.initMap;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google?.maps?.places) {
      return;
    }

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: ["place_id", "name", "formatted_address"],
          types: ["establishment"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();

        if (!place?.place_id) {
          setError("Please select a valid place from the dropdown");
          return;
        }

        onPlaceSelected({
          placeId: place.place_id,
          name: place.name || "",
          address: place.formatted_address || "",
        });

        setError(null);
      });
    } catch (err) {
      console.error("[GooglePlacesAutocomplete] Error initializing:", err);
      setError("Error initializing autocomplete");
    }
  }, [isLoaded, onPlaceSelected]);

  if (error) {
    return (
      <div>
        <Label>Search Your Business on Google</Label>
        <div className="text-sm text-destructive mt-2">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="google-places-input">Search Your Business on Google</Label>
      <Input
        ref={inputRef}
        id="google-places-input"
        type="text"
        placeholder={defaultValue || "Start typing your restaurant name..."}
        defaultValue={defaultValue}
        disabled={disabled || !isLoaded}
        className="mt-2"
      />
      {!isLoaded && (
        <div className="text-xs text-muted-foreground mt-1">
          Loading Google Places...
        </div>
      )}
    </div>
  );
};
