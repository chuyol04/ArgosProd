import { parseAsString } from "nuqs/server";
import { parseAsInteger } from "@/lib/parsers.server";

export const limitParser = parseAsInteger.withDefault(20);
export const pageParser = parseAsInteger.withDefault(1);
export const searchParser = parseAsString.withDefault("");
