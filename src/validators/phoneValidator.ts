

const phoneValidators: Record<string, RegExp> = {
  // Vietnam: local mobile numbers with leading 0 + prefix: 03x, 05x, 07x, 08x, 09x (10 digits)
  '+84': /^0(?:3|5|7|8|9)\d{8}$/,
  '+1': /^\d{10}$/,
  '+81': /^0?\d{9,10}$/,
  '+82': /^0?\d{9,10}$/,
  '+86': /^\d{11}$/,
  '+66': /^0?\d{8,9}$/,
  '+855': /^0?\d{8,9}$/,
  '+886': /^0?\d{8,9}$/,
};

/**
 * Validate a phone (local number) by country code
 * - Strips non-digits as safety
 * - Uses basic per-country regex where available
 * - Falls back to a general length check when country is unknown
 */
export function validatePhoneByCountry(phone: string, countryCode: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/\D/g, '');

  const validator = phoneValidators[countryCode];
  if (validator) return validator.test(cleaned);

  return /^\d{6,15}$/.test(cleaned);
}

/**
 * Normalize Vietnamese phone number to international format (+84)
 * - Converts "0923232323" to "+84923232323"
 * - Handles partial searches like "0923" to "+84923"
 * - Already normalized numbers remain unchanged
 * - Non-Vietnamese numbers remain unchanged
 */
export function normalizeVietnamesePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;

  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a Vietnamese mobile number (starts with 0)
  if (cleaned.startsWith('0') && cleaned.length >= 2) {
    // Remove leading 0 and add +84
    return '+84' + cleaned.substring(1);
  }

  // If it already starts with 84 and doesn't have +, add +
  if (cleaned.startsWith('84') && !phone.startsWith('+')) {
    return '+' + cleaned;
  }

  // Return original if not a Vietnamese number
  return phone;
}
