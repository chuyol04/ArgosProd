import { parseAsString } from "nuqs";
import { parseAsInteger } from "@/lib/parsers.client";

const withNav = { shallow: false, history: "replace" as const };

export const limitParser = parseAsInteger.withDefault(20).withOptions(withNav);
export const pageParser = parseAsInteger.withDefault(1).withOptions(withNav);
export const searchParser = parseAsString.withDefault("").withOptions(withNav);
