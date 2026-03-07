import { useState, useEffect, memo, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Transform Supabase storage URL to request optimized image
 * For pre-optimized images (webp, already compressed), return as-is
 * Only apply Supabase transforms for legacy large images
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality = 85
): string {
  if (!url) return '';
  
  // Non-Supabase URLs - return as-is
  if (!url.includes('supabase.co/storage')) return url;
  
  const [baseUrl, queryString] = url.split('?');
  const t = new URLSearchParams(queryString || '').get('t');
  const cacheBuster = t ? `&t=${t}` : '';
  
  // Pre-optimized images (webp) - just preserve cache buster
  if (baseUrl.endsWith('.webp')) {
    return t ? `${baseUrl}?t=${t}` : baseUrl;
  }
  
  // Legacy images - use Supabase transforms + cache buster
  return `${baseUrl}?width=${width}&quality=${quality}${cacheBuster}`;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  url: string | null | undefined,
  sizes: number[],
  quality = 85
): string {
  if (!url || !url.includes('supabase.co/storage')) return '';
  const [baseUrl, queryString] = url.split('?');
  const t = new URLSearchParams(queryString || '').get('t');
  const cacheBuster = t ? `&t=${t}` : '';
  
  // Pre-optimized webp images - no srcset needed, already optimized
  if (baseUrl.endsWith('.webp')) {
    return '';
  }
  
  return sizes
    .map(size => `${baseUrl}?width=${size}&quality=${quality}${cacheBuster} ${size}w`)
    .join(', ');
}

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  fallback?: React.ReactNode;
  aspectRatio?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  width?: number;
}

/**
 * Optimized image component with:
 * - Native lazy loading
 * - Async decoding
 * - Blur-up placeholder
 * - Error handling with fallback
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  sizes = '100vw',
  priority = false,
  onLoad,
  fallback,
  aspectRatio,
  objectFit = 'cover',
  width,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // Check if image is already cached
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  if (!src || hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  // Apply Supabase image transformation if width specified
  const optimizedSrc = width ? getOptimizedImageUrl(src, width) : src;
  const srcSet = width ? generateSrcSet(src, [width, width * 2]) : undefined;

  const containerStyle = aspectRatio
    ? { paddingBottom: `${(1 / aspectRatio) * 100}%` }
    : undefined;

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        aspectRatio && 'w-full',
        className
      )}
      style={containerStyle}
    >
      {/* Blur placeholder while loading */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            aspectRatio ? 'absolute' : 'w-full h-full'
          )}
        />
      )}
      
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          aspectRatio ? 'absolute inset-0 w-full h-full' : 'w-full h-full',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          priority ? 'transition-opacity duration-150' : 'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
});

/**
 * Optimized avatar component with circular mask
 */
interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
  fallbackInitial?: string;
}

export const OptimizedAvatar = memo(function OptimizedAvatar({
  src,
  alt,
  size,
  className,
  priority = false,
  fallbackInitial,
}: OptimizedAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  const sizeStyle = { width: size * 4, height: size * 4 }; // Tailwind units are 4px
  const pixelSize = size * 4;
  
  // Optimized image URLs for 1x and 2x displays
  const optimizedSrc = getOptimizedImageUrl(src, pixelSize, 90);
  const srcSet = src ? `${getOptimizedImageUrl(src, pixelSize, 90)} 1x, ${getOptimizedImageUrl(src, pixelSize * 2, 85)} 2x` : undefined;

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center',
          className
        )}
        style={sizeStyle}
      >
        {fallbackInitial && (
          <span className="text-xl font-bold text-muted-foreground">
            {fallbackInitial}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('relative rounded-full overflow-hidden', className)}
      style={sizeStyle}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />
      )}
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'w-full h-full object-cover rounded-full',
          'transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
});

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    link.onload = () => resolve();
    link.onerror = () => reject();
    document.head.appendChild(link);
  });
}

/**
 * Preload multiple images
 */
export function preloadImages(srcs: (string | null | undefined)[]): void {
  srcs.filter(Boolean).forEach((src) => {
    if (src) {
      const img = new Image();
      img.src = src;
    }
  });
}
