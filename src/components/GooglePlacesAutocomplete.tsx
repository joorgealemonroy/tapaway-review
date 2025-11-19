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
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    const interval = setInterval(() => {
      if (window.google?.maps?.places) {
        setIsLoaded(true);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
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
        placeholder={defaultValue || "Start typing your restaurant name..."}
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
