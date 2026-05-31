import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SummaryModal } from '../index';
import { useAISummaryStore } from '@/src/store/useAISummaryStore';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k,
  }),
}));

jest.mock('@/src/theme/themeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#fff',
      background: '#eee',
      text: '#000',
      icon: '#555',
      primary: '#007AFF',
      border: '#ccc',
    },
  }),
}));

jest.mock('lucide-react-native', () => ({
  X: () => null,
  Copy: () => null,
  Check: () => null,
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

const CONV = 'c1';
const store = () => useAISummaryStore.getState();

function resetStore() {
  store().invalidate(CONV);
  store().setError(CONV, null);
  store().setLoading(CONV, false);
}

describe('SummaryModal', () => {
  beforeEach(resetStore);

  it('shows the loading state while generating', () => {
    store().setLoading(CONV, true);
    render(<SummaryModal visible conversationId={CONV} onClose={() => {}} />);
    expect(screen.getByText('Đang tạo tóm tắt...')).toBeTruthy();
  });

  it('shows the summary text when present', () => {
    store().setSummary(CONV, 'Nội dung tóm tắt', 3);
    render(<SummaryModal visible conversationId={CONV} onClose={() => {}} />);
    expect(screen.getByText('Nội dung tóm tắt')).toBeTruthy();
  });

  it('shows the no-unread state when the cached summary is empty', () => {
    store().setSummary(CONV, '', 0);
    render(<SummaryModal visible conversationId={CONV} onClose={() => {}} />);
    expect(screen.getByText('Bạn đã đọc hết tin nhắn rồi 🎉')).toBeTruthy();
  });

  it('shows an error message when set', () => {
    store().setError(CONV, 'Lỗi mạng');
    render(<SummaryModal visible conversationId={CONV} onClose={() => {}} />);
    expect(screen.getByText('Lỗi mạng')).toBeTruthy();
  });
});
