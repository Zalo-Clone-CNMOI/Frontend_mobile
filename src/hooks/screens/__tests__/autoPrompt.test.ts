import { pickAutoPromptToSend } from '../autoPrompt';

describe('pickAutoPromptToSend', () => {
  it('returns the prompt when present and not yet sent', () => {
    expect(pickAutoPromptToSend('catch-up summary', null)).toBe('catch-up summary');
  });

  it('trims surrounding whitespace', () => {
    expect(pickAutoPromptToSend('  hello  ', null)).toBe('hello');
  });

  it('returns null when there is no prompt', () => {
    expect(pickAutoPromptToSend(undefined, null)).toBeNull();
    expect(pickAutoPromptToSend('', null)).toBeNull();
    expect(pickAutoPromptToSend('   ', null)).toBeNull();
    expect(pickAutoPromptToSend('\n\n\n', null)).toBeNull();
  });

  it('returns null when the same prompt was already sent (single-send guard)', () => {
    expect(pickAutoPromptToSend('catch-up summary', 'catch-up summary')).toBeNull();
  });

  it('returns the new prompt when a different one was previously sent', () => {
    expect(pickAutoPromptToSend('new prompt', 'old prompt')).toBe('new prompt');
  });
});
