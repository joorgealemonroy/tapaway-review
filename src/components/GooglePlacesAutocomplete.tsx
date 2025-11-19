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
      console.log("[GooglePlacesAutocomplete] Google Maps Places library already loaded");
      setIsLoaded(true);
      return;
    }

    // Check if script is loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      console.log("[GooglePlacesAutocomplete] Script already loading, waiting...");
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          console.log("[GooglePlacesAutocomplete] Places library now available");
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

    console.log("[GooglePlacesAutocomplete] Loading Google Maps script with Places library");
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;

    window.initMap = () => {
      console.log("[GooglePlacesAutocomplete] Google Maps script loaded successfully");
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
    if (!isLoaded || !containerRef.current || disabled) {
      return;
    }

    // Strict readiness check
    if (!window.google?.maps?.places?.PlaceAutocompleteElement) {
      console.error("[GooglePlacesAutocomplete] PlaceAutocompleteElement not available");
      setError("Google Places library not fully loaded");
      return;
    }

    try {
      console.log("[GooglePlacesAutocomplete] Initializing PlaceAutocompleteElement");
      
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
        console.log("[GooglePlacesAutocomplete] Place selected", event);
        const place = event.place;

        if (!place?.id) {
          console.error("[GooglePlacesAutocomplete] Invalid place selected");
          setError("Please select a valid place from the dropdown");
          return;
        }

        try {
          // Fetch place details
          await place.fetchFields({
            fields: ["id", "displayName", "formattedAddress"],
          });

          console.log("[GooglePlacesAutocomplete] Place details fetched:", {
            id: place.id,
            name: place.displayName,
            address: place.formattedAddress,
          });

          onPlaceSelected({
            placeId: place.id,
            name: place.displayName || "",
            address: place.formattedAddress || "",
          });

          setError(null);
        } catch (err) {
          console.error("[GooglePlacesAutocomplete] Error fetching place fields:", err);
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
