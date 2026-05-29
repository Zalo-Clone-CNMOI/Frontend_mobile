import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SmartReplyChips } from '../SmartReplyChips';
import { useAISmartReplyStore } from '@/src/store/useAISmartReplyStore';

jest.mock('@/src/theme/themeContext', () => ({
  useTheme: () => ({ colors: { border: '#ccc', primary: '#0068FF', icon: '#888' } }),
}));
jest.mock('lucide-react-native', () => ({ Sparkles: () => null }));

const reset = () =>
  useAISmartReplyStore.setState({
    suggestions: new Map(),
    loadingByConversation: new Map(),
    errorByConversation: new Map(),
  });

const baseProps = {
  conversationId: 'c1',
  userId: 'u1',
  onSelect: jest.fn(),
  onDismiss: jest.fn(),
};

describe('SmartReplyChips error UI (Issue #8)', () => {
  beforeEach(() => {
    reset();
    jest.clearAllMocks();
  });

  it('surfaces a human-readable notice (not silence) on error with no suggestions', () => {
    useAISmartReplyStore.getState().setError('c1', 'engine down');
    render(<SmartReplyChips {...baseProps} />);
    expect(screen.getByText('Không tạo được gợi ý')).toBeTruthy();
    // The notice is not a dismissal — onDismiss only fires when the user taps it.
    expect(baseProps.onDismiss).not.toHaveBeenCalled();
  });

  it('shows a retry button only when onRetry is provided, and invokes it', () => {
    useAISmartReplyStore.getState().setError('c1', 'engine down');
    const onRetry = jest.fn();
    render(<SmartReplyChips {...baseProps} onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Thử lại'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show a retry button when onRetry is omitted', () => {
    useAISmartReplyStore.getState().setError('c1', 'engine down');
    render(<SmartReplyChips {...baseProps} />);
    expect(screen.queryByText('Thử lại')).toBeNull();
  });

  it('shows suggestion chips (no error notice) when suggestions exist despite a stale error', () => {
    useAISmartReplyStore.getState().setError('c1', 'engine down');
    useAISmartReplyStore.getState().setSuggestions('c1', ['Hello', 'Hi there']);
    render(<SmartReplyChips {...baseProps} />);
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.queryByText('Không tạo được gợi ý')).toBeNull();
  });

  it('renders nothing when there is neither an error nor suggestions', () => {
    const { toJSON } = render(<SmartReplyChips {...baseProps} />);
    expect(toJSON()).toBeNull();
  });

  it('shows loading skeletons (no error notice) while loading', () => {
    useAISmartReplyStore.getState().setError('c1', 'engine down');
    useAISmartReplyStore.getState().setLoading('c1', true);
    render(<SmartReplyChips {...baseProps} />);
    expect(screen.queryByText('Không tạo được gợi ý')).toBeNull();
  });
});
