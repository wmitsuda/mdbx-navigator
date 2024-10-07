import { FC, memo, useCallback, useState } from "react";
import CollapsedValue from "./CollapsedValue";
import ExpandedValue from "./ExpandedValue";

type KeyColumnsProps = {
  k: string;
  maxBytesPerLine: number;
  maxBytesPerColumn: number;
};

const KeyColumns: FC<KeyColumnsProps> = ({
  k,
  maxBytesPerLine,
  maxBytesPerColumn,
}) => {
  const [expanded, setExpanded] = useState(false);

  const strippedK = k.substring(2); // strips "0x"
  const cappedK = strippedK.substring(0, maxBytesPerLine * 2);
  const maxDataColumns = Math.ceil(maxBytesPerLine / maxBytesPerColumn);
  const numDataColumns = Math.ceil(cappedK.length / 2 / maxBytesPerColumn);

  const totalLen = strippedK.length / 2;
  const expander = useCallback(() => setExpanded(true), [setExpanded]);

  return !expanded ? (
    <CollapsedValue
      rawCappedV={cappedK}
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
      rawDataV={strippedK}
    />
  );
};

export default memo(KeyColumns);
