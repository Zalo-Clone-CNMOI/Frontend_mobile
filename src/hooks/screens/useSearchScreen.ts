import { useSearchStore } from '@/src/store/searchStore';
import { useEffect } from 'react';

export function useSearchScreenLogic() {
  const query = useSearchStore((state) => state.query);
  const filteredResults = useSearchStore((state) => state.filteredResults);
  const filteredResultsV2 = useSearchStore((state) => state.filteredResultsV2);
  const setQuery = useSearchStore((state) => state.setQuery);
  const loading = useSearchStore((state) => state.loading);
  const error = useSearchStore((state) => state.error);
  const hasNext = useSearchStore((state) => state.hasNext);
  const loadMore = useSearchStore((state) => state.loadMore);
  const initializeSearchData = useSearchStore((state) => state.initializeSearchData);

  useEffect(() => {
    initializeSearchData();
  }, [initializeSearchData]);

  return {
    error,
    filteredResults,
    filteredResultsV2,
    loading,
    query,
    setQuery,
    hasNext,
    loadMore,
  };
}

