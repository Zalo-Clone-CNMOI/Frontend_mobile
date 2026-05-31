import { useEntityDetectionStore, DetectedEntity } from '../useEntityDetectionStore';

const store = () => useEntityDetectionStore.getState();
const MID = 'msg-1';
const entity: DetectedEntity = {
  text: 'FBI',
  type: 'company',
  start_index: 0,
  end_index: 3,
  confidence: 0.9,
};

describe('useEntityDetectionStore — pending lifecycle', () => {
  beforeEach(() => store().clearAll());
  afterEach(() => {
    store().clearAll();
    jest.useRealTimers();
  });

  it('markPending marks a message as pending', () => {
    store().markPending(MID);
    expect(store().isPending(MID)).toBe(true);
  });

  it('ignores an empty messageId', () => {
    store().markPending('');
    expect(store().pendingByMessage.size).toBe(0);
  });

  it('setEntities clears pending even when the result is empty', () => {
    store().markPending(MID);
    store().setEntities(MID, []);
    expect(store().isPending(MID)).toBe(false);
    expect(store().getEntities(MID)).toEqual([]);
  });

  it('setEntities with results clears pending and stores them', () => {
    store().markPending(MID);
    store().setEntities(MID, [entity]);
    expect(store().isPending(MID)).toBe(false);
    expect(store().getEntities(MID)).toEqual([entity]);
  });

  it('does not mark pending when entities already arrived (race)', () => {
    store().setEntities(MID, [entity]);
    store().markPending(MID);
    expect(store().isPending(MID)).toBe(false);
  });

  it('auto-clears pending after the timeout (no entities ever arrive)', () => {
    jest.useFakeTimers();
    store().markPending(MID);
    expect(store().isPending(MID)).toBe(true);

    jest.advanceTimersByTime(10_001);
    expect(store().isPending(MID)).toBe(false);
  });

  it('clearAll resets entities, pending, and timers', () => {
    jest.useFakeTimers();
    store().markPending(MID);
    store().setEntities('other', [entity]);

    store().clearAll();
    expect(store().pendingByMessage.size).toBe(0);
    expect(store().entitiesByMessage.size).toBe(0);

    // The pending timer must have been cleared — advancing time does nothing.
    jest.advanceTimersByTime(20_000);
    expect(store().pendingByMessage.size).toBe(0);
  });
});
