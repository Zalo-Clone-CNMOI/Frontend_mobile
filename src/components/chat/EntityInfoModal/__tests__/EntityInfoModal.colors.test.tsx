import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EntityInfoModal } from '../index';
import { ENTITY_COLORS } from '@/src/constants/entityColors';
import type { DetectedEntity } from '@/src/store/useEntityDetectionStore';

jest.mock('@/src/theme/themeContext', () => ({
  useTheme: () => ({
    colors: { card: '#fff', background: '#eee', text: '#000', icon: '#888', muted: '#888', error: '#ef4444' },
  }),
}));

// EntityInfoModal fetches on open (Issue #2); stub the service so this color
// test never hits the real network/auth chain. Never-resolving = stays loading.
jest.mock('@/src/services/ai/entityInfoApi', () => ({
  getEntityInfo: jest.fn(() => new Promise(() => {})),
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

const makeEntity = (type: DetectedEntity['type']): DetectedEntity => ({
  text: 'Sample',
  type,
  start_index: 0,
  end_index: 6,
  confidence: 0.9,
});

// type -> the lucide icon the modal renders for it (mocked to print its color).
const CASES: [DetectedEntity['type'], string][] = [
  ['tool', 'Lightbulb'],
  ['company', 'Building2'],
  ['person', 'User'],
  ['concept', 'Lightbulb'],
  ['location', 'MapPin'],
  ['product', 'ShoppingBag'],
  ['other', 'HelpCircle'],
];

describe('EntityInfoModal — shared entity colors (Issue #14)', () => {
  // Every type must take its color from the shared ENTITY_COLORS — e.g. person
  // is now #007AFF, NOT the removed inline #f59e0b.
  it.each(CASES)('colors the %s icon from the shared ENTITY_COLORS', (type, iconName) => {
    render(<EntityInfoModal visible entity={makeEntity(type)} onClose={jest.fn()} />);
    expect(screen.getByText(`${iconName}:${ENTITY_COLORS[type]}`)).toBeTruthy();
  });
});
