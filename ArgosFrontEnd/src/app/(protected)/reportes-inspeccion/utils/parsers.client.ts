"use client";

import { parseAsInteger, parseAsString } from "nuqs";

export const searchParser = parseAsString.withDefault("").withOptions({
  shallow: false,
  clearOnDefault: true,
});

export const limitParser = parseAsInteger.withDefault(10).withOptions({
  shallow: false,
  clearOnDefault: true,
});

export const pageParser = parseAsInteger.withDefault(1).withOptions({
  shallow: false,
  clearOnDefault: true,
});
