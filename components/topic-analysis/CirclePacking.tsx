"use client"
import { FC, useMemo } from "react";
import * as d3 from "d3";
import { Tree } from "../../utils/topicTree";
import { useRouter } from 'next/navigation';

interface CirclePackingProps {
  data: Tree;
  businessId: string;
  clientId: string;
}
const CirclePacking: FC<CirclePackingProps> = ({
  data,
  businessId,
  clientId,
}) => {
  const width = 1000;
  const height = 1000;
  const hierarchy = d3
    .hierarchy(data)
    .sum((d: any) => d.value)
    .sort((a: any, b: any) => b.value! - a.value!);

  const packGenerator = d3.pack<Tree>().size([width, height]).padding(0);
  const root = packGenerator(hierarchy);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const router = useRouter();
  function handleCircleClick(data: any): void {
    router.push(`/${clientId}/${businessId}/topic-analysis/${data.name}`);
  }
  const handleMouseEnter = (data: any) => {
    // setHovered(data.name);
    // 这里可以做更多，比如显示 tooltip
  };

  const handleMouseLeave = () => {
    // setHovered(null);
    // 这里可以隐藏 tooltip
  };

  function truncateText(text: string, maxChars: number) {
    return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
  }

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
            stroke="#fff"
            strokeWidth={2}
            fill={color(node.data.name)}
            fillOpacity={0.7}
            onClick={() => handleCircleClick(node.data)}
            onMouseEnter={() => handleMouseEnter(node.data)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      {root
  .descendants()
  .slice(1)
  .map((node: any) => {
    const fontSize = Math.min(13, node.r / 3);
    // 估算最多能放下多少字符
    const maxChars = Math.floor((node.r * 2) / (fontSize * 0.6));
    const name = truncateText(node.data.name, Math.max(2, Math.floor(maxChars * 0.7)));
    const value = truncateText(String(node.data.value), Math.max(1, Math.floor(maxChars * 0.3)));
    return (
      <text
        key={node.data.name}
        x={node.x}
        y={node.y}
        fontSize={fontSize}
        fontWeight={0.4}
        textAnchor="middle"
        alignmentBaseline="middle"
        fill="#222"
        pointerEvents="none"
      >
        <tspan x={node.x} dy="-0.3em">{name}</tspan>
        <tspan x={node.x} dy="1.2em">{value}</tspan>
      </text>
    );
  })}
    </svg >
  );
};

export default CirclePacking;
