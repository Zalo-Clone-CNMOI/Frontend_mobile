

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
