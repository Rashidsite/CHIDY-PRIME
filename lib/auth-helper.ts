import { formatTzPhone } from './payment-gateway';

/**
 * Phone Auth Helper Utilities for CHIDYPRIME
 */
export function normalizePhoneNumber(phone: string): string {
  return formatTzPhone(phone);
}

export function phoneToAuthEmail(phone: string): string {
  const norm = formatTzPhone(phone);
  return `${norm}@chidyprime.com`;
}
