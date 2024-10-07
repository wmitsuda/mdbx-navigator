import { LoaderFunctionArgs } from "@remix-run/node";
import { hexlify, isHexString } from "ethers";
import invariant from "tiny-invariant";
import { BACKEND_URL, DEFAULT_PAGE_SIZE, K, KV } from "~/types";
import ResultsPage from "./table.$tableName";

export const clientLoader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.tableName !== undefined, "Missing table name");

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  invariant(
    key !== null && isHexString(key),
    `Invalid hex after param: ${key}`,
  );

  // TODO: add page size here
  const pageSize = DEFAULT_PAGE_SIZE;
  const recordsToRead = pageSize + 1;

  const data = await fetch(
    `${BACKEND_URL}/table/${params.tableName}/search?key=${key}&pagesize=${recordsToRead}`,
  );

  const j = await data.json();
  const ret: KV[] = [];
  for (let i = 0, count = 0; i < j.length && count < pageSize; i++, count++) {
    const e = j[i];

    ret.push({
      k: hexlify(e.k),
      cappedV: hexlify(e.cappedV),
      vLength: e.vLength,
      dupIdx: e.dupIdx,
    });
  }
  let next: K | undefined;
  if (j.length > pageSize) {
    next = ret[ret.length - 1];
  }

  return {
    data: ret,
    previous: ret[0],
    next,
  };
};

export default ResultsPage;
