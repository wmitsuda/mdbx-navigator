import { FC, memo, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import { loader } from "~/routes/value.$tableName.$k.$dupIdx";
import CollapsedValue from "./CollapsedValue";
import ExpandedValue from "./ExpandedValue";

type ValueColumnsProps = {
  tableName: string;
  k: string;
  dupIdx: number;
  v: string;
  maxBytesPerLine: number;
  maxBytesPerColumn: number;
  totalLen: number;
};

const ValueColumns: FC<ValueColumnsProps> = ({
  tableName,
  k,
  dupIdx,
  v,
  maxBytesPerLine,
  maxBytesPerColumn,
  totalLen,
}) => {
  const fetcher = useFetcher<typeof loader>();

  const rawCappedV = v.substring(2); // strips "0x"
  const maxDataColumns = Math.ceil(maxBytesPerLine / maxBytesPerColumn);
  const numDataColumns = Math.ceil(rawCappedV.length / 2 / maxBytesPerColumn);
  const expander = useCallback(
    () => fetcher.load(`/value/${tableName}/${k}/${dupIdx}`),
    [fetcher, tableName, k, dupIdx],
  );

  return fetcher.data === undefined ? (
    <CollapsedValue
      rawCappedV={rawCappedV}
      maxDataColumns={maxDataColumns}
      numDataColumns={numDataColumns}
      maxBytesPerColumn={maxBytesPerColumn}
      totalLen={totalLen}
      triggerExpansion={expander}
    />
  ) : (
    <ExpandedValue
      maxDataColumns={maxDataColumns}
      maxBytesPerLine={maxBytesPerLine}
      maxBytesPerColumn={maxBytesPerColumn}
      totalLen={totalLen}
      rawDataV={fetcher.data.v.substring(2)}
    />
  );
};

export default memo(ValueColumns);
