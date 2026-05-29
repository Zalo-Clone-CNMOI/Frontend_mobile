import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EntityInfoModal } from '../index';
import { entityInfoKey, useEntityInfoStore } from '@/src/store/useEntityInfoStore';
import { getEntityInfo } from '@/src/services/ai/entityInfoApi';
import type { EntityInfoResponse } from '@/src/services/ai/entityInfo.types';
import type { DetectedEntity } from '@/src/store/useEntityDetectionStore';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k,
    i18n: { language: 'vi' },
  }),
}));

jest.mock('@/src/theme/themeContext', () => ({
  useTheme: () => ({
    colors: { card: '#fff', background: '#eee', text: '#000', icon: '#555', muted: '#888', error: '#ef4444' },
  }),
}));

jest.mock('lucide-react-native', () => ({
  X: () => null,
  Building2: () => null,
  User: () => null,
  Lightbulb: () => null,
  MapPin: () => null,
  ShoppingBag: () => null,
  HelpCircle: () => null,
}));

jest.mock('@/src/services/ai/entityInfoApi', () => ({
  getEntityInfo: jest.fn(),
}));

const mockGetEntityInfo = getEntityInfo as jest.Mock;

const entity: DetectedEntity = {
  text: 'React',
  type: 'tool',
  start_index: 0,
  end_index: 5,
  confidence: 0.95,
};

const INFO: EntityInfoResponse = {
  entity_text: 'React',
  entity_type: 'tool',
  title: 'React (thư viện)',
  summary: 'Một thư viện JavaScript',
  details: 'Được phát triển bởi Meta',
  related_entities: ['Vue', 'Angular'],
  provider: 'openai',
  tokens_used: 100,
  processed_at: 1700000000000,
};

const key = entityInfoKey('tool', 'React', 'vi');

const resetStore = () =>
  useEntityInfoStore.setState({
    cache: new Map(),
    loadingByKey: new Map(),
    errorByKey: new Map(),
  });

describe('EntityInfoModal — info panel (Issue #2)', () => {
  beforeEach(() => {
    resetStore();
    mockGetEntityInfo.mockReset();
  });

  it('fetches once on open and renders the LLM panel (title/summary/details/related)', async () => {
    mockGetEntityInfo.mockResolvedValue(INFO);
    render(<EntityInfoModal visible entity={entity} onClose={jest.fn()} />);

    expect(await screen.findByText('React (thư viện)')).toBeTruthy();
    expect(screen.getByText('Một thư viện JavaScript')).toBeTruthy();
    expect(screen.getByText('Được phát triển bởi Meta')).toBeTruthy();
    expect(screen.getByText('Vue')).toBeTruthy();
    expect(screen.getByText('Angular')).toBeTruthy();

    expect(mockGetEntityInfo).toHaveBeenCalledTimes(1);
    expect(mockGetEntityInfo).toHaveBeenCalledWith('React', 'tool', 'vi');
  });

  it('shows the loading indicator while the request is in flight', async () => {
    mockGetEntityInfo.mockReturnValue(new Promise(() => {})); // never resolves
    render(<EntityInfoModal visible entity={entity} onClose={jest.fn()} />);
    expect(await screen.findByText('Đang tải thông tin...')).toBeTruthy();
  });

  it('shows an error + retry on failure, and retry refetches', async () => {
    mockGetEntityInfo.mockRejectedValue(new Error('Không thể tải thông tin. Vui lòng thử lại.'));
    render(<EntityInfoModal visible entity={entity} onClose={jest.fn()} />);

    expect(await screen.findByText('Không thể tải thông tin. Vui lòng thử lại.')).toBeTruthy();
    expect(mockGetEntityInfo).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Thử lại'));
    expect(mockGetEntityInfo).toHaveBeenCalledTimes(2);
  });

  it('renders a fresh cache hit without refetching', async () => {
    useEntityInfoStore.getState().set(key, INFO);
    render(<EntityInfoModal visible entity={entity} onClose={jest.fn()} />);

    expect(await screen.findByText('React (thư viện)')).toBeTruthy();
    expect(mockGetEntityInfo).not.toHaveBeenCalled();
  });
});
