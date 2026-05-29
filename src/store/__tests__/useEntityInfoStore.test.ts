import {
  ENTITY_INFO_TTL,
  entityInfoKey,
  useEntityInfoStore,
} from '../useEntityInfoStore';
import type { EntityInfoResponse } from '@/src/services/ai/entityInfo.types';

const SAMPLE: EntityInfoResponse = {
  entity_text: 'React',
  entity_type: 'tool',
  title: 'React',
  summary: 'A JavaScript library',
  details: 'Built by Meta',
  related_entities: ['Vue'],
  provider: 'openai',
  tokens_used: 100,
  processed_at: 1700000000000,
};

const reset = () =>
  useEntityInfoStore.setState({
    cache: new Map(),
    loadingByKey: new Map(),
    errorByKey: new Map(),
  });

describe('useEntityInfoStore (Issue #2)', () => {
  beforeEach(reset);

  it('builds a stable cache key from type:text:lang', () => {
    expect(entityInfoKey('tool', 'React', 'vi')).toBe('tool:React:vi');
  });

  it('set then get returns the cached data via NEW Map references', () => {
    const before = useEntityInfoStore.getState().cache;
    useEntityInfoStore.getState().set('k1', SAMPLE);
    const after = useEntityInfoStore.getState().cache;

    expect(after).not.toBe(before); // immutable
    expect(useEntityInfoStore.getState().get('k1')).toEqual(SAMPLE);
  });

  it('get returns null for an unknown key', () => {
    expect(useEntityInfoStore.getState().get('missing')).toBeNull();
  });

  it('setLoading / isLoading and setError / getError work and are immutable', () => {
    const beforeLoading = useEntityInfoStore.getState().loadingByKey;
    useEntityInfoStore.getState().setLoading('k1', true);
    expect(useEntityInfoStore.getState().loadingByKey).not.toBe(beforeLoading);
    expect(useEntityInfoStore.getState().isLoading('k1')).toBe(true);

    useEntityInfoStore.getState().setError('k1', 'boom');
    expect(useEntityInfoStore.getState().getError('k1')).toBe('boom');

    useEntityInfoStore.getState().setLoading('k1', false);
    useEntityInfoStore.getState().setError('k1', null);
    expect(useEntityInfoStore.getState().isLoading('k1')).toBe(false);
    expect(useEntityInfoStore.getState().getError('k1')).toBeNull();
  });

  it('set clears in-flight loading + error for the key', () => {
    const store = useEntityInfoStore.getState();
    store.setLoading('k1', true);
    store.setError('k1', 'stale');
    store.set('k1', SAMPLE);

    expect(useEntityInfoStore.getState().isLoading('k1')).toBe(false);
    expect(useEntityInfoStore.getState().getError('k1')).toBeNull();
  });

  describe('TTL (7 days)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('returns null once the entry is older than the TTL', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      useEntityInfoStore.getState().set('k1', SAMPLE);
      expect(useEntityInfoStore.getState().get('k1')).toEqual(SAMPLE);

      jest.advanceTimersByTime(ENTITY_INFO_TTL + 1);
      expect(useEntityInfoStore.getState().get('k1')).toBeNull();
    });

    it('still returns the entry just before the TTL elapses', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      useEntityInfoStore.getState().set('k1', SAMPLE);
      jest.advanceTimersByTime(ENTITY_INFO_TTL - 1000);
      expect(useEntityInfoStore.getState().get('k1')).toEqual(SAMPLE);
    });
  });
});
