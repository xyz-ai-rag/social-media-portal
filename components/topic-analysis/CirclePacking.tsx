"use client"
import { FC, useMemo, useState, useEffect, useRef } from "react";
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
    return <div>No posts with these topics found</div>;
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
            const maxChars = Math.floor((node.r * 2) / (fontSize * 0.5));
            const name = node.data.name;
            const count = node.data.count;

            // Split name into two lines if it's too long
            let displayName;
            if (name.length > maxChars) {
              const halfLength = Math.floor(maxChars / 2);
              const firstLine = name.slice(0, halfLength);
              const secondLine = name.slice(halfLength, maxChars);
              // Add ellipsis to second line if it's too long
              const truncatedSecondLine = secondLine.length > halfLength
                ? secondLine.slice(0, halfLength - 1) + '…'
                : secondLine;
              displayName = [firstLine, truncatedSecondLine];
            } else {
              displayName = [name];
            }

            const totalLines = displayName.length; // +1 for the count


            return (
              <text
                key={node.data.name}
                x={node.x}
                y={node.y - ((totalLines - 1) / 2) * fontSize * 1.2}
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#222"
                className="pointer-events-none"
              >
                {displayName.map((line, index) => (
                  <tspan
                    key={index}
                    x={node.x}
                    dy={index === 0 ? "0em" : "1.2em"}
                  >
                    {line}
                  </tspan>
                ))}
                <tspan x={node.x} dy="1.2em">{count}</tspan>
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
          <div>Posts: {tooltipData.count}</div>
        </div>
      )}
    </div>
  );
};

export default CirclePacking;
