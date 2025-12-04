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

      // Handler for place selection - works with both event types
      const handlePlaceSelection = async (event: any) => {
        console.log('[GooglePlacesAutocomplete] Place selection event fired:', event.type, event);
        
        // The new API uses 'gmp-select' with placePrediction
        // Also handle 'gmp-placeselect' for backwards compatibility
        let place = event.place;
        let placePrediction = event.placePrediction;
        
        console.log('[GooglePlacesAutocomplete] Event data:', { place, placePrediction });

        // If we have a placePrediction (new API format), convert it to a Place
        if (placePrediction && !place) {
          try {
            console.log('[GooglePlacesAutocomplete] Converting placePrediction to Place...');
            place = await placePrediction.toPlace();
            console.log('[GooglePlacesAutocomplete] Converted place:', place);
          } catch (err) {
            console.error('[GooglePlacesAutocomplete] Error converting placePrediction:', err);
          }
        }

        if (!place) {
          console.error('[GooglePlacesAutocomplete] No place object available');
          setError("Please select a valid place from the dropdown");
          return;
        }

        try {
          // Fetch place details
          await place.fetchFields({
            fields: ["id", "displayName", "formattedAddress"],
          });

          console.log('[GooglePlacesAutocomplete] After fetchFields:', {
            id: place.id,
            displayName: place.displayName,
            formattedAddress: place.formattedAddress,
          });

          // Extract the place ID
          const placeId = place.id;
          
          if (!placeId) {
            console.error('[GooglePlacesAutocomplete] No place.id after fetchFields');
            setError("Could not get place ID. Please try again.");
            return;
          }

          // In the new Places API, displayName is a LocalizedText object
          const placeName = typeof place.displayName === 'object' 
            ? (place.displayName?.text || place.displayName?.toString() || "")
            : (place.displayName || "");
          
          const placeAddress = place.formattedAddress || "";

          console.log('[GooglePlacesAutocomplete] Calling onPlaceSelected with:', {
            placeId,
            name: placeName,
            address: placeAddress,
          });

          onPlaceSelected({
            placeId,
            name: placeName,
            address: placeAddress,
          });

          setError(null);
        } catch (err) {
          console.error("[GooglePlacesAutocomplete] Error fetching place details:", err);
          setError("Error loading place details. Please try again.");
        }
      };

      // Listen for BOTH event types to ensure compatibility
      placeAutocomplete.addEventListener("gmp-placeselect", handlePlaceSelection);
      placeAutocomplete.addEventListener("gmp-select", handlePlaceSelection);

      console.log("[GooglePlacesAutocomplete] Initialization complete - listening for gmp-placeselect and gmp-select events");

      return () => {
        placeAutocomplete.removeEventListener("gmp-placeselect", handlePlaceSelection);
        placeAutocomplete.removeEventListener("gmp-select", handlePlaceSelection);
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
