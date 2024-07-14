import { json, LoaderFunctionArgs } from "@remix-run/node";
import { hexlify, isHexString } from "ethers";
import invariant from "tiny-invariant";
import ResultsPage from "~/components/ResultsPage";
import { BACKEND_URL } from "~/entry.server";
import { DEFAULT_PAGE_SIZE, K, KV } from "~/types";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.tableName !== undefined, "Missing table name");

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const dupIdx = url.searchParams.get("dupidx");
  invariant(
    key !== null && isHexString(key),
    `Invalid hex after param: ${key}`,
  );
  invariant(
    dupIdx !== null && !isNaN(Number(dupIdx)),
    `Invalid dupidx param: ${dupIdx}`,
  );

  // Search start?
  let readAhead = 1; // always read N+1 on purpose to determine if it has next
  // if start point is set, read from it, so +1
  readAhead++;
  // TODO: add page size here
  const pageSize = DEFAULT_PAGE_SIZE;
  const recordsToRead = pageSize + readAhead;
  const data = await fetch(
    `${BACKEND_URL}/table/${params.tableName}/forward?key=${key}&dupidx=${dupIdx}&pagesize=${recordsToRead}`,
  );
  const j = await data.json();

  const ret: KV[] = [];
  // first elem must match start point
  const e = j[0];
  invariant(e.k === key, `start key does not match: ${e.k}, expected: ${key}`);
  invariant(
    e.dupIdx.toString() === dupIdx,
    `start dupIdx does not match: ${e.dupIdx}, expected: ${dupIdx}`,
  );

  for (let i = 1, count = 0; i < j.length && count < pageSize; i++, count++) {
    const e = j[i];

    ret.push({
      k: hexlify(e.k),
      cappedV: hexlify(e.cappedV),
      vLength: e.vLength,
      dupIdx: e.dupIdx,
    });
  }
  const previous = ret[0];
  let next: K | undefined;
  if (j.length > pageSize + 1) {
    next = ret[ret.length - 1];
  }

  return json({
    data: ret,
    previous,
    next,
  });
};

export default ResultsPage;
