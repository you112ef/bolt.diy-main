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
    // Conceptual logging for searchQuery
    console.log('[useSearchFilter] Initial searchQuery type:', typeof searchQuery, 'value:', searchQuery);

    const safeSearchQuery = (typeof searchQuery === 'string' ? searchQuery : '');
    // Conceptual logging for safeSearchQuery before toLowerCase
    console.log('[useSearchFilter] safeSearchQuery type:', typeof safeSearchQuery, 'value:', safeSearchQuery);

    if (!safeSearchQuery.trim()) {
      // console.log('[useSearchFilter] Empty search query, returning all items.');
      return items;
    }
    const query = safeSearchQuery.toLowerCase();
    // console.log('[useSearchFilter] Lowercased query:', query);

    return items.filter((item, index) => {
      // console.log(`[useSearchFilter] Filtering item index: ${index}, item:`, item);
      if (!item) {
        // console.log(`[useSearchFilter] Item index: ${index} is null/undefined, filtering out.`);
        return false;
      }

      return searchFields.some((field) => {
        // console.log(`[useSearchFilter] Item index: ${index}, checking field: ${String(field)}`);
        const rawValue = item[field];
        // Conceptual logging for rawValue
        console.log(`[useSearchFilter] Item index: ${index}, field: ${String(field)}, rawValue type:`, typeof rawValue, 'value:', rawValue);

        const valueStr = (rawValue !== null && rawValue !== undefined && typeof rawValue.toString === 'function')
                         ? String(rawValue)
                         : '';
        // Conceptual logging for valueStr before toLowerCase
        console.log(`[useSearchFilter] Item index: ${index}, field: ${String(field)}, valueStr type:`, typeof valueStr, 'value:', valueStr);

        try {
          const result = valueStr.toLowerCase().includes(query);
          // console.log(`[useSearchFilter] Item index: ${index}, field: ${String(field)}, toLowerCase().includes() result: ${result}`);
          return result;
        } catch (e) {
          // console.error(`[useSearchFilter] ERROR at valueStr.toLowerCase().includes(query) for item index ${index}, field ${String(field)}`, {valueStr, query, item, error: e});
          // To absolutely ensure this doesn't break in production due to logs, re-throw or handle error appropriately.
          // For conceptual logging, we might just log and return false.
          console.error(`[useSearchFilter] Error during search for item index ${index}, field ${String(field)}:`, e);
          return false; // Defensively return false if an error occurs during the search operation itself
        }
      });
    });
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    filteredItems,
    handleSearchChange,
  };
}
