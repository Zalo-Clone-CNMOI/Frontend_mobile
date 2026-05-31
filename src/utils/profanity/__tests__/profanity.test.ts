import { containsProfanity } from '../index';

describe('containsProfanity (client-side UX guard)', () => {
  it('returns false for empty input', () => {
    expect(containsProfanity('')).toBe(false);
  });

  it('passes clean Vietnamese + English text', () => {
    expect(containsProfanity('xin chào, hôm nay trời đẹp quá')).toBe(false);
    expect(containsProfanity('hello there, nice to meet you')).toBe(false);
  });

  it('does NOT false-positive on everyday Vietnamese words near vulgar ones', () => {
    // Diacritics are kept, so these everyday words must NOT be flagged.
    expect(containsProfanity('các bạn ơi')).toBe(false); // các vs cặc
    expect(containsProfanity('buổi sáng vui vẻ')).toBe(false); // buổi vs buồi
    expect(containsProfanity('cho mình một lon bia')).toBe(false); // lon vs lồn
    expect(containsProfanity('đủ rồi nha')).toBe(false); // đủ vs đụ
  });

  it('flags obvious Vietnamese profanity (words + phrases)', () => {
    expect(containsProfanity('địt mẹ mày')).toBe(true);
    expect(containsProfanity('cái lồn')).toBe(true);
    expect(containsProfanity('đm thằng kia')).toBe(true);
    expect(containsProfanity('vcl luôn')).toBe(true);
  });

  it('flags obvious English profanity', () => {
    expect(containsProfanity('what the fuck')).toBe(true);
    expect(containsProfanity('you are a bitch')).toBe(true);
  });

  it('is case- and repeat-insensitive', () => {
    expect(containsProfanity('FUCK you')).toBe(true);
    expect(containsProfanity('shiiiit')).toBe(true); // collapse → shit
    expect(containsProfanity('lồnnnn')).toBe(true);
  });

  it('catches simple English leetspeak', () => {
    expect(containsProfanity('sh1t')).toBe(true); // 1→i
    expect(containsProfanity('b1tch')).toBe(true);
  });
});
