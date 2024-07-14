import { FC, memo } from "react";
import KeyColumns from "./KeyColumns";
import ValueColumns from "./ValueColumns";
import { KV } from "~/types";

type ResultsProps = {
  data: KV[];
  tableName: string;
  maxBytesPerLinePerKey: number;
  maxBytesPerLinePerValue: number;
  groupSize: number;
};

const Results: FC<ResultsProps> = ({
  data,
  tableName,
  maxBytesPerLinePerKey,
  maxBytesPerLinePerValue,
  groupSize,
}) => (
  <table className="min-w-max table-fixed">
    <thead>
      <tr className="border-b border-t border-gray-300">
        <th
          className="px-2 py-1 text-start"
          colSpan={1 + Math.ceil(maxBytesPerLinePerKey / groupSize) + 1}
        >
          Key
        </th>
        <th
          className="border-l px-2 py-1 text-start"
          colSpan={1 + Math.ceil(maxBytesPerLinePerValue / groupSize) + 1}
        >
          Value
        </th>
      </tr>
      <tr className="border-b">
        <th className="w-10"></th>
        {[...Array(Math.ceil(maxBytesPerLinePerKey / groupSize))].map(
          (_, i) => (
            <th key={i} className="border-l border-gray-300 text-left">
              <span className="px-1 font-mono text-xs font-normal text-gray-400">
                {i * groupSize}
              </span>
            </th>
          ),
        )}
        <th className="px-1 text-start align-bottom text-xs font-normal text-gray-400">
          Size
        </th>
        <th className="w-10 border-l"></th>
        {[...Array(Math.ceil(maxBytesPerLinePerValue / groupSize))].map(
          (_, i) => (
            <th key={i} className="border-l border-gray-300 text-left">
              <span className="px-1 font-mono text-xs font-normal text-gray-400">
                {i * groupSize}
              </span>
            </th>
          ),
        )}
        <th className="w-40 px-1 text-start align-bottom text-xs font-normal text-gray-400">
          Size
        </th>
      </tr>
    </thead>
    <tbody>
      {data.map((entry) => (
        <tr
          key={entry.k + "-" + entry.dupIdx}
          className="outline-red-700 last:border-b odd:bg-gray-100 even:bg-white hover:bg-orange-100 hover:outline hover:outline-1"
          data-k={entry.k}
          data-dupidx={entry.dupIdx}
        >
          <KeyColumns
            k={entry.k}
            maxBytesPerLine={maxBytesPerLinePerKey}
            maxBytesPerColumn={groupSize}
          />
          <ValueColumns
            tableName={tableName}
            k={entry.k}
            dupIdx={entry.dupIdx}
            v={entry.cappedV}
            maxBytesPerLine={maxBytesPerLinePerValue}
            maxBytesPerColumn={groupSize}
            totalLen={entry.vLength}
          />
        </tr>
      ))}
    </tbody>
  </table>
);

export default memo(Results);
