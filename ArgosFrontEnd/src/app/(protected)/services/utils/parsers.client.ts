import { parseAsInteger, parseAsString } from "nuqs";

const withNav = { shallow: false, history: "replace" as const };

export const searchParser = parseAsString.withDefault("").withOptions(withNav);
export const limitParser = parseAsInteger.withDefault(10).withOptions(withNav);
export const pageParser = parseAsInteger.withDefault(1).withOptions(withNav);
