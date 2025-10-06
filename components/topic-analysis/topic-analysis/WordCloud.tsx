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

  const getColor = (word: Word, index: number) => {
    const count = word.value;
    const maxCount = Math.max(...words.map(w => w.value));
    const minCount = Math.min(...words.map(w => w.value));
    const range = maxCount - minCount;
    const normalized = range > 0 ? (count - minCount) / range : 0.5;
    
    // Blue color scale from light to dark
    const lightBlue = { r: 191, g: 219, b: 254 }; // #BFDBFE
    const darkBlue = { r: 30, g: 64, b: 175 };    // #1E40AF
    
    const r = Math.round(lightBlue.r + (darkBlue.r - lightBlue.r) * normalized);
    const g = Math.round(lightBlue.g + (darkBlue.g - lightBlue.g) * normalized);
    const b = Math.round(lightBlue.b + (darkBlue.b - lightBlue.b) * normalized);
    
    return `rgb(${r}, ${g}, ${b})`;
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
          fill={(word, index) => getColor(word, index)}
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