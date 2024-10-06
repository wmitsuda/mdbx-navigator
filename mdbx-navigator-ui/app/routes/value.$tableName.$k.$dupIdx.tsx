import { LoaderFunctionArgs } from "@remix-run/node";
import { BACKEND_URL } from "~/types";

// This route individually loads the entire V given a K + dupidx (bc regular
// search loads a capped V in order to avoid showing huge data loading)
export const clientLoader = async ({ params }: LoaderFunctionArgs) => {
  const data = await fetch(
    `${BACKEND_URL}/table/${params.tableName}/value?key=${params.k}&dupidx=${params.dupIdx}`,
  );

  const j = await data.json();
  return j;
};
