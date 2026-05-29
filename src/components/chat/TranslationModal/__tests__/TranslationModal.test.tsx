import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TranslationModal } from '../index';
import { useAITranslationStore } from '@/src/store/useAITranslationStore';
import { translationService } from '@/src/services/ai/TranslationService';
import type { ChatMessage } from '@/src/types/chat';

// t() returns the provided defaultValue so assertions read the human strings.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

// Avoid the ThemeProvider requirement — supply a minimal palette.
jest.mock('@/src/theme/themeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: '#000',
      muted: '#888',
      border: '#ccc',
      card: '#eee',
      primary: '#0068FF',
      error: '#ef4444',
    },
  }),
}));

// Icons render as no-ops (no react-native-svg in the test renderer).
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Check: () => null,
  ChevronDown: () => null,
  Languages: () => null,
}));

// The service is mocked; the real store drives loading/error/result render paths.
// jest.mock is hoisted above imports, so the mock fns are created INSIDE the
// factory and grabbed by reference after import (a captured outer const would
// still be undefined when the factory runs at import time).
jest.mock('@/src/services/ai/TranslationService', () => ({
  translationService: {
    requestTranslation: jest.fn(),
    getCachedTranslation: jest.fn(() => null),
  },
}));

const mockRequestTranslation = translationService.requestTranslation as jest.Mock;
const mockGetCached = translationService.getCachedTranslation as jest.Mock;

// ChatMessage has many fields the modal never reads; a minimal fixture is enough.
const message = { id: 'm1', conversationId: 'c1', text: 'Hello' } as unknown as ChatMessage;

const resetStore = () =>
  useAITranslationStore.setState({
    cache: new Map(),
    loadingByMessage: new Map(),
    errorByMessage: new Map(),
  });

describe('TranslationModal (Issue #3)', () => {
  beforeEach(() => {
    resetStore();
    mockRequestTranslation.mockReset();
    mockGetCached.mockReset().mockReturnValue(null);
  });

  it('auto-requests a translation once on open when nothing is cached', () => {
    render(<TranslationModal visible message={message} onClose={jest.fn()} />);
    expect(mockRequestTranslation).toHaveBeenCalledTimes(1);
    expect(mockRequestTranslation).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'm1', targetLanguage: 'vi' })
    );
  });

  it('shows the loading indicator while the store reports loading', () => {
    useAITranslationStore.getState().setLoading('m1', 'vi', true);
    render(<TranslationModal visible message={message} onClose={jest.fn()} />);

    expect(screen.getByText('Đang dịch...')).toBeTruthy();
    // Already loading → no duplicate auto-request.
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });

  it('shows an error + retry instead of an infinite spinner, and retry re-requests', () => {
    useAITranslationStore.getState().setError('m1', 'vi', 'Dịch quá thời gian chờ. Vui lòng thử lại.');
    render(<TranslationModal visible message={message} onClose={jest.fn()} />);

    expect(screen.getByText('Dịch quá thời gian chờ. Vui lòng thử lại.')).toBeTruthy();
    expect(screen.queryByText('Đang dịch...')).toBeNull();
    // An existing error must NOT auto-retry on mount.
    expect(mockRequestTranslation).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Thử lại'));
    expect(mockRequestTranslation).toHaveBeenCalledTimes(1);
    expect(mockRequestTranslation).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'm1', targetLanguage: 'vi' })
    );
  });

  it('renders the translated result when the store holds a matching translation', () => {
    useAITranslationStore.getState().setTranslation('m1', 'vi', 'Hello', 'Xin chào');
    render(<TranslationModal visible message={message} onClose={jest.fn()} />);

    expect(screen.getByText('Xin chào')).toBeTruthy();
    expect(screen.queryByText('Đang dịch...')).toBeNull();
    // A cached, matching result must not trigger a new request.
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });
});
