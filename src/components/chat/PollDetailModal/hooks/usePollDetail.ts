import { useState, useCallback, useEffect } from 'react';
import { usePollStore } from '@/src/store/usePollStore';
import { getUserProfile } from '@/src/services/usersApi';
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
  isSubmitting: boolean;
  isRetracting: boolean;
  newOptionLabel: string;
  isClosed: boolean;
  isExpired: boolean;
  isActive: boolean;
  creatorName: string;
  loadPollDetail: () => Promise<void>;
  toggleOption: (optionId: string) => void;
  castVote: () => Promise<void>;
  retractVote: () => Promise<void>;
  addOption: () => Promise<void>;
  removeOption: (optionId: string) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [creatorName, setCreatorName] = useState<string>('');

  const isClosed = poll?.status === 'closed';
  const isExpired = Boolean(poll?.expires_at && poll.expires_at < Date.now());
  const isActive = poll?.status === 'active' && !isExpired;

  const loadPollDetail = useCallback(async (skipVoteCheck = false) => {
    if (!pollId) return;

    // Check cache first for instant display
    const cachedPoll = pollStore.getPollById(pollId) as PollDetail | null;
    if (cachedPoll) {
      setPoll(cachedPoll);
      // Set vote state from cache so user sees their previous selection
      const myVote = cachedPoll.my_vote || [];
      setSelectedOptions(myVote);
      setHasVoted(myVote.length > 0);

      // Fetch creator name even with cache
      if (cachedPoll.creator_id && !creatorName) {
        try {
          const creator = await getUserProfile(cachedPoll.creator_id);
          setCreatorName(creator?.fullName || '');
        } catch (err) {
          console.error('Failed to fetch creator name from cache:', err);
        }
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const detail = await pollStore.fetchPollDetail(conversationId, pollId, true);
      if (detail) {
        setPoll(detail);
        // Pre-select options from API and set hasVoted state
        const myVote = detail.my_vote || [];
        setSelectedOptions(myVote);
        setHasVoted(myVote.length > 0);

        // Fetch creator name
        if (detail.creator_id) {
          try {
            const creator = await getUserProfile(detail.creator_id);
            setCreatorName(creator?.fullName || '');
          } catch (err) {
            console.error('Failed to fetch creator name:', err);
            setCreatorName('');
          }
        }
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
  }, [visible, pollId]); // Remove loadPollDetail from deps to prevent loop

  const toggleOption = useCallback((optionId: string) => {
    console.log('[toggleOption] isActive:', isActive, 'isClosed:', isClosed, 'isExpired:', isExpired, 'optionId:', optionId);
    if (!isActive) return;

    const isMultiple = poll?.allow_multiple ?? false;
    if (isMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      // Single choice: click again to deselect
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? [] : [optionId]
      );
    }
  }, [isActive, poll?.allow_multiple]);

  const castVote = useCallback(async () => {
    if (!poll) {
      throw new Error('Poll not loaded');
    }

    if (isClosed) {
      throw new Error('This poll is closed');
    }

    if (isExpired) {
      throw new Error('This poll has expired');
    }

    // If no options selected, retract vote
    if (selectedOptions.length === 0) {
      if (!hasVoted) {
        return; // Nothing to do if not voted and no options selected
      }
      try {
        await pollStore.retractVote(conversationId, pollId);
        setHasVoted(false);
        await loadPollDetail(true);
      } catch (error) {
        console.error('Failed to retract vote:', error);
        throw error;
      }
      return;
    }

    // Validate single choice
    if (!poll.allow_multiple && selectedOptions.length > 1) {
      throw new Error('This poll only allows single choice');
    }

    try {
      await pollStore.castVote(conversationId, pollId, selectedOptions);
      setHasVoted(true);
      await loadPollDetail(true); // Skip vote check to preserve local hasVoted state
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw error;
    }
  }, [selectedOptions, conversationId, pollId, pollStore, loadPollDetail, poll, isClosed, isExpired, hasVoted]);

  const retractVote = useCallback(async () => {
    if (!hasVoted) return;
    setIsRetracting(true);
    try {
      await pollStore.retractVote(conversationId, pollId);
      setHasVoted(false);
      setSelectedOptions([]);
      await loadPollDetail(true); // Skip vote check to preserve local hasVoted state
    } catch (error) {
      console.error('Failed to retract vote:', error);
      throw error;
    } finally {
      setIsRetracting(false);
    }
  }, [hasVoted, conversationId, pollId, pollStore, loadPollDetail]);

  const addOption = useCallback(async () => {
    const label = newOptionLabel.trim();
    if (!label || !poll) return;

    setIsSubmitting(true);
    try {
      await pollStore.addOption(conversationId, pollId, label);
      setNewOptionLabel('');
      setIsAddingOption(false);
      await loadPollDetail(true); // Skip vote check to preserve local hasVoted state
    } catch (err) {
      console.error('Failed to add option:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [newOptionLabel, poll, conversationId, pollId, pollStore, loadPollDetail]);

  const removeOption = useCallback(async (optionId: string) => {
    if (!poll) return;

    try {
      await pollStore.removeOption(conversationId, pollId, optionId);
      await loadPollDetail(true); // Skip vote check to preserve local hasVoted state
    } catch (err) {
      console.error('Failed to remove option:', err);
      throw err;
    }
  }, [poll, conversationId, pollId, pollStore, loadPollDetail]);

  return {
    poll,
    isLoading,
    error,
    selectedOptions,
    hasVoted,
    isAddingOption,
    isSubmitting,
    isRetracting,
    newOptionLabel,
    isClosed,
    isExpired,
    isActive,
    creatorName,
    loadPollDetail,
    toggleOption,
    castVote,
    retractVote,
    addOption,
    removeOption,
    setIsAddingOption,
    setNewOptionLabel,
  };
};
