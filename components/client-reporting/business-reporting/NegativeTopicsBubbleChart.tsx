"use client"
import { FC, useMemo, useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { convertTopicsToTree, Topic, Tree } from "@/utils/topicTree";
import { setEndOfDay, setStartOfDay } from "@/utils/timeUtils";
import { format } from "date-fns";
interface NegativeTopicsBubbleChartProps {
  businessId: string;
  clientId: string;
  earliestDate: string;
  latestDate: string;
  allBusinessIds: string;
}

interface TooltipData {
  name: string;
  count: number;
  percentage: number;
  x: number;
  y: number;
  r: number;
}

const NegativeTopicsBubbleChart: FC<NegativeTopicsBubbleChartProps> = ({
  businessId,
}) => {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [hoveredCircle, setHoveredCircle] = useState<string | null>(null);

  // Add a ref to track API requests
  const requestTracker = useRef(new Set());
  const [topics, setTopics] = useState<Topic[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Process dates for API query.
 
  // Fetch topic data - just add request tracking
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!businessId) return;

        const url = `/api/client-reporting/negative-topics?business_id=${encodeURIComponent(
          businessId
        )}`;

        const res = await fetch(url);
        const data = await res.json();

        setTopics(data.feedbackStats);
        setTotal(data.total);
        setIsLoading(false);

      } catch (error) {
        console.error("Error fetching topics:", error);
        // Don't set an error message for users to see
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Clear request tracker when component unmounts
    return () => {
      requestTracker.current.clear();
    };
  }, [businessId]);



  // Calculate dimensions based on the number of topics
  const baseSize = 600; // Base size
  const minSize = 200;  // Minimum size
  const maxSize = 1000; // Maximum size
  const size = Math.min(maxSize, Math.max(minSize, baseSize * Math.sqrt(topics.length / 10)));
  // const sizeScale = scaleSqrt()
  // .domain([min, max])
  // .range([BUBBLE_MIN_SIZE, BUBBLE_MAX_SIZE]);
  const width = size;
  const height = size;

  const treeData = convertTopicsToTree(topics);
  const hierarchy = d3
    .hierarchy(treeData)
    .sum((d: any) => d.count)
    .sort((a: any, b: any) => b.count! - a.count!);

  const packGenerator = d3.pack<Tree>().size([width, height]).padding(1);
  const root = packGenerator(hierarchy);
  const color = d3.scaleOrdinal(d3.schemeCategory10);



  const handleMouseEnter = (node: any) => {
    setTooltipData({
      name: node.data.name,
      count: node.data.count,
      percentage: node.data.percentage * 100,
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
    <div className="bg-white p-6 rounded-lg shadow-md relative overflow-auto w-full">
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : total === 0 ? (
        <div className="h-64  flex items-center justify-center">
          <p className="text-gray-500">No criticism topics available</p>
        </div>
      ) : (
        <>
          <div className="mb-2">
            <h2 className="text-base font-medium text-gray-800">              
                Criticism Feedback
            </h2>
          </div>
        
          <div className="flex items-center justify-center w-full h-full">
            <svg width={width} height={height} className="">
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
                  const maxChars = Math.floor((node.r * 1.8) / (fontSize * 0.5));
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
                  fontSize: "13px",
                  fontWeight: "bold"
                }}
              >
                <div className="mb-1">{tooltipData.name}</div>
                <div>Posts: {tooltipData.count}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NegativeTopicsBubbleChart;