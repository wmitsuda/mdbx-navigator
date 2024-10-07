import { FC } from "react";

type ColoredHexProps = {
  data: string;
  chunkSize?: number;
};

const ColoredHex: FC<ColoredHexProps> = ({ data, chunkSize = 4 }) => {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.substring(i, i + chunkSize);
    chunks.push(chunk);
  }

  return (
    <code className="group group-hover:font-bold">
      {chunks.map((c, i) => (
        <span
          key={i}
          className={`group-hover:odd:text-blue-700 group-hover:even:text-red-600 group-hover:even:underline`}
        >
          {c}
        </span>
      ))}
      <span className="whitespace-pre">{"".padEnd(16 - data.length, " ")}</span>
    </code>
  );
};

export default ColoredHex;
