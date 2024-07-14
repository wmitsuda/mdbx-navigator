import { FC, memo } from "react";
import ColoredHex from "./ColoredHex";
import FillerColumns from "./FillerColumns";
import { getUint } from "ethers";

type CollapsedValueProps = {
  rawCappedV: string;
  maxDataColumns: number;
  numDataColumns: number;
  maxBytesPerColumn: number;
  totalLen: number;
  triggerExpansion: () => void;
};

const CollapsedValue: FC<CollapsedValueProps> = ({
  rawCappedV,
  maxDataColumns,
  numDataColumns,
  maxBytesPerColumn,
  totalLen,
  triggerExpansion,
}) => {
  const fullLength = rawCappedV.length / 2; // how many actual decoded bytes
  const canExpand = fullLength !== totalLen;

  const use8ByteHint = fullLength === 8;

  return (
    <>
      <td className="w-10 border-l pl-2 text-end align-baseline">
        <code className="text-end text-sm text-gray-400">0x</code>
      </td>
      {(rawCappedV.match(/.{1,16}/g) || []).map((c, j) => (
        <td key={j} className="border-l border-gray-300 px-1 align-baseline">
          <ColoredHex data={c} />
        </td>
      ))}
      {use8ByteHint ? (
        <>
          <td
            className="border-l border-gray-300 px-1 align-baseline"
            colSpan={maxDataColumns - numDataColumns}
          >
            <span className="whitespace-pre font-mono text-gray-400">
              {getUint("0x" + rawCappedV)
                .toLocaleString()
                .padEnd(
                  maxBytesPerColumn * 2 * (maxDataColumns - numDataColumns),
                  " ",
                )}
            </span>
          </td>
        </>
      ) : (
        <FillerColumns
          n={maxDataColumns - numDataColumns}
          maxBytesPerColumn={maxBytesPerColumn}
        />
      )}
      <td className="w-40 align-baseline">
        <div className="flex flex-nowrap items-baseline space-x-1">
          {canExpand && (
            <button className="hover:underline" onClick={triggerExpansion}>
              [...]
            </button>
          )}
          <small className="text-nowrap font-mono text-xs text-gray-500">
            ({totalLen} {totalLen > 1 ? "bytes" : "byte"})
          </small>
        </div>
      </td>
    </>
  );
};

export default memo(CollapsedValue);
