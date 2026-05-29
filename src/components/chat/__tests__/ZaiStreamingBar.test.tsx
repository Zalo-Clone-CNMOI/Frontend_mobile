import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZaiStreamingBar } from '../ZaiStreamingBar';

// Isolate from the animated TypingIndicator and the lucide SVG icon.
jest.mock('../TypingIndicator', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports; require is the standard pattern here
  const { Text } = require('react-native');
  return { TypingIndicator: ({ text }: { text: string }) => <Text>{text}</Text> };
});
jest.mock('lucide-react-native', () => ({ Square: () => null }));

describe('ZaiStreamingBar (Issue #4)', () => {
  it('shows the typing indicator before any text arrives', () => {
    render(<ZaiStreamingBar text={null} onStop={jest.fn()} />);
    expect(screen.getByText('Zai đang trả lời...')).toBeTruthy();
  });

  it('shows the typing indicator for empty text', () => {
    render(<ZaiStreamingBar text="" onStop={jest.fn()} />);
    expect(screen.getByText('Zai đang trả lời...')).toBeTruthy();
  });

  it('renders the accumulating streamed text once chunks arrive', () => {
    render(<ZaiStreamingBar text="Hello world" onStop={jest.fn()} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
    expect(screen.queryByText('Zai đang trả lời...')).toBeNull();
  });

  it('calls onStop when the stop button is pressed', () => {
    const onStop = jest.fn();
    render(<ZaiStreamingBar text="partial answer" onStop={onStop} />);
    fireEvent.press(screen.getByLabelText('Dừng Zai'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
