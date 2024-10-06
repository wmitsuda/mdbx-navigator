import { LoaderFunctionArgs } from "@remix-run/node";
import { hexlify } from "ethers";
import invariant from "tiny-invariant";
import { BACKEND_URL, DEFAULT_PAGE_SIZE, K, KV } from "~/types";
import ResultsPage from "~/components/ResultsPage";

export const clientLoader = async ({ params }: LoaderFunctionArgs) => {
  invariant(params.tableName !== undefined, "Missing table name");

  // TODO: add page size here
  const pageSize = DEFAULT_PAGE_SIZE;
  const recordsToRead = pageSize + 1; // always read N+1 on purpose to determine if it has next
  const data = await fetch(
    `${BACKEND_URL}/table/${params.tableName}/forward?pagesize=${recordsToRead}`,
  );
  const j = await data.json();

  const ret: KV[] = [];
  let next: K | undefined;
  for (let i = 0, count = 0; i < j.length && count < pageSize; i++, count++) {
    const e = j[i];
    ret.push({
      k: hexlify(e.k),
      cappedV: hexlify(e.cappedV),
      vLength: e.vLength,
      dupIdx: e.dupIdx,
    });
  }

  if (j.length > pageSize) {
    next = ret[ret.length - 1];
  }

  return {
    data: ret,
    previous: undefined,
    next,
  };
};

export default ResultsPage;
