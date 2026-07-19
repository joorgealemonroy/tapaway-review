/**
 * Optimized hook for fetching personal profile data
 * - Single query fetch
 * - In-memory caching
 * - Stale-while-revalidate pattern
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCachedProfile, 
  setCachedProfile,
  invalidateProfileCache,
  type CachedProfile,
  type CachedLink,
  type CachedBlock,
} from './useProfileCache';
import { isUsernameReserved } from '@/lib/reservedUsernames';
import { getOptimizedImageUrl } from '@/components/personal/OptimizedImage';

/**
 * Inject <link rel="preload"> for critical profile images
 */
function preloadCriticalImages(data: ProfileData): void {
  const urls = [
    data.profile.profile_photo_url,
    data.profile.header_image_url,
  ].filter(Boolean) as string[];

  // Preload ALL link cover images and thumbnails
  data.links.forEach(l => {
    if (l.cover_image_url) urls.push(l.cover_image_url);
    if (l.thumbnail_url) urls.push(l.thumbnail_url);
  });

  urls.forEach(url => {
    const optimized = getOptimizedImageUrl(url, 640, 85);
    const existing = document.querySelector(`link[rel="preload"][href="${optimized}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimized;
    document.head.appendChild(link);
  });
}

export interface ProfileData {
  profile: CachedProfile;
  links: CachedLink[];
  blocks: CachedBlock[];
  hasActiveCard: boolean;
}

interface UseProfileDataResult {
  data: ProfileData | null;
  loading: boolean;
  error: 'not_found' | 'error' | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch parallel data (links, blocks, nfc) given a profile
 */
async function fetchParallelData(profileData: { id: string; user_id?: string }): Promise<Omit<ProfileData, 'profile'>> {
  const [linksResult, blocksResult, hasCardResult] = await Promise.all([
    supabase
      .from('personal_links')
      .select('id, link_type, label, url, pill_color, sort_order, is_active, is_featured, display_style, cover_image_url, grid_size, is_archived, thumbnail_url')
      .eq('profile_id', profileData.id)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('sort_order', { ascending: true }),
    supabase
      .from('personal_blocks')
      .select('id, block_type, content, alignment, sort_order, is_archived')
      .eq('profile_id', profileData.id)
      .eq('is_active', true)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('sort_order', { ascending: true }),
    profileData.user_id
      ? supabase.rpc('profile_has_active_card', { _user_id: profileData.user_id })
      : Promise.resolve({ data: false as boolean | null }),
  ]);

  return {
    links: linksResult.data || [],
    blocks: blocksResult.data || [],
    hasActiveCard: Boolean((hasCardResult as { data: boolean | null }).data),
  };
}

/**
 * Fetch all profile data from scratch (username lookup + parallel)
 */
async function fetchProfileData(username: string): Promise<ProfileData | null> {
  const { data: profileData, error: profileError } = await supabase
    .from('personal_profiles_public')
    .select('id, user_id, username, full_name, profile_photo_url, subscription_status, header_type, header_color, header_image_url, background_color, pfp_position, headline, bio, contact_enabled, contact_name, contact_email, contact_photo_url, contact_phone, contact_company, contact_title, contact_address, contact_website, banner_image_url, plan_type, show_shop_section, is_founding_user, founding_number, show_founding_badge, bg_style, vibe_id, button_theme, text_color, show_username, is_approved')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  const isPubliclyVisible =
    profileData?.subscription_status === 'active' ||
    (profileData?.subscription_status === 'trialing' && (profileData as { is_approved?: boolean }).is_approved === true);

  if (profileError || !profileData || !isPubliclyVisible) {
    return null;
  }

  // Resolve user_id privately via RPC for the hasActiveCard check (not exposed publicly)
  const parallel = await fetchParallelData(profileData as { id: string; user_id?: string });
  return { profile: profileData as any, ...parallel };
}

export function useProfileData(username: string | undefined, initialProfile?: CachedProfile): UseProfileDataResult {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'error' | null>(null);
  const initialProfileRef = useRef(initialProfile);

  const loadProfile = useCallback(async () => {
    if (!username) {
      setError('not_found');
      setLoading(false);
      return;
    }

    // Check reserved usernames
    if (isUsernameReserved(username)) {
      setError('not_found');
      setLoading(false);
      return;
    }

    // If we have a pre-resolved profile from the resolver, skip the profile query
    const preResolved = initialProfileRef.current;
    if (preResolved) {
      initialProfileRef.current = undefined; // Only use once
      try {
        const parallel = await fetchParallelData(preResolved);
        const result: ProfileData = { profile: preResolved, ...parallel };
        setCachedProfile(username, result);
        setData(result);
        setError(null);
        preloadCriticalImages(result);
      } catch (err) {
        console.error('Error fetching profile parallel data:', err);
        setError('error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Check cache first (instant)
    const cached = getCachedProfile(username);
    if (cached) {
      setData({
        profile: cached.profile,
        links: cached.links,
        blocks: cached.blocks,
        hasActiveCard: cached.hasActiveCard ?? false,
      });
      setLoading(false);
      setError(null);
      
      // Background revalidate if cache is older than 30s
      const age = Date.now() - cached.fetchedAt;
      if (age > 30000) {
        fetchProfileData(username).then((freshData) => {
          if (freshData) {
            setCachedProfile(username, freshData);
            setData(freshData);
          }
        });
      }
      return;
    }

    try {
      setLoading(true);
      const result = await fetchProfileData(username);
      
      if (!result) {
        setError('not_found');
        setData(null);
      } else {
        setCachedProfile(username, result);
        setData(result);
        setError(null);
        preloadCriticalImages(result);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('error');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const refetch = useCallback(async () => {
    invalidateProfileCache(username || '');
    await loadProfile();
  }, [loadProfile, username]);

  return { data, loading, error, refetch };
}

/**
 * Track profile visit (fire and forget, non-blocking)
 */
export function trackProfileVisit(profileId: string): void {
  // Use requestIdleCallback if available for non-blocking tracking
  const track = () => {
    supabase
      .from('personal_analytics')
      .insert({
        profile_id: profileId,
        event_type: 'profile_visit',
        visitor_info: {
          referrer: document.referrer || null,
          userAgent: navigator.userAgent,
        },
      })
      .then(() => {});
  };

  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(track);
  } else {
    setTimeout(track, 0);
  }
}
