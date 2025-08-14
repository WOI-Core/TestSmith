import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Custom hook to manage state that syncs with URL query parameters
 * @param key - The query parameter key
 * @param defaultValue - Default value when parameter is not present
 * @returns [value, setValue] tuple similar to useState
 */
export function useUrlState<T extends string = string>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state from URL or default
  const [state, setState] = useState<T>(() => {
    const urlValue = searchParams.get(key);
    return (urlValue as T) || defaultValue;
  });

  // Update URL when state changes
  const setValue = useCallback((newValue: T) => {
    setState(newValue);
    
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (newValue === defaultValue) {
      current.delete(key);
    } else {
      current.set(key, newValue);
    }
    
    const search = current.toString();
    const query = search ? `?${search}` : '';
    
    // Use replace to avoid adding to browser history for every filter change
    router.replace(`${window.location.pathname}${query}`, { scroll: false });
  }, [key, defaultValue, router, searchParams]);

  // Sync state when URL changes externally
  useEffect(() => {
    const urlValue = searchParams.get(key);
    const newValue = (urlValue as T) || defaultValue;
    if (newValue !== state) {
      setState(newValue);
    }
  }, [searchParams, key, defaultValue, state]);

  return [state, setValue];
}

/**
 * Hook for managing boolean URL state
 */
export function useUrlBooleanState(
  key: string,
  defaultValue: boolean = false
): [boolean, (value: boolean) => void] {
  const [stringValue, setStringValue] = useUrlState(
    key,
    defaultValue.toString()
  );
  
  const booleanValue = stringValue === 'true';
  
  const setBooleanValue = useCallback((value: boolean) => {
    setStringValue(value.toString());
  }, [setStringValue]);
  
  return [booleanValue, setBooleanValue];
} 