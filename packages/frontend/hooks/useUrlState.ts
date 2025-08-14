import { useState, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export function useUrlState<T>(
  name: string,
  defaultValue: T,
): [T, (newValue: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(() => {
    const paramValue = searchParams.get(name);
    return paramValue === null ? defaultValue : (JSON.parse(paramValue) as T);
  });

  const updateUrl = useCallback(
    (newValue: T) => {
      setValue(newValue);
      const params = new URLSearchParams(searchParams.toString());
      if (newValue === null || newValue === undefined) {
        params.delete(name);
      } else {
        params.set(name, JSON.stringify(newValue));
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [name, pathname, router, searchParams],
  );

  return [value, updateUrl];
} 