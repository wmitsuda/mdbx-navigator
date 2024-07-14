import { FC } from "react";

type FillerColumnsProps = {
  n: number;
  maxBytesPerColumn: number;
};

const FillerColumns: FC<FillerColumnsProps> = ({ n, maxBytesPerColumn }) => (
  <>
    {[...Array(n)].map((_, i) => (
      <td key={i} className="border-l border-gray-300 px-1">
        <span className="whitespace-pre font-mono">
          {"".padStart(maxBytesPerColumn * 2, " ")}
        </span>
      </td>
    ))}
  </>
);

export default FillerColumns;
