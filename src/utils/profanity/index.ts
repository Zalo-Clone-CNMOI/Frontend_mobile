/**
 * Client-side profanity guard.
 *
 * ⚠️ UX GUARD ONLY — NOT a security or authoritative moderation layer.
 * It catches obvious/accidental profanity instantly on the sender's device so
 * a slip isn't broadcast while the (async, ~1-2s) server-side AI moderation
 * runs. It is trivially bypassable by a custom client and is intentionally
 * conservative (favours misses over false positives). The server-side AI
 * moderation is the real enforcement — do NOT rely on this for trust decisions.
 *
 * NOTE on Vietnamese: we deliberately DO NOT strip tone/vowel diacritics. They
 * are meaningful — stripping them collides vulgar words with everyday ones
 * ("các"≈"cặc", "buổi"≈"buồi", "lon"≈"lồn", "đủ"≈"đụ"), which would block
 * legitimate messages. We fold only case, common leetspeak, and repeated runs.
 */
import { PROFANITY_WORDS } from './words';

/**
 * Fold text to a comparable form: lowercase, undo common leetspeak digit/symbol
 * substitutions, collapse 3+ character runs, and reduce non-letters to spaces.
 * Vietnamese letters (and their diacritics) are preserved. Applied identically
 * to the word list and the input.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/(.)\1{2,}/gu, '$1') // collapse runs of 3+ identical chars (loooo → lo)
    .replace(/[^\p{L}\s]/gu, ' ') // drop punctuation/symbols, keep Vietnamese letters
    .replace(/\s+/g, ' ')
    .trim();
}

// Pre-normalize the list once. Single-token words are matched as whole tokens
// (avoids false positives like "lon" inside a longer word); multi-word phrases
// are matched as substrings.
const NORMALIZED = PROFANITY_WORDS.map(normalize).filter(Boolean);
const PHRASES = NORMALIZED.filter((w) => w.includes(' '));
const WORDS = new Set(NORMALIZED.filter((w) => !w.includes(' ')));

/**
 * True if `text` contains a blocked word (as a whole token) or phrase
 * (as a substring). Pure, empty-safe, never throws.
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = normalize(text);
  if (!normalized) return false;

  for (const phrase of PHRASES) {
    if (normalized.includes(phrase)) return true;
  }
  const tokens = normalized.split(' ');
  for (const token of tokens) {
    if (WORDS.has(token)) return true;
  }
  return false;
}
