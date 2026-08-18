/**
 * Phone Auth Helper Utilities for CHIDYPRIME
 */

export function normalizePhoneNumber(phone: string): string {
  let cleaned = (phone || '').replace(/[\s\+\-\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '255' + cleaned.substring(1);
  }
  return cleaned;
}

export function phoneToAuthEmail(phone: string): string {
  const norm = normalizePhoneNumber(phone);
  return `${norm}@chidyprime.com`;
}
