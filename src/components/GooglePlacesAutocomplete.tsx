import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (place: {
    placeId: string;
    name: string;
    address: string;
    reviewUrl: string;
  }) => void;
  defaultValue?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

export const GooglePlacesAutocomplete = ({ 
  onPlaceSelected, 
  defaultValue = "",
  disabled = false 
}: GooglePlacesAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      initAutocomplete();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    // Even if the key is misconfigured, attempt to load the script and let the
    // standard onerror handler surface a generic error to the user.
    if (!apiKey) {
      console.warn("[GooglePlacesAutocomplete] VITE_GOOGLE_MAPS_API_KEY is not set");
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;

    window.initGooglePlaces = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window.initGooglePlaces;
    };
  }, []);

  useEffect(() => {
    if (isLoaded && inputRef.current) {
      initAutocomplete();
    }
  }, [isLoaded]);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
      types: ['establishment']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.place_id || !place.geometry) {
        setError('Please select a valid place from the dropdown');
        return;
      }

      // Generate Google Review URL from place_id
      const reviewUrl = `https://search.google.com/local/writereview?placeid=${place.place_id}`;

      onPlaceSelected({
        placeId: place.place_id,
        name: place.name || '',
        address: place.formatted_address || '',
        reviewUrl
      });

      setError(null);
    });
  };

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
      <Label htmlFor="google-places-search">Search Your Business on Google</Label>
      <Input
        ref={inputRef}
        id="google-places-search"
        type="text"
        placeholder="Start typing your restaurant name..."
        defaultValue={defaultValue}
        disabled={disabled || !isLoaded}
        className="mt-2"
      />
      {!isLoaded && (
        <div className="text-xs text-muted-foreground mt-1">Loading Google Places...</div>
      )}
    </div>
  );
};
