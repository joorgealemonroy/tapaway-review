/**
 * vCard generation utility for contact card downloads
 */

export interface VCardData {
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  address?: string;
  website?: string;
  profilePhotoUrl?: string;
}

/**
 * Escape special characters for vCard format
 */
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fetch an image URL and return its base64 encoding + type.
 * Returns null if anything fails (CORS, network, etc.)
 */
async function fetchImageAsBase64(url: string): Promise<{ base64: string; type: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const imageType = contentType.split('/')[1]?.toUpperCase().replace('SVG+XML', 'PNG') || 'JPEG';

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return { base64, type: imageType };
  } catch (err) {
    console.warn('[vCard] Failed to fetch image as base64, will use URI fallback:', err);
    return null;
  }
}

/**
 * Generate a vCard 3.0 formatted string
 */
export async function generateVCard(data: VCardData): Promise<string> {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
  ];

  // Full name (required)
  const nameParts = data.fullName.trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  
  lines.push(`N:${escapeVCardValue(lastName || '')};${escapeVCardValue(firstName)};;;`);
  lines.push(`FN:${escapeVCardValue(data.fullName)}`);

  // Organization
  if (data.company) {
    lines.push(`ORG:${escapeVCardValue(data.company)}`);
  }

  // Title
  if (data.title) {
    lines.push(`TITLE:${escapeVCardValue(data.title)}`);
  }

  // Phone
  if (data.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(data.phone)}`);
  }

  // Email
  if (data.email) {
    lines.push(`EMAIL:${escapeVCardValue(data.email)}`);
  }

  // Address (simplified - just use as a single field)
  if (data.address) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(data.address)};;;;`);
  }

  // Website
  if (data.website) {
    lines.push(`URL:${data.website}`);
  }

  // Photo - try base64 first, fall back to URI reference
  if (data.profilePhotoUrl) {
    const photo = await fetchImageAsBase64(data.profilePhotoUrl);
    if (photo) {
      lines.push(`PHOTO;ENCODING=b;TYPE=${photo.type}:${photo.base64}`);
    } else {
      // Fallback: embed as URI — works on iOS/Android without CORS
      lines.push(`PHOTO;VALUE=uri:${data.profilePhotoUrl}`);
    }
  }

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Generate vCard and trigger download
 */
export async function downloadVCard(data: VCardData, filename?: string): Promise<void> {
  const vcard = await generateVCard(data);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${data.fullName.replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
