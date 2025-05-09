import { FC, useMemo } from "react";
import * as d3 from "d3";
import { Tree } from "../../utils/topicTree";

// type CirclePackingProps = {
//   width: number;
//   height: number;
//   data: Tree;
// };

const CirclePacking: FC<{data: Tree}> = ({
  data,
}) => {
  const width = 1000;
  const height = 1000;
  const hierarchy = d3
    .hierarchy(data)
    .sum((d: any) => d.value)
    .sort((a: any, b: any) => b.value! - a.value!);

  const packGenerator = d3.pack<Tree>().size([width, height]).padding(4);
  const root = packGenerator(hierarchy);

  return (
    <svg width={width} height={height} style={{ display: "inline-block" }}>
      {root
        .descendants()
        .slice(1)
        .map((node: any) => (
          <circle
            key={node.data.name}
            cx={node.x}
            cy={node.y}
            r={node.r}
            stroke="#553C9A"
            strokeWidth={2}
            fill="#B794F4"
            fillOpacity={0.2}
          />
        ))}
      {root
        .descendants()
        .slice(1)
        .map((node: any) => (
          <text
            key={node.data.name}
            x={node.x}
            y={node.y}
            fontSize={13}
            fontWeight={0.4}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {node.data.name}
          </text>
        ))}
    </svg>
  );
};

export default CirclePacking;
