import { useState, useCallback, useEffect } from 'react';
import { usePollStore } from '@/src/store/usePollStore';
import type { PollDetail } from '@/src/types/dto/PollDTO';

interface UsePollDetailOptions {
  conversationId: string;
  pollId: string;
  visible: boolean;
}

interface UsePollDetailReturn {
  poll: PollDetail | null;
  isLoading: boolean;
  error: Error | null;
  selectedOptions: string[];
  hasVoted: boolean;
  isAddingOption: boolean;
  newOptionLabel: string;
  isClosed: boolean;
  loadPollDetail: () => Promise<void>;
  toggleOption: (optionId: string) => void;
  castVote: () => Promise<void>;
  addOption: () => Promise<void>;
  setIsAddingOption: (value: boolean) => void;
  setNewOptionLabel: (value: string) => void;
}

export const usePollDetail = ({
  conversationId,
  pollId,
  visible,
}: UsePollDetailOptions): UsePollDetailReturn => {
  const pollStore = usePollStore();

  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const isClosed = poll?.status === 'closed';

  const loadPollDetail = useCallback(async () => {
    if (!pollId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const detail = await pollStore.fetchPollDetail(conversationId, pollId, true);
      if (detail) {
        setPoll(detail);
        setSelectedOptions(detail.my_vote || []);
        setHasVoted((detail.my_vote?.length || 0) > 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load poll'));
      console.error('Failed to load poll detail:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, pollId, pollStore]);

  useEffect(() => {
    if (visible && pollId) {
      loadPollDetail();
    }
  }, [visible, pollId, loadPollDetail]);

  const toggleOption = useCallback((optionId: string) => {
    if (hasVoted || isClosed) return;

    const isMultiple = poll?.allow_multiple ?? false;
    if (isMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  }, [hasVoted, isClosed, poll?.allow_multiple]);

  const castVote = useCallback(async () => {
    if (selectedOptions.length === 0) return;
    try {
      await pollStore.castVote(conversationId, pollId, selectedOptions);
      setHasVoted(true);
      await loadPollDetail();
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw error;
    }
  }, [selectedOptions, conversationId, pollId, pollStore, loadPollDetail]);

  const addOption = useCallback(async () => {
    const label = newOptionLabel.trim();
    if (!label || !poll) return;
    
    setIsAddingOption(true);
    try {
      await pollStore.addOption(conversationId, pollId, label);
      setNewOptionLabel('');
      await loadPollDetail();
    } catch (err) {
      console.error('Failed to add option:', err);
      throw err;
    } finally {
      setIsAddingOption(false);
    }
  }, [newOptionLabel, poll, conversationId, pollId, pollStore, loadPollDetail]);

  return {
    poll,
    isLoading,
    error,
    selectedOptions,
    hasVoted,
    isAddingOption,
    newOptionLabel,
    isClosed,
    loadPollDetail,
    toggleOption,
    castVote,
    addOption,
    setIsAddingOption,
    setNewOptionLabel,
  };
};
