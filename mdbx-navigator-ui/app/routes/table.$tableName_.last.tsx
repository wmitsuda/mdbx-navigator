import { json, LoaderFunctionArgs } from "@remix-run/node";
import { hexlify } from "ethers";
import invariant from "tiny-invariant";
import { BACKEND_URL } from "~/entry.server";
import { DEFAULT_PAGE_SIZE, K, KV } from "~/types";
import ResultsPage from "~/components/ResultsPage";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  invariant(params.tableName !== undefined, "Missing table name");

  // TODO: add page size here
  const pageSize = DEFAULT_PAGE_SIZE;
  const recordsToRead = pageSize + 1; // always read N+1 on purpose to determine if it has next
  const data = await fetch(
    `${BACKEND_URL}/table/${params.tableName}/backward?pagesize=${recordsToRead}`,
  );
  const j = await data.json();

  const ret: KV[] = [];
  let prev: K | undefined;
  for (
    let i = j.length - 1, count = 0;
    i >= 0 && count < pageSize;
    i--, count++
  ) {
    const e = j[i];
    ret.push({
      k: hexlify(e.k),
      cappedV: hexlify(e.cappedV),
      vLength: e.vLength,
      dupIdx: e.dupIdx,
    });
  }

  if (j.length > pageSize) {
    prev = ret[ret.length - 1];
  }

  return json({
    data: ret.reverse(),
    previous: prev,
    next: undefined,
  });
};

export default ResultsPage;
