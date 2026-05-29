import { getEntityInfo } from '../entityInfoApi';
import { apiCallWithRefresh } from '@/src/services/authService';

jest.mock('@/src/services/authService', () => ({
  apiCallWithRefresh: jest.fn(),
}));

const mockApiCall = apiCallWithRefresh as jest.Mock;

const SAMPLE = {
  entity_text: 'React',
  entity_type: 'tool',
  title: 'React',
  summary: 'A JavaScript library',
  details: 'Built by Meta',
  related_entities: ['Vue', 'Angular'],
  provider: 'openai',
  tokens_used: 100,
  processed_at: 1700000000000,
};

const okResponse = (body: unknown) => ({
  ok: true,
  text: async () => JSON.stringify(body),
});

describe('getEntityInfo (Issue #2)', () => {
  beforeEach(() => mockApiCall.mockReset());

  it('calls GET /entity-info with encoded text/type/lang and unwraps the BFF envelope', async () => {
    mockApiCall.mockResolvedValue(okResponse({ success: true, data: SAMPLE }));

    const result = await getEntityInfo('React', 'tool', 'vi');

    expect(result).toEqual(SAMPLE);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toContain('/entity-info?text=React&type=tool&lang=vi');
    expect(opts).toMatchObject({ method: 'GET' });
  });

  it('returns a raw (un-enveloped) response as-is', async () => {
    mockApiCall.mockResolvedValue(okResponse(SAMPLE));
    const result = await getEntityInfo('React', 'tool', 'vi');
    expect(result).toEqual(SAMPLE);
  });

  it('defaults lang to vi', async () => {
    mockApiCall.mockResolvedValue(okResponse({ success: true, data: SAMPLE }));
    await getEntityInfo('React', 'tool');
    expect(mockApiCall.mock.calls[0][0]).toContain('lang=vi');
  });

  it('URL-encodes special characters in the text', async () => {
    mockApiCall.mockResolvedValue(okResponse({ success: true, data: SAMPLE }));
    await getEntityInfo('C# & .NET', 'tool', 'en');
    expect(mockApiCall.mock.calls[0][0]).toContain('text=C%23%20%26%20.NET');
  });

  it('truncates text to 200 chars before sending', async () => {
    mockApiCall.mockResolvedValue(okResponse({ success: true, data: SAMPLE }));
    await getEntityInfo('a'.repeat(250), 'concept', 'vi');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain(`text=${'a'.repeat(200)}&`);
    expect(url).not.toContain('a'.repeat(201));
  });

  it('throws a human-readable error WITHOUT calling the API for empty text', async () => {
    await expect(getEntityInfo('   ', 'tool', 'vi')).rejects.toThrow(
      'Không có nội dung để tra cứu.'
    );
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('surfaces the server message on a non-ok response', async () => {
    mockApiCall.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ message: 'rate limited' }),
    });
    await expect(getEntityInfo('React', 'tool', 'vi')).rejects.toThrow('rate limited');
  });

  it('falls back to a generic VI error when the server gives no message', async () => {
    mockApiCall.mockResolvedValue({ ok: false, text: async () => '' });
    await expect(getEntityInfo('React', 'tool', 'vi')).rejects.toThrow(
      'Không thể tải thông tin. Vui lòng thử lại.'
    );
  });
});
