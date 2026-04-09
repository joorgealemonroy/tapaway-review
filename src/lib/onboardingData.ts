/**
 * Centralized onboarding data management
 * Single source of truth for all onboarding state
 */

const STORAGE_KEY = 'tapaway_onboarding_data';
const VERIFIED_KEY = 'tapaway_onboarding_verified';
const PENDING_SETUP_KEY = 'tapaway_pending_setup';

export interface OnboardingData {
  email: string;
  businessName: string;
  city: string;
  state: string;
  businessType: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  logoUploaded: boolean;
  logoUrl?: string;
  unbrandedCards: boolean;
  planType?: string;
  hasProtection?: boolean;
  cardHeadline?: string;
  cardSubHeadline?: string;
  ownerName?: string;
  customSlug?: string;
  instagram?: string;
  phone?: string;
  googlePlaceId?: string;
  googlePlaceName?: string;
  googlePlaceAddress?: string;
}

const defaultData: OnboardingData = {
  email: '',
  businessName: '',
  city: '',
  state: '',
  businessType: '',
  shippingAddress: '',
  shippingCity: '',
  shippingState: '',
  shippingZip: '',
  logoUploaded: false,
  unbrandedCards: false,
  ownerName: '',
  customSlug: '',
  instagram: '',
  phone: '',
};

/**
 * Get all onboarding data from localStorage
 */
export function getOnboardingData(): OnboardingData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultData, ...JSON.parse(stored) };
    }
    
    // Migrate from legacy keys if they exist
    const legacyData = migrateLegacyData();
    if (legacyData) {
      saveOnboardingData(legacyData);
      return legacyData;
    }
  } catch (e) {
    console.error('[onboardingData] Error reading data:', e);
  }
  return defaultData;
}

/**
 * Save onboarding data to localStorage (merges with existing)
 */
export function saveOnboardingData(data: Partial<OnboardingData>): void {
  try {
    const existing = getOnboardingData();
    const merged = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    
    // Also set the pending setup flag
    localStorage.setItem(PENDING_SETUP_KEY, 'true');
  } catch (e) {
    console.error('[onboardingData] Error saving data:', e);
  }
}

/**
 * Update a single field
 */
export function updateOnboardingField<K extends keyof OnboardingData>(
  field: K, 
  value: OnboardingData[K]
): void {
  saveOnboardingData({ [field]: value } as Partial<OnboardingData>);
}

/**
 * Clear all onboarding data (call after successful completion)
 */
export function clearOnboardingData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERIFIED_KEY);
    localStorage.removeItem(PENDING_SETUP_KEY);
    
    // Also clear legacy keys
    const legacyKeys = [
      'tapaway_pending_email',
      'tapaway_pending_business',
      'tapaway_pending_city',
      'tapaway_pending_state',
      'tapaway_pending_type',
      'tapaway_pending_shipping_address',
      'tapaway_pending_unbranded',
      'tapaway_pending_logo_selected',
    ];
    legacyKeys.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('[onboardingData] Error clearing data:', e);
  }
}

/**
 * Check if email has been verified in this session
 */
export function isEmailVerified(): boolean {
  return localStorage.getItem(VERIFIED_KEY) === 'true';
}

/**
 * Mark email as verified
 */
export function setEmailVerified(): void {
  localStorage.setItem(VERIFIED_KEY, 'true');
}

/**
 * Check if user is in pending setup state
 */
export function isPendingSetup(): boolean {
  return localStorage.getItem(PENDING_SETUP_KEY) === 'true';
}

/**
 * Set pending setup flag
 */
export function setPendingSetup(value: boolean): void {
  if (value) {
    localStorage.setItem(PENDING_SETUP_KEY, 'true');
  } else {
    localStorage.removeItem(PENDING_SETUP_KEY);
  }
}

/**
 * Generate a URL-safe slug from business name
 */
export function generateSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Migrate from legacy localStorage keys
 */
function migrateLegacyData(): OnboardingData | null {
  const email = localStorage.getItem('tapaway_pending_email');
  const businessName = localStorage.getItem('tapaway_pending_business');
  
  if (!email && !businessName) {
    return null;
  }
  
  return {
    email: email || '',
    businessName: businessName || '',
    city: localStorage.getItem('tapaway_pending_city') || '',
    state: localStorage.getItem('tapaway_pending_state') || '',
    businessType: localStorage.getItem('tapaway_pending_type') || '',
    shippingAddress: localStorage.getItem('tapaway_pending_shipping_address') || '',
    logoUploaded: localStorage.getItem('tapaway_pending_logo_selected') === 'true',
    unbrandedCards: localStorage.getItem('tapaway_pending_unbranded') === 'true',
  };
}
