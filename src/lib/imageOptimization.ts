/**
 * Image optimization utilities for fast loading
 * - Responsive srcset generation
 * - WebP detection
 * - LQIP (Low Quality Image Placeholder) generation
 * - Client-side compression before upload
 */

// Avatar sizes for srcset
export const AVATAR_SIZES = [64, 128, 256, 512] as const;

// Header/block image sizes
export const HEADER_SIZES = [640, 960, 1280] as const;

/**
 * Check if browser supports WebP
 */
export const supportsWebP = (() => {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
})();

/**
 * Generate responsive srcset for Supabase storage URLs
 */
export function generateSrcSet(
  baseUrl: string | null | undefined,
  sizes: readonly number[],
  type: 'width' | 'height' = 'width'
): string {
  if (!baseUrl) return '';
  
  // Clean URL of existing transform params
  const cleanUrl = baseUrl.split('?')[0];
  
  return sizes
    .map(size => {
      const transformedUrl = `${cleanUrl}?${type}=${size}&quality=85`;
      return `${transformedUrl} ${size}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(maxWidth: number): string {
  return `(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`;
}

/**
 * Get optimal image URL for a specific viewport
 */
export function getOptimalImageUrl(
  baseUrl: string | null | undefined,
  targetWidth: number,
  quality: number = 85
): string {
  if (!baseUrl) return '';
  const cleanUrl = baseUrl.split('?')[0];
  return `${cleanUrl}?width=${targetWidth}&quality=${quality}`;
}

/**
 * Generate a tiny LQIP (Low Quality Image Placeholder) data URL
 */
export async function generateLQIP(imageUrl: string, size: number = 20): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve('');
        return;
      }
      
      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      const width = aspectRatio >= 1 ? size : size * aspectRatio;
      const height = aspectRatio >= 1 ? size / aspectRatio : size;
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to low quality JPEG
      resolve(canvas.toDataURL('image/jpeg', 0.3));
    };
    
    img.onerror = () => resolve('');
    img.src = imageUrl;
  });
}

/**
 * Compress image before upload with multiple size variants
 */
export interface CompressedImageVariant {
  size: number;
  blob: Blob;
  dataUrl: string;
}

export async function compressImageWithVariants(
  file: File | Blob,
  sizes: readonly number[],
  quality: number = 0.85
): Promise<CompressedImageVariant[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = async () => {
      const variants: CompressedImageVariant[] = [];
      
      for (const targetSize of sizes) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;
        
        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > targetSize) {
            height = (height / width) * targetSize;
            width = targetSize;
          }
        } else {
          if (height > targetSize) {
            width = (width / height) * targetSize;
            height = targetSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/webp', quality);
        
        const blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob(
            (b) => (b ? res(b) : rej(new Error('Failed to create blob'))),
            'image/webp',
            quality
          );
        });
        
        variants.push({ size: targetSize, blob, dataUrl });
      }
      
      resolve(variants);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress a single image to a max dimension
 */
export async function compressImage(
  file: File | Blob,
  maxDimension: number = 1024,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }
      
      let { width, height } = img;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        supportsWebP ? 'image/webp' : 'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
