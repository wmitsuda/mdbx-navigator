import { Await, defer, useLoaderData } from "@remix-run/react";
import { FC, Suspense } from "react";
import Tables from "~/components/Tables";
import { BACKEND_URL } from "~/entry.server";
import { TableEntry } from "~/types";

const getTables = async () => {
  const entries: TableEntry[] = [];

  const data = await fetch(`${BACKEND_URL}/tables`);
  const json = await data.json();
  for (const e of json) {
    entries.push({
      name: e.name,
      pageSize: e.psize,
      depth: e.depth,
      branchPages: e.branchPages,
      leafPages: e.leafPages,
      overflowPages: e.overflowPages,
      entries: e.entries,
    });
  }

  return Promise.resolve(entries);
};

export const loader = async () => {
  return defer({
    entries: getTables(),
  });
};

const Database: FC = () => {
  const { entries } = useLoaderData<typeof loader>();

  return (
    <Suspense fallback={<div>Loading</div>}>
      <Await resolve={entries}>
        {(tables: TableEntry[]) => <Tables tables={tables} />}
      </Await>
    </Suspense>
  );
};

export default Database;
