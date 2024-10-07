import { Switch } from "@headlessui/react";
import { NavLink } from "@remix-run/react";
import { FC, useMemo, useState } from "react";
import { TableEntry } from "~/types";
import Header from "./Header";

type TablesProps = {
  tables: TableEntry[];
};

const Tables: FC<TablesProps> = ({ tables }) => {
  const [hideEmpty, setHideEmpty] = useState(true);
  const emptyCount = useMemo(() => {
    let c = 0;
    for (const t of tables) {
      if (t.entries === 0) {
        c++;
      }
    }
    return c;
  }, [tables]);
  const totalUsage = useMemo(
    () =>
      tables.reduce(
        (acc, t) =>
          acc + (t.branchPages + t.leafPages + t.overflowPages) * t.pageSize,
        0,
      ),
    [tables],
  );

  return (
    <>
      <Header>
        All tables <span className="text-sm">({tables.length})</span>
      </Header>
      <div className="flex px-2 align-baseline">
        <Switch
          checked={hideEmpty}
          onChange={setHideEmpty}
          className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-[checked]:bg-blue-600"
        >
          <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
        </Switch>
        <span className="pl-2">
          Hide empty tables{" "}
          <span className="text-sm text-gray-600">({emptyCount})</span>
        </span>
      </div>

      <table className="my-2">
        <thead>
          <tr className="border-b border-t border-gray-300">
            <th className="w-72 px-2 py-1 text-start">Name</th>
            <th className="w-32 border-l px-2 py-1 text-end">Entries</th>
            <th className="w-32 border-l px-2 py-1 text-end">Page Size</th>
            <th className="w-32 border-l px-2 py-1 text-end">Depth</th>
            <th className="w-32 border-l px-2 py-1 text-end">Branch Pages</th>
            <th className="w-32 border-l px-2 py-1 text-end">Leaf Pages</th>
            <th className="w-32 border-l px-2 py-1 text-end">Overflow Pages</th>
            <th className="w-32 border-l px-2 py-1 text-end">Est. Size</th>
          </tr>
        </thead>
        <tbody>
          {tables
            .filter((table) => !hideEmpty || table.entries > 0)
            .map((table) => (
              <tr
                key={table.name}
                className={`outline-red-700 last:border-b odd:bg-gray-100 even:bg-white hover:bg-orange-100 hover:outline hover:outline-1 ${
                  table.entries === 0 ? "text-gray-400" : ""
                }`}
              >
                <td className="px-2 py-1 hover:underline">
                  <NavLink to={`/table/${table.name}`}>{table.name}</NavLink>
                </td>
                <td className="border-l px-2 py-1 text-end">
                  {table.entries.toLocaleString()}
                </td>
                <td className="border-l px-2 py-1 text-end">
                  {table.pageSize.toLocaleString()}
                </td>
                <td className="border-l px-2 py-1 text-end">
                  {table.depth.toLocaleString()}
                </td>
                <td className="border-l px-2 py-1 text-end">
                  {table.branchPages.toLocaleString()}
                </td>
                <td className="border-l px-2 py-1 text-end">
                  {table.leafPages.toLocaleString()}
                </td>
                <td className="border-l px-2 py-1 text-end">
                  {table.overflowPages.toLocaleString()}
                </td>
                <td className="border-l px-2 py-1 text-end">
                  {(
                    (table.branchPages +
                      table.leafPages +
                      table.overflowPages) *
                    table.pageSize
                  ).toLocaleString()}
                </td>
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="border-l px-2 py-1 text-end" colSpan={8}>
              {totalUsage.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
};

export default Tables;
