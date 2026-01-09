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
  type CachedProfile,
  type CachedLink,
  type CachedBlock,
} from './useProfileCache';
import { isUsernameReserved } from '@/lib/reservedUsernames';

export interface ProfileData {
  profile: CachedProfile;
  links: CachedLink[];
  blocks: CachedBlock[];
}

interface UseProfileDataResult {
  data: ProfileData | null;
  loading: boolean;
  error: 'not_found' | 'error' | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch all profile data in optimized parallel queries
 */
async function fetchProfileData(username: string): Promise<ProfileData | null> {
  // First fetch profile to get ID
  const { data: profileData, error: profileError } = await supabase
    .from('personal_profiles')
    .select('id, username, full_name, profile_photo_url, subscription_status, header_type, header_color, header_image_url, background_color, pfp_position, headline, bio, contact_enabled, contact_name, contact_email, contact_photo_url, contact_phone, contact_company, contact_title, contact_address, contact_website')
    .eq('username', username.toLowerCase())
    .single();

  if (profileError || !profileData || profileData.subscription_status !== 'active') {
    return null;
  }

  // Parallel fetch links and blocks - filter out archived content
  const [linksResult, blocksResult] = await Promise.all([
    supabase
      .from('personal_links')
      .select('id, link_type, label, url, pill_color, sort_order, is_active, is_featured, display_style, cover_image_url, grid_size, is_archived')
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
  ]);

  return {
    profile: profileData,
    links: linksResult.data || [],
    blocks: blocksResult.data || [],
  };
}

export function useProfileData(username: string | undefined): UseProfileDataResult {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'error' | null>(null);
  const fetchedRef = useRef<string | null>(null);

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

    // Check cache first (instant)
    const cached = getCachedProfile(username);
    if (cached) {
      setData({
        profile: cached.profile,
        links: cached.links,
        blocks: cached.blocks,
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

    // Prevent duplicate fetches
    if (fetchedRef.current === username) return;
    fetchedRef.current = username;

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
    fetchedRef.current = null;
    await loadProfile();
  }, [loadProfile]);

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
