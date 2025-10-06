"use client"

import { FC, useMemo } from 'react';
import { Word, WordCloud as ReactWordCloud } from '@isoterik/react-word-cloud';

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

const TopicWordCloud: FC<WordCloudProps> = ({
  topics,
  businessId,
  clientId,
  minCount = 0,
  maxTopics = Infinity,
  topicType,
  displayLanguage = 'en',
}) => {
  const { words, filteredCount, totalMentions } = useMemo(() => {
    const filteredTopics = topics
      .filter((topic) => topic.count >= minCount)
      .slice(0, maxTopics)
      .sort((a, b) => b.count - a.count);

    const words: Word[] = filteredTopics.map((topic) => ({
      text: displayLanguage === 'zh' ? topic.displayTopic : topic.topic,
      value: topic.count,
    }));

    const total = filteredTopics.reduce((sum, t) => sum + t.count, 0);

    return {
      words,
      filteredCount: filteredTopics.length,
      totalMentions: total,
    };
  }, [topics, minCount, maxTopics, displayLanguage]);

  const getColor = (index: number) => {
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

  if (!topics || topics.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] text-gray-500">
        <p>No topics available for word cloud visualization</p>
      </div>
    );
  }

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

      <div className="w-full relative" style={{ height: '500px', overflow: 'hidden' }}>
        <ReactWordCloud
          words={words}
          width={1200}
          height={500}
          font="Impact"
          fontSize={(word) => Math.sqrt(word.value) * 10}
          fontWeight="normal"
          padding={1}
          spiral="archimedean"
          rotate={() => 0}
          fill={(_, index) => getColor(index)}
          enableTooltip={true}
          svgProps={{
            style: {
              width: '100%',
              height: '100%',
            }
          }}
          onWordClick={(word) => {
            const originalTopic = topics.find(
              t => (displayLanguage === 'zh' ? t.displayTopic : t.topic) === word.text
            );
            if (originalTopic) {
              window.location.href = `/${clientId}/${businessId}/topic-analysis/${encodeURIComponent(originalTopic.topic)}?topic_type=${encodeURIComponent(topicType)}`;
            }
          }}
        />
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Click on any word to view related posts
      </div>
    </div>
  );
};

export default TopicWordCloud;