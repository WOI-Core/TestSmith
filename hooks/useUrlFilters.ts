import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface FilterState {
  searchTerm: string;
  fileTypes: string[];
  tagStatus: string[];
  uploadStatus: string[];
}

const DEFAULT_FILTERS: FilterState = {
  searchTerm: '',
  fileTypes: [],
  tagStatus: [],
  uploadStatus: []
};

/**
 * Custom hook for managing filter state in URL query parameters
 * This allows filters to persist across page reloads and enables sharing filtered views
 */
export function useUrlFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current filters from URL
  const currentFilters = useMemo((): FilterState => {
    const search = searchParams.get('search') || '';
    const fileTypes = searchParams.get('fileTypes')?.split(',').filter(Boolean) || [];
    const tagStatus = searchParams.get('tagStatus')?.split(',').filter(Boolean) || [];
    const uploadStatus = searchParams.get('uploadStatus')?.split(',').filter(Boolean) || [];

    return {
      searchTerm: search,
      fileTypes,
      tagStatus,
      uploadStatus
    };
  }, [searchParams]);

  // Update URL with new filters
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    const current = new URLSearchParams(searchParams.toString());
    
    const updatedFilters = { ...currentFilters, ...newFilters };

    // Update search parameter
    if (updatedFilters.searchTerm) {
      current.set('search', updatedFilters.searchTerm);
    } else {
      current.delete('search');
    }

    // Update array parameters
    ['fileTypes', 'tagStatus', 'uploadStatus'].forEach(key => {
      const values = updatedFilters[key as keyof FilterState] as string[];
      if (values.length > 0) {
        current.set(key, values.join(','));
      } else {
        current.delete(key);
      }
    });

    // Update URL without causing a page reload
    const newUrl = current.toString() ? `?${current.toString()}` : '/upload';
    router.replace(newUrl, { scroll: false });
  }, [currentFilters, router, searchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.replace('/upload', { scroll: false });
  }, [router]);

  // Individual filter updaters
  const setSearchTerm = useCallback((searchTerm: string) => {
    updateFilters({ searchTerm });
  }, [updateFilters]);

  const setFileTypes = useCallback((fileTypes: string[]) => {
    updateFilters({ fileTypes });
  }, [updateFilters]);

  const setTagStatus = useCallback((tagStatus: string[]) => {
    updateFilters({ tagStatus });
  }, [updateFilters]);

  const setUploadStatus = useCallback((uploadStatus: string[]) => {
    updateFilters({ uploadStatus });
  }, [updateFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return currentFilters.searchTerm.length > 0 ||
           currentFilters.fileTypes.length > 0 ||
           currentFilters.tagStatus.length > 0 ||
           currentFilters.uploadStatus.length > 0;
  }, [currentFilters]);

  return {
    filters: currentFilters,
    updateFilters,
    clearFilters,
    setSearchTerm,
    setFileTypes,
    setTagStatus,
    setUploadStatus,
    hasActiveFilters
  };
} 