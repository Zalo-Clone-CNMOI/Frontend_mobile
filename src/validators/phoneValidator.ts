

const phoneValidators: Record<string, RegExp> = {
  // Vietnam: local mobile numbers with leading 0 + prefix: 03x, 05x, 07x, 08x, 09x (10 digits)
  '+84': /^0(?:3|5|7|8|9)\d{8}$/, // e.g. 0912345678
  // US: 10 digits (area code + local)
  '+1': /^\d{10}$/, // e.g. 4155551234
  // Japan/Korea: allow optional leading zero and typical lengths (basic)
  '+81': /^0?\d{9,10}$/, // basic length check (10-11 digits with optional leading 0)
  '+82': /^0?\d{9,10}$/, // Korea
  // China: 11 digits typical for mobile
  '+86': /^\d{11}$/,
  // Thailand: allow 9-10 digits with optional leading 0
  '+66': /^0?\d{8,9}$/,
  // Cambodia: 8-9 digits
  '+855': /^0?\d{8,9}$/,
  // Taiwan: 9 digits typically (allow optional leading 0)
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

  // Generic fallback: local number between 6 and 15 digits
  return /^\d{6,15}$/.test(cleaned);
}
