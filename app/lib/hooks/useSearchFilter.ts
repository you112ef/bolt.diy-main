import { useState, useMemo, useCallback } from 'react';
import { debounce } from '~/utils/debounce';
import type { ChatHistoryItem } from '~/lib/persistence';

interface UseSearchFilterOptions {
  items: ChatHistoryItem[];
  searchFields?: (keyof ChatHistoryItem)[];
  debounceMs?: number;
}

export function useSearchFilter({
  items = [],
  searchFields = ['description'],
  debounceMs = 300,
}: UseSearchFilterOptions) {
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSetSearch = useCallback(debounce(setSearchQuery, debounceMs), []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetSearch(event.target.value);
    },
    [debouncedSetSearch],
  );

  const filteredItems = useMemo(() => {
    // Ensure searchQuery is a string before calling toLowerCase
    const safeSearchQuery = (typeof searchQuery === 'string' ? searchQuery : '');
    if (!safeSearchQuery.trim()) {
      return items; // Return all items if search query is effectively empty
    }
    const query = safeSearchQuery.toLowerCase();

    return items.filter((item) => {
      if (!item) return false; // Add a guard against undefined/null items in the array

      return searchFields.some((field) => {
        const rawValue = item[field];
        // Ensure rawValue is converted to a string (empty if not stringable)
        // before calling toLowerCase.
        const valueStr = (rawValue !== null && rawValue !== undefined && typeof rawValue.toString === 'function')
                         ? String(rawValue)
                         : '';

        return valueStr.toLowerCase().includes(query);
      });
    });
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    filteredItems,
    handleSearchChange,
  };
}
