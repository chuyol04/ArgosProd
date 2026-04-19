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
