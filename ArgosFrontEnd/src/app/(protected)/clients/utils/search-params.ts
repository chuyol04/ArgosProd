import { createLoader } from "nuqs/server";
import {
  limitParser,
  pageParser,
  searchParser,
} from "@/app/(protected)/clients/utils/parsers.server";

export const clientsSearchParams = {
  search: searchParser,
  limit: limitParser,
  page: pageParser,
};

export const loadSearchParams = createLoader(clientsSearchParams);
