import { useEffect } from "react";

/**
 * Hook to dynamically set the document background color.
 * This ensures the html/body background matches the page theme,
 * preventing visible gaps (e.g., white bar at bottom on dark pages).
 * 
 * The background is restored to the previous value on unmount.
 */
export function useAppBackground(background: string | null) {
  useEffect(() => {
    if (!background) return;

    const root = document.documentElement;
    const previousValue = root.style.getPropertyValue('--app-bg');
    
    root.style.setProperty('--app-bg', background);

    return () => {
      if (previousValue) {
        root.style.setProperty('--app-bg', previousValue);
      } else {
        root.style.removeProperty('--app-bg');
      }
    };
  }, [background]);
}
