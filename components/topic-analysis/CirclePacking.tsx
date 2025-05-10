"use client"
import { FC, useMemo, useState } from "react";
import * as d3 from "d3";
import { convertTopicsToTree, Topic, Tree } from "../../utils/topicTree";
import { useRouter } from 'next/navigation';

interface CirclePackingProps {
  topics: Topic[];
  businessId: string;
  clientId: string;
  limit: number;
}

interface TooltipData {
  name: string;
  count: number;
  percentage: number;
  x: number;
  y: number;
}

const CirclePacking: FC<CirclePackingProps> = ({
  topics,
  businessId,
  clientId,
  limit,
}) => {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [hoveredCircle, setHoveredCircle] = useState<string | null>(null);
  const filteredData = topics.filter(topic => topic.count > limit);
  if (filteredData.length === 0) {
    return <div>No topics with more than {limit} mentions</div>;
  }
  
  // Calculate dimensions based on the number of topics
  const baseSize = 600; // Base size
  const minSize = 200;  // Minimum size
  const maxSize = 1000; // Maximum size
  const size = Math.min(maxSize, Math.max(minSize, baseSize * Math.sqrt(filteredData.length / 10)));
  
  const width = size;
  const height = size;

  const treeData = convertTopicsToTree(filteredData);
  const hierarchy = d3
    .hierarchy(treeData)
    .sum((d: any) => d.count)
    .sort((a: any, b: any) => b.count! - a.count!);

  const packGenerator = d3.pack<Tree>().size([width, height]).padding(1);
  const root = packGenerator(hierarchy);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const router = useRouter();
  function handleCircleClick(data: any): void {
    router.push(`/${clientId}/${businessId}/topic-analysis/${data.name}`);
  }

  const handleMouseEnter = (node: any) => {
    setTooltipData({
      name: node.data.name,
      count: node.data.count,
      percentage: node.data.percentage * 100,
      x: node.x,
      y: node.y
    });
    setHoveredCircle(node.data.name);
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
    setHoveredCircle(null);
  };

  function truncateText(text: string, maxChars: number) {
    return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
  }

  return (
    <div className="relative">
      <svg width={width} height={height} className="inline-block">
        {root
          .descendants()
          .slice(1)
          .map((node: any) => (
            <circle
              key={node.data.name}
              cx={node.x}
              cy={node.y}
              r={node.r}
              stroke={hoveredCircle === node.data.name ? "#000" : "#fff"}
              strokeWidth={hoveredCircle === node.data.name ? 3 : 2}
              fill={color(node.data.name)}
              fillOpacity={hoveredCircle === node.data.name ? 0.9 : 0.7}
              onClick={() => handleCircleClick(node.data)}
              onMouseEnter={() => handleMouseEnter(node)}
              onMouseLeave={handleMouseLeave}
              className="transition-all duration-200 ease-in-out cursor-pointer"
            />
          ))}
        {root
          .descendants()
          .slice(1)
          .map((node: any) => {
            const fontSize = Math.min(13, node.r / 3);
            // Estimate maximum characters that can fit
            const maxChars = Math.floor((node.r * 2) / (fontSize * 0.6));
            const name = truncateText(node.data.name, Math.max(2, Math.floor(maxChars * 0.7)));
            const percentage = truncateText(`${((node.data.percentage * 100).toFixed(2))}%`, Math.max(1, Math.floor(maxChars * 0.3)));
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
                className="pointer-events-none"
              >
                <tspan x={node.x} dy="-0.3em">{name}</tspan>
                <tspan x={node.x} dy="1.2em">{percentage}</tspan>
              </text>
            );
          })}
      </svg>
      {tooltipData && (
        <div
          className="absolute bg-white text-black p-3 rounded shadow-sm pointer-events-none z-50"
          style={{
            left: tooltipData.x + 10,
            top: tooltipData.y - 10,
          }}
        >
          <div className="font-bold mb-1">{tooltipData.name}</div>
          <div>Percentage: {tooltipData.percentage.toFixed(2)}%</div>
        </div>
      )}
    </div>
  );
};

export default CirclePacking;
