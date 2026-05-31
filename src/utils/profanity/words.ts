/**
 * Curated profanity word/phrase list for the CLIENT-SIDE UX guard.
 *
 * Maintainable by non-engineers: add/remove entries here without touching the
 * matching logic in `./index.ts`. Matching is case-, leetspeak-, and
 * repeat-insensitive (see normalize() in ./index.ts) but Vietnamese diacritics
 * are KEPT (stripping them blocks everyday words), so write entries WITH their
 * proper Vietnamese marks — e.g. "lồn" (it also catches "L0N", "lồnnnn").
 *
 * Keep entries to clearly offensive terms: a false positive BLOCKS a legitimate
 * message, which is worse than a miss (the server-side AI moderation is the
 * real backstop).
 */
export const PROFANITY_WORDS: string[] = [
  // Vietnamese
  'đụ',
  'địt',
  'đĩ',
  'lồn',
  'cặc',
  'buồi',
  'cứt',
  'đéo',
  'đm',
  'đmm',
  'đcm',
  'đkm',
  'vcl',
  'vl',
  'vãi lồn',
  'vãi cả lồn',
  'đụ má',
  'đụ mẹ',
  'địt mẹ',
  // English
  'fuck',
  'fucker',
  'motherfucker',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'cunt',
  'dick',
  'pussy',
  'whore',
  'slut',
];
