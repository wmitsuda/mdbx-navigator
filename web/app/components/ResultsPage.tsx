import { LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  json,
  NavLink,
  useLoaderData,
  useNavigation,
  useParams,
} from "@remix-run/react";
import { FC, useState } from "react";
import invariant from "tiny-invariant";
import {
  DEFAULT_PAGE_SIZE,
  maxBytesPerLinePerKey,
  maxBytesPerLinePerValue,
  groupSize,
  K,
  KV,
} from "~/types";
import Header from "./Header";
import NavBar from "./NavBar";
import Results from "./Results";

type Page = {
  data: KV[];
  previous: K | undefined;
  next: K | undefined;
};

const hexRegexp = /^0x[\da-fA-F]+$/;

type T = (_: LoaderFunctionArgs) => ReturnType<typeof json<Page>>;

const ResultsPage: FC = () => {
  const { data, previous, next } = useLoaderData<T>();
  const navigation = useNavigation();
  const { tableName } = useParams();
  invariant(tableName !== undefined);

  const [query, setQuery] = useState("");

  return (
    <div>
      <Header>
        <div className="flex space-x-4 align-baseline">
          <NavLink className="hover:underline" to="/">
            Table Name: {tableName}
          </NavLink>
          <Form className="flex" action={`/search/${tableName}`}>
            <input
              className="rounded-l border border-gray-300 px-2 py-1 text-sm"
              type="search"
              placeholder="Search (0x...)"
              name="key"
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              className="rounded-r border-b border-r border-t border-gray-300 px-2 py-1 text-sm text-gray-500 disabled:bg-gray-100 disabled:text-gray-300"
              type="submit"
              value="Go"
              disabled={
                navigation.state === "submitting" || !query.match(hexRegexp)
              }
            />
          </Form>
        </div>
      </Header>
      <NavBar
        tableName={tableName}
        pageSize={DEFAULT_PAGE_SIZE}
        previous={previous}
        next={next}
      />
      <Results
        data={data}
        tableName={tableName}
        maxBytesPerLinePerKey={maxBytesPerLinePerKey}
        maxBytesPerLinePerValue={maxBytesPerLinePerValue}
        groupSize={groupSize}
      />
      <NavBar
        tableName={tableName}
        pageSize={DEFAULT_PAGE_SIZE}
        previous={previous}
        next={next}
      />
    </div>
  );
};

export default ResultsPage;
