import { parseAsInteger, parseAsString } from "nuqs/server";

export const limitParser = parseAsInteger.withDefault(10);
export const pageParser = parseAsInteger.withDefault(1);
export const searchParser = parseAsString.withDefault("");
