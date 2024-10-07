import { FC, memo, useMemo } from "react";
import ColoredHex from "./ColoredHex";
import FillerColumns from "./FillerColumns";

type ExpandedValueProps = {
  maxDataColumns: number;
  maxBytesPerLine: number;
  maxBytesPerColumn: number;
  totalLen: number;
  rawDataV: string; // raw V, including "0x" prefix
};

const ExpandedValue: FC<ExpandedValueProps> = ({
  maxDataColumns,
  maxBytesPerLine,
  maxBytesPerColumn,
  totalLen,
  rawDataV,
}) => {
  // Breaks it into chunks of N bytes
  const lines = useMemo(() => {
    const ret: string[] = [];
    for (let i = 0; i < rawDataV.length; i += maxBytesPerLine * 2) {
      const chunk = rawDataV.substring(i, i + maxBytesPerLine * 2);
      ret.push(chunk);
    }
    return ret;
  }, [rawDataV, maxBytesPerLine]);

  return (
    <td
      className="outline-3 border-l p-0 align-top"
      colSpan={maxDataColumns + 2}
    >
      <table className="w-max table-fixed">
        <tbody>
          {lines.map((chunk, i) => (
            <tr
              key={i}
              className={`hover:bg-orange-200 hover:text-orange-600 hover:outline hover:outline-1 hover:outline-green-700 ${
                i !== 0 && i % 4 === 0 ? "border-t border-gray-300" : ""
              }`}
            >
              <td className="w-10 text-end">
                {i === 0 && (
                  <code className="text-end text-sm text-gray-400">0x</code>
                )}
                {i !== 0 && (i + 1) % 4 === 0 && (
                  <small className="font-mono text-xs text-gray-400">
                    {(i + 1) * maxBytesPerLine}
                  </small>
                )}
              </td>
              {(chunk.match(/.{1,16}/g) || []).map((c, j) => (
                <td key={j} className="border-l border-gray-300 px-1">
                  <ColoredHex data={c} />
                </td>
              ))}
              {i === lines.length - 1 && (
                <>
                  <FillerColumns
                    n={
                      maxDataColumns -
                      Math.ceil(chunk.length / 2 / maxBytesPerColumn)
                    }
                    maxBytesPerColumn={maxBytesPerColumn}
                  />
                  <td className="w-40">
                    <small className="font-mono text-xs text-gray-500">
                      ({totalLen} {totalLen > 1 ? "bytes" : "byte"})
                    </small>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </td>
  );
};

export default memo(ExpandedValue);
