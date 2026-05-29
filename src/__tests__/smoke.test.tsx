import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ENTITY_COLORS } from '@/src/constants/entityColors';

// Smoke test proving the jest-expo + RNTL harness works end to end:
// TypeScript transform, the `@/` path alias, and component rendering.
describe('test harness smoke test', () => {
  it('runs TypeScript and resolves the @/ path alias', () => {
    expect(Object.keys(ENTITY_COLORS).length).toBeGreaterThan(0);
  });

  it('renders a component via React Native Testing Library', () => {
    render(<Text>hello-zai</Text>);
    expect(screen.getByText('hello-zai')).toBeTruthy();
  });
});
