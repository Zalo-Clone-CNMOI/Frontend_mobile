import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EntityInfoModal } from '../index';
import { ENTITY_COLORS } from '@/src/constants/entityColors';
import type { DetectedEntity } from '@/src/store/useEntityDetectionStore';

jest.mock('@/src/theme/themeContext', () => ({
  useTheme: () => ({
    colors: { card: '#fff', background: '#eee', text: '#000', icon: '#888' },
  }),
}));

// Each icon renders its received `color` prop so the test can assert which
// color the modal passed in (proves it comes from the shared ENTITY_COLORS).
jest.mock('lucide-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports; require is the standard pattern
  const { Text } = require('react-native');
  const make = (name: string) => {
    const Icon = ({ color }: { color?: string }) => <Text>{`${name}:${color ?? ''}`}</Text>;
    Icon.displayName = name;
    return Icon;
  };
  return {
    X: make('X'),
    Globe: make('Globe'),
    Building2: make('Building2'),
    User: make('User'),
    Lightbulb: make('Lightbulb'),
    MapPin: make('MapPin'),
    ShoppingBag: make('ShoppingBag'),
    HelpCircle: make('HelpCircle'),
  };
});

const personEntity: DetectedEntity = {
  text: 'Alice',
  type: 'person',
  start_index: 0,
  end_index: 5,
  confidence: 0.9,
};

describe('EntityInfoModal — shared entity colors (Issue #14)', () => {
  it('colors the person icon from the shared ENTITY_COLORS, not a local map', () => {
    render(<EntityInfoModal visible entity={personEntity} onClose={jest.fn()} />);
    // person icon is `User`; its color must equal the shared constant (#007AFF),
    // NOT the old inline value (#f59e0b).
    expect(screen.getByText(`User:${ENTITY_COLORS.person}`)).toBeTruthy();
  });

  it('falls back to the shared "other" color for an unknown-ish type', () => {
    const other: DetectedEntity = { ...personEntity, type: 'other' };
    render(<EntityInfoModal visible entity={other} onClose={jest.fn()} />);
    expect(screen.getByText(`HelpCircle:${ENTITY_COLORS.other}`)).toBeTruthy();
  });
});
