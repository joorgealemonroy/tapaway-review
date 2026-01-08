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
 * Generate a vCard 3.0 formatted string
 */
export function generateVCard(data: VCardData): string {
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

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Generate vCard and trigger download
 */
export function downloadVCard(data: VCardData, filename?: string): void {
  const vcard = generateVCard(data);
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
