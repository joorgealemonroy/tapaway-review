import { SupabaseClient } from '@supabase/supabase-js';

export interface AppSettings {
  paywallEnabled: boolean;
}

/**
 * Fetch global app settings from Supabase
 */
export const getAppSettings = async (supabaseClient: SupabaseClient): Promise<AppSettings> => {
  const { data, error } = await supabaseClient
    .from('app_settings')
    .select('paywall_enabled')
    .eq('id', 'global')
    .single();

  if (error) {
    console.error('Error fetching app settings:', error);
    // Default to paywall enabled if we can't fetch settings
    return { paywallEnabled: true };
  }

  return {
    paywallEnabled: data?.paywall_enabled ?? true
  };
};

/**
 * Update the global paywall enabled setting (admin only)
 */
export const setPaywallEnabled = async (
  supabaseClient: SupabaseClient, 
  enabled: boolean
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabaseClient
    .from('app_settings')
    .update({ 
      paywall_enabled: enabled,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'global');

  if (error) {
    console.error('Error updating paywall setting:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Determine if paywall should be enforced for a given restaurant
 * 
 * Logic:
 * - Legacy users (is_legacy_user = true): Always use original behavior (check subscription_status)
 * - Non-legacy users: Respect global paywall toggle
 *   - If paywall disabled globally: bypass subscription checks
 *   - If paywall enabled globally: enforce subscription checks
 */
export const shouldEnforcePaywall = ({
  isLegacyUser,
  subscriptionStatus,
  paywallEnabled
}: {
  isLegacyUser: boolean;
  subscriptionStatus: string | null;
  paywallEnabled: boolean;
}): boolean => {
  // Legacy users always use original behavior - check subscription status
  if (isLegacyUser) {
    return subscriptionStatus !== 'active';
  }

  // Non-legacy users respect the global toggle
  if (!paywallEnabled) {
    // Paywall is globally disabled for testing - don't enforce
    return false;
  }

  // Paywall is enabled - enforce subscription check
  return subscriptionStatus !== 'active';
};
