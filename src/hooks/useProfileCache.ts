/**
 * In-memory cache for personal profiles
 * Provides session-level caching with short TTL for fast repeat loads
 */

import { useRef, useCallback } from 'react';

export interface CachedProfile {
  id: string;
  username: string;
  full_name: string;
  profile_photo_url: string | null;
  header_type: string | null;
  header_color: string | null;
  header_image_url: string | null;
  background_color: string | null;
  pfp_position: string | null;
  headline: string | null;
  bio: string | null;
  // Contact card fields
  contact_enabled: boolean | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_photo_url: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  contact_title: string | null;
  contact_address: string | null;
  contact_website: string | null;
  // Premium feature
  banner_image_url: string | null;
  plan_type: string | null;
  show_shop_section: boolean | null;
  user_id?: string;
  // Founding creator
  is_founding_user?: boolean;
  founding_number?: number | null;
}

export interface CachedLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
  pill_color: string | null;
  sort_order: number;
  is_active: boolean | null;
  is_featured: boolean | null;
  display_style?: string | null;
  cover_image_url?: string | null;
  grid_size?: string | null;
  thumbnail_url?: string | null;
  is_archived?: boolean | null;
}

export interface CachedBlock {
  id: string;
  block_type: string;
  content: unknown;
  alignment: string | null;
  sort_order: number;
}

export interface CachedProfileData {
  profile: CachedProfile;
  links: CachedLink[];
  blocks: CachedBlock[];
  hasActiveCard?: boolean;
  fetchedAt: number;
}

// Global cache (persists across component mounts within session)
const profileCache = new Map<string, CachedProfileData>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get cached profile data if still valid
 */
export function getCachedProfile(username: string): CachedProfileData | null {
  const cached = profileCache.get(username.toLowerCase());
  if (!cached) return null;
  
  const age = Date.now() - cached.fetchedAt;
  if (age > CACHE_TTL_MS) {
    profileCache.delete(username.toLowerCase());
    return null;
  }
  
  return cached;
}

/**
 * Set profile data in cache
 */
export function setCachedProfile(username: string, data: Omit<CachedProfileData, 'fetchedAt'>): void {
  profileCache.set(username.toLowerCase(), {
    ...data,
    fetchedAt: Date.now(),
  });
}

/**
 * Invalidate cached profile (call after updates)
 */
export function invalidateProfileCache(username: string): void {
  profileCache.delete(username.toLowerCase());
}

/**
 * Clear all cached profiles
 */
export function clearProfileCache(): void {
  profileCache.clear();
}

/**
 * Hook for managing profile cache with automatic invalidation
 */
export function useProfileCache() {
  const pendingRef = useRef<Map<string, Promise<CachedProfileData | null>>>(new Map());
  
  const getOrFetch = useCallback(async (
    username: string,
    fetcher: () => Promise<Omit<CachedProfileData, 'fetchedAt'> | null>
  ): Promise<CachedProfileData | null> => {
    const key = username.toLowerCase();
    
    // Check cache first
    const cached = getCachedProfile(key);
    if (cached) return cached;
    
    // Check if already fetching
    const pending = pendingRef.current.get(key);
    if (pending) return pending;
    
    // Start fetch
    const fetchPromise = (async () => {
      try {
        const data = await fetcher();
        if (data) {
          setCachedProfile(key, data);
          return getCachedProfile(key);
        }
        return null;
      } finally {
        pendingRef.current.delete(key);
      }
    })();
    
    pendingRef.current.set(key, fetchPromise);
    return fetchPromise;
  }, []);
  
  return {
    getOrFetch,
    getCached: getCachedProfile,
    invalidate: invalidateProfileCache,
    clear: clearProfileCache,
  };
}

/**
 * Prefetch profile data (for use after onboarding)
 */
export async function prefetchProfile(
  username: string,
  fetcher: () => Promise<Omit<CachedProfileData, 'fetchedAt'> | null>
): Promise<void> {
  const cached = getCachedProfile(username);
  if (cached) return;
  
  try {
    const data = await fetcher();
    if (data) {
      setCachedProfile(username, data);
    }
  } catch {
    // Silently fail prefetch
  }
}
