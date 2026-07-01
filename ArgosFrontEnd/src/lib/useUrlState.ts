"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

function useUrlState<T>(
  key: string,
  defaultValue: T,
  parse: (v: string) => T | null,
  serialize: (v: T) => string,
): [T, (value: T | null) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get(key);
  const value: T = raw !== null ? (parse(raw) ?? defaultValue) : defaultValue;

  const setValue = useCallback(
    (newValue: T | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue === null || newValue === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, serialize(newValue));
      }

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [key, defaultValue, searchParams, router, pathname, serialize],
  );

  return [value, setValue];
}

/**
 * Update several URL params in one navigation. Calling two single-key
 * setters (from useUrlString/useUrlInt) back-to-back - e.g. setSearch then
 * setPage(1) - fires two separate router.replace() calls; the second is
 * built before the first's navigation has actually committed, so it
 * clobbers the first (the search param gets silently dropped). Use this
 * whenever a single user action needs to change more than one param
 * (e.g. changing the search text also resets the page).
 */
export function useUrlParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [searchParams, router, pathname],
  );
}

export function useUrlString(
  key: string,
  defaultValue = "",
): [string, (v: string | null) => void] {
  return useUrlState(
    key,
    defaultValue,
    (v) => v,
    (v) => v,
  );
}

export function useUrlInt(
  key: string,
  defaultValue: number,
): [number, (v: number | null) => void] {
  return useUrlState(
    key,
    defaultValue,
    (v) => {
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    },
    (v) => String(Math.round(v)),
  );
}
