"use client"
import { FC, useMemo, useState } from "react";
import * as d3 from "d3";
import { convertTopicsToTree, Topic, Tree } from "@/utils/topicTree";
import { useRouter } from 'next/navigation';

interface CirclePackingProps {
  topics: Topic[];
  businessId: string;
  clientId: string;
  minCount: number;
  maxTopics: number;
  topicType: string;
  displayLanguage?: 'en' | 'zh';
}

interface TooltipData {
  name: string;
  count: number;
  percentage: number;
  x: number;
  y: number;
  r: number;
}

const CirclePacking: FC<CirclePackingProps> = ({
  topics,
  businessId,
  clientId,
  minCount,
  maxTopics,
  topicType,
  displayLanguage = 'en',
}) => {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [hoveredCircle, setHoveredCircle] = useState<string | null>(null);
  const router = useRouter();

  const filteredData = useMemo(() => {
    if (!topics || topics.length === 0) return [];
    
    if (topics.length <= maxTopics) {
      return topics;
    } 
    
    return [...topics]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxTopics);
  }, [topics, maxTopics]);

  if (!filteredData || filteredData.length === 0) {
    return <div>No posts with these topics found</div>;
  }

  const baseSize = 600;
  const minSize = 200;
  const maxSize = 1000;
  const size = Math.min(maxSize, Math.max(minSize, baseSize * Math.sqrt(filteredData.length / 10)));
  const width = size;
  const height = size;

  // Map topics to use appropriate language and preserve original for navigation
  const languageMappedTopics = filteredData.map(topic => ({
    ...topic,
    displayName: displayLanguage === 'zh' ? topic.displayTopic : topic.topic,
    originalTopic: topic.topic,
  }));

  const treeData = convertTopicsToTree(languageMappedTopics.map(t => ({
    ...t,
    topic: t.displayName, // Use display name for visualization
  })));
  
  const hierarchy = d3
    .hierarchy(treeData)
    .sum((d: any) => d.count)
    .sort((a: any, b: any) => b.count! - a.count!);

  const packGenerator = d3.pack<Tree>().size([width, height]).padding(1);
  const root = packGenerator(hierarchy);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  function handleCircleClick(data: any): void {
    // Find the original topic from our mapped data
    const mappedTopic = languageMappedTopics.find(t => t.displayName === data.name);
    const topicForUrl = mappedTopic?.originalTopic || data.name;
    router.push(`/${clientId}/${businessId}/topic-analysis/${encodeURIComponent(topicForUrl)}?topic_type=${encodeURIComponent(topicType)}`);
  }

  const handleMouseEnter = (node: any) => {
    setTooltipData({
      name: node.data.name || 'Unknown',
      count: node.data.count || 0,
      percentage: (node.data.percentage || 0) * 100,
      x: node.x,
      y: node.y,
      r: node.r
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
          .map((node: any) => {
            if (!node.data.name) {
              console.warn('Node without name:', node);
              return null;
            }
            return (
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
            );
          })}
        {root
          .descendants()
          .slice(1)
          .map((node: any) => {
            const name = node.data.name || '';
            if (!name) {
              console.warn('Text node without name:', node);
              return null;
            }
            
            const count = node.data.count || 0;
            const fontSize = Math.min(13, node.r / 3);
            const maxChars = Math.floor((node.r * 1.8) / (fontSize * 0.5));

            let displayName;
            if (name.length > maxChars) {
              const halfLength = Math.floor(maxChars / 2);
              const firstLine = name.slice(0, halfLength);
              const secondLine = name.slice(halfLength, maxChars);
              const truncatedSecondLine = secondLine.length > halfLength
                ? secondLine.slice(0, halfLength - 1) + '…'
                : secondLine;
              displayName = [firstLine, truncatedSecondLine];
            } else {
              displayName = [name];
            }

            const totalLines = displayName.length;

            return (
              <text
                key={`text-${node.data.name}`}
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
            fontSize: `${Math.min(13, tooltipData.r / 3)}px`,
            fontWeight: "bold"
          }}
        >
          <div className="mb-1">{tooltipData.name}</div>
          <div>Posts: {tooltipData.count}</div>
        </div>
      )}
    </div>
  );
};

export default CirclePacking;