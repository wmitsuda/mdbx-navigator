import { NavLink } from "@remix-run/react";
import { FC, memo } from "react";
import { K } from "~/types";

type NavBarProps = {
  tableName: string;
  pageSize: number;
  previous: K | undefined;
  next: K | undefined;
};

const NavBar: FC<NavBarProps> = ({ tableName, pageSize, previous, next }) => (
  <nav className="flex space-x-4 px-2 py-2">
    {previous !== undefined ? (
      <>
        <NavLink
          className="hover:underline"
          to={`/table/${tableName}?pagesize=${pageSize}`}
        >
          First
        </NavLink>
        <NavLink
          className="hover:underline"
          to={`/table/${tableName}/before?key=${previous.k}&dupidx=${previous.dupIdx}&pagesize=${pageSize}`}
        >
          Previous
        </NavLink>
      </>
    ) : (
      <>
        <span className="text-gray-400">First</span>
        <span className="text-gray-400">Previous</span>
      </>
    )}
    {next !== undefined ? (
      <>
        <NavLink
          className="hover:underline"
          to={`/table/${tableName}/after?key=${next.k}&dupidx=${next.dupIdx}&pagesize=${pageSize}`}
        >
          Next
        </NavLink>
        <NavLink
          className="hover:underline"
          to={`/table/${tableName}/last?pagesize=${pageSize}`}
        >
          Last
        </NavLink>
      </>
    ) : (
      <>
        <span className="text-gray-400">Next</span>
        <span className="text-gray-400">Last</span>
      </>
    )}
  </nav>
);

export default memo(NavBar);
