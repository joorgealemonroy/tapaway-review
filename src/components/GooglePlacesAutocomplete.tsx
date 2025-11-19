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
    if (!isLoaded || !containerRef.current || !window.google?.maps?.places || disabled) {
      return;
    }

    try {
      const placeAutocompleteElement: any = new window.google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: ["us"] },
        types: ["establishment"],
      });

      const inputElement: HTMLInputElement | undefined = placeAutocompleteElement.Eg;
      const dropdownElement: HTMLElement | undefined = placeAutocompleteElement.Jg;

      if (!inputElement || !dropdownElement) {
        console.error("[GooglePlacesAutocomplete] Missing internal elements on PlaceAutocompleteElement");
        setError("Error initializing autocomplete");
        return;
      }

      // Apply initial value and disabled state
      if (defaultValue) {
        inputElement.value = defaultValue;
      }
      inputElement.disabled = !!disabled;

      // Clear container and append elements
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(inputElement);
      containerRef.current.appendChild(dropdownElement);

      // Listen for place selection
      const handlePlaceSelect = async (event: any) => {
        const place = event.place;

        if (!place?.id) {
          setError("Please select a valid place from the dropdown");
          return;
        }

        try {
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
          console.error("[GooglePlacesAutocomplete] Error fetching place fields:", err);
          setError("Error loading place details. Please try again.");
        }
      };

      placeAutocompleteElement.addEventListener("gmp-placeselect", handlePlaceSelect);

      return () => {
        placeAutocompleteElement.removeEventListener("gmp-placeselect", handlePlaceSelect);
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
