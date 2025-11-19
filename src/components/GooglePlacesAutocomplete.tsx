import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (!isLoaded || !containerRef.current || disabled) {
      return;
    }

    // Strict readiness check
    if (!window.google?.maps?.places?.PlaceAutocompleteElement) {
      setError("Google Places library not fully loaded");
      return;
    }

    try {
      // Create the PlaceAutocompleteElement
      const placeAutocomplete = new window.google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: ["us"] },
        types: ["establishment"],
      });

      // Set default value if provided
      if (defaultValue) {
        placeAutocomplete.value = defaultValue;
      }

      // Clear container and append the element directly
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(placeAutocomplete);

      // Listen for place selection
      const handlePlaceSelect = async (event: any) => {
        const place = event.place;

        if (!place?.id) {
          setError("Please select a valid place from the dropdown");
          return;
        }

        try {
          // Fetch place details
          await place.fetchFields({
            fields: ["id", "displayName", "formattedAddress"],
          });

          onPlaceSelected({
            placeId: place.id,
            name: place.displayName || "",
            address: place.formattedAddress || "",
          });

          setError(null);
        } catch (err) {
          console.error("Error fetching place details:", err);
          setError("Error loading place details. Please try again.");
        }
      };

      placeAutocomplete.addEventListener("gmp-placeselect", handlePlaceSelect);

      console.log("[GooglePlacesAutocomplete] Initialization complete");

      return () => {
        placeAutocomplete.removeEventListener("gmp-placeselect", handlePlaceSelect);
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      };
    } catch (err) {
      console.error("[GooglePlacesAutocomplete] Error initializing:", err);
      setError("Error initializing autocomplete");
    }
  }, [isLoaded, onPlaceSelected, defaultValue, disabled]);

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
      <Label htmlFor="google-places-autocomplete">Search Your Business on Google</Label>
      <div
        ref={containerRef}
        id="google-places-autocomplete"
        className="mt-2 relative z-30 min-h-[44px]"
      />
      {!isLoaded && (
        <div className="text-xs text-muted-foreground mt-1">
          Loading Google Places...
        </div>
      )}
    </div>
  );
};
