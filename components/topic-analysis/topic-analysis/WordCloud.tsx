"use client"

import { FC, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Topic {
  topic: string;
  displayTopic: string;
  count: number;
  sentiment?: number;
  [key: string]: any;
}

interface WordCloudProps {
  topics: Topic[];
  businessId: string;
  clientId: string;
  minCount?: number;
  maxTopics?: number;
  topicType: string;
  displayLanguage?: 'en' | 'zh';
}

interface Word {
  text: string;
  originalTopic: string;
  size: number;
  count: number;
  sentiment?: number;
  x: number;
  y: number;
  rotate: number;
}

const WordCloud: FC<WordCloudProps> = ({
  topics,
  businessId,
  clientId,
  minCount = 0,
  maxTopics = Infinity,
  topicType,
  displayLanguage = 'en',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const getColor = (word: Word, index: number) => {
    const colors = [
      '#9333EA', // purple
      '#2563EB', // blue
      '#059669', // green
      '#DC2626', // red
      '#EA580C', // orange
      '#7C3AED', // violet
      '#0891B2', // cyan
      '#CA8A04', // yellow
      '#DB2777', // pink
      '#65A30D', // lime
    ];
    
    return colors[index % colors.length];
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width > 0 ? width : 800, height: 500 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !topics || topics.length === 0) return;

    const filteredTopics = topics
      .filter((topic) => topic.count >= minCount)
      .slice(0, maxTopics)
      .sort((a, b) => b.count - a.count);

    if (filteredTopics.length === 0) return;

    const maxCount = Math.max(...filteredTopics.map(t => t.count));
    const minCountValue = Math.min(...filteredTopics.map(t => t.count));

    const fontSizeScale = d3.scalePow()
      .exponent(0.5)
      .domain([minCountValue, maxCount])
      .range([16, 90]);

    const words: Word[] = filteredTopics.map(topic => ({
      text: displayLanguage === 'zh' ? topic.displayTopic : topic.topic,
      originalTopic: topic.topic,
      size: fontSizeScale(topic.count),
      count: topic.count,
      sentiment: topic.sentiment,
      x: 0,
      y: 0,
      rotate: 0,
    }));

    const layoutWords = () => {
      const { width, height } = dimensions;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const ellipseA = width * 0.48;
      const ellipseB = height * 0.43;
      
      interface BoundingBox {
        x: number;
        y: number;
        width: number;
        height: number;
        padding: number;
      }
      
      const boundingBoxes: BoundingBox[] = [];
      
      const boxesCollide = (box1: BoundingBox, box2: BoundingBox): boolean => {
        return !(
          box1.x + box1.width + box1.padding < box2.x - box2.padding ||
          box1.x - box1.padding > box2.x + box2.width + box2.padding ||
          box1.y + box1.height + box1.padding < box2.y - box2.padding ||
          box1.y - box1.padding > box2.y + box2.height + box2.padding
        );
      };
      
      words.forEach((word, index) => {
        let angle = Math.random() * Math.PI * 2;
        let radiusScale = index === 0 ? 0 : 0.1;
        let placed = false;
        const maxAttempts = 8000;
        let attempts = 0;
        const angleStep = 0.15;
        const radiusStep = 0.02;
        
        word.rotate = 0;
        
        const isChinese = /[\u4e00-\u9fa5]/.test(word.text);
        const charWidth = isChinese ? word.size * 0.85 : word.size * 0.55;
        const padding = isChinese ? word.size * 0.2 : word.size * 0.08;

        const wordWidth = word.text.length * charWidth;
        const wordHeight = word.size * 1.3;
        
        while (!placed && attempts < maxAttempts) {
          const ellipseX = ellipseA * radiusScale * Math.cos(angle);
          const ellipseY = ellipseB * radiusScale * Math.sin(angle);
          
          const x = centerX + ellipseX - wordWidth / 2;
          const y = centerY + ellipseY - wordHeight / 2;
          
          const currentBox: BoundingBox = {
            x,
            y,
            width: wordWidth,
            height: wordHeight,
            padding
          };
          
          const distX = ellipseX / ellipseA;
          const distY = ellipseY / ellipseB;
          const inEllipse = (distX * distX + distY * distY) <= 0.9;
          
          const inBounds = 
            x - padding > 0 && 
            x + wordWidth + padding < width && 
            y - padding > 0 && 
            y + wordHeight + padding < height;
          
          const hasCollision = boundingBoxes.some(box => boxesCollide(currentBox, box));
          
          if (inBounds && inEllipse && !hasCollision) {
            word.x = centerX + ellipseX;
            word.y = centerY + ellipseY;
            boundingBoxes.push(currentBox);
            placed = true;
          } else {
            angle += angleStep;
            if (angle > Math.PI * 2) {
              angle = 0;
              radiusScale += radiusStep;
              
              if (radiusScale > 1.3) {
                break;
              }
            }
          }
          attempts++;
        }
        
        if (!placed) {
          word.x = -9999;
          word.y = -9999;
        }
      });
    };

    layoutWords();

    const placedWords = words.filter(w => w.x !== -9999);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltipId = 'wordcloud-tooltip';
    let tooltipElement = document.getElementById(tooltipId) as HTMLDivElement;
    
    if (!tooltipElement) {
      tooltipElement = document.createElement('div') as HTMLDivElement;
      tooltipElement.id = tooltipId;
      tooltipElement.style.position = 'absolute';
      tooltipElement.style.padding = '8px 12px';
      tooltipElement.style.background = 'rgba(0, 0, 0, 0.9)';
      tooltipElement.style.color = 'white';
      tooltipElement.style.borderRadius = '6px';
      tooltipElement.style.fontSize = '13px';
      tooltipElement.style.pointerEvents = 'none';
      tooltipElement.style.opacity = '0';
      tooltipElement.style.zIndex = '1000';
      tooltipElement.style.transition = 'opacity 0.2s';
      tooltipElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      document.body.appendChild(tooltipElement);
    }
    
    const tooltip = d3.select(tooltipElement);

    const g = svg.append('g');

    const textElements = g.selectAll('text')
      .data(placedWords)
      .enter()
      .append('text')
      .style('font-size', d => `${d.size}px`)
      .style('font-family', 'Inter, system-ui, sans-serif')
      .style('font-weight', '600')
      .style('fill', (d, i) => getColor(d, i))
      .style('cursor', 'pointer')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .text(d => d.text)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', '0.7')
          .attr('transform', `translate(${d.x},${d.y}) scale(1.05)`);
        
        let tooltipText = `<strong>${d.text}</strong><br/>${d.count} mention${d.count !== 1 ? 's' : ''}`;
        if (d.sentiment !== undefined && d.sentiment !== null) {
          const sentimentLabel = 
            d.sentiment > 0.3 ? 'Positive' :
            d.sentiment < -0.3 ? 'Negative' : 'Neutral';
          tooltipText += `<br/>Sentiment: ${sentimentLabel}`;
        }
        
        tooltip
          .style('opacity', '1')
          .html(tooltipText)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .style('opacity', '1')
          .attr('transform', `translate(${d.x},${d.y})`);
        
        tooltip.style('opacity', '0');
      })
      .on('click', (event, d) => {
        window.location.href = `/${clientId}/${businessId}/topic-analysis/${encodeURIComponent(d.originalTopic)}?topic_type=${encodeURIComponent(topicType)}`;
      });

    textElements
      .style('opacity', 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 30)
      .style('opacity', 1);

  }, [topics, dimensions, minCount, maxTopics, businessId, clientId, topicType, displayLanguage]);

  if (!topics || topics.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] text-gray-500">
        <p>No topics available for word cloud visualization</p>
      </div>
    );
  }

  const filteredCount = topics.filter(t => t.count >= minCount).slice(0, maxTopics).length;
  const totalMentions = topics
    .filter(t => t.count >= minCount)
    .slice(0, maxTopics)
    .reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Topic Word Cloud
        </h3>
        <div className="text-sm text-gray-500">
          {filteredCount} topic{filteredCount !== 1 ? 's' : ''} • Total mentions: {totalMentions}
        </div>
      </div>
      

      <div ref={containerRef} className="w-full">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Click on any word to view related posts
      </div>
    </div>
  );
};

export default WordCloud;