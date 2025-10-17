"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Word, WordCloud as ReactWordCloud } from '@isoterik/react-word-cloud';
import { useDateRange } from "@/context/DateRangeContext";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";

interface TopHashtagsProps {
  businessId: string;
  displayLanguage: string;
  platform: string;
}

interface HashtagData {
  hashtag: string;
  tag_count: number;
}

export default function TopHashtags({ businessId, displayLanguage, platform }: TopHashtagsProps) {
  const { dateRange } = useDateRange();
  const [hashtags, setHashtags] = useState<HashtagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formattedStart = useMemo(
    () => format(new Date(dateRange.startDate), "MMM d yyyy"),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), "MMM d yyyy"),
    [dateRange.endDate]
  );

  const startDateProcessed = useMemo(
    () => setStartOfDay(dateRange.startDate),
    [dateRange.startDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(dateRange.endDate),
    [dateRange.endDate]
  );

  useEffect(() => {
    const fetchHashtags = async () => {
      if (!dateRange.startDate || !dateRange.endDate) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          business_id: businessId,
          start_date: startDateProcessed,
          end_date: endDateProcessed,
          language: displayLanguage, // Add language parameter
        });

        // Add platform filter if not 'all'
        if (platform && platform !== 'all') {
          params.append('platform', platform);
        }

        const response = await fetch(
          `/api/businesses/credit-cards/getTopHashtags?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch hashtags");
        }

        const data = await response.json();
        setHashtags(data.slice(0, 50)); // Get top 50 for word cloud
      } catch (err) {
        console.error("Error fetching hashtags:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchHashtags();
  }, [businessId, dateRange.startDate, dateRange.endDate, startDateProcessed, endDateProcessed, displayLanguage, platform]);

  const { words, totalMentions } = useMemo(() => {
    const words: Word[] = hashtags.map((hashtag) => ({
      text: `#${hashtag.hashtag}`,
      value: hashtag.tag_count,
    }));

    const total = hashtags.reduce((sum, h) => sum + h.tag_count, 0);

    return {
      words,
      totalMentions: total,
    };
  }, [hashtags]);

  // Dynamic font size scaling based on data range
  const getFontSize = useMemo(() => {
    if (words.length === 0) return () => 20;
    
    const counts = words.map(w => w.value);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const range = maxCount - minCount;
    
    // Adaptive scaling
    const baseMin = totalMentions < 100 ? 24 : 16;
    const baseMax = totalMentions < 100 ? 80 : 100;
    
    return (word: Word) => {
      if (range === 0) return (baseMin + baseMax) / 2;
      
      const normalized = (word.value - minCount) / range;
      // Use power scaling for better visual distribution
      const scaledSize = baseMin + (baseMax - baseMin) * Math.pow(normalized, 0.6);
      
      return Math.max(baseMin, Math.min(baseMax, scaledSize));
    };
  }, [words, totalMentions]);

  const getColor = (word: Word) => {
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">Top Hashtags</h2>
        <div className="text-sm text-gray-600">
          {hashtags.length} hashtag{hashtags.length !== 1 ? 's' : ''} • {totalMentions} total mentions
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : error ? (
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      ) : hashtags.length === 0 ? (
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-gray-500">No hashtags found for this period</p>
        </div>
      ) : (
        <div className="w-full relative" style={{ height: '400px', overflow: 'hidden' }}>
          <ReactWordCloud
            words={words}
            width={1200}
            height={400}
            font="Impact"
            fontSize={getFontSize}
            fontWeight="normal"
            padding={2}
            spiral="archimedean"
            rotate={() => 0}
            fill={(word) => getColor(word)}
            enableTooltip={true}
            svgProps={{
              style: {
                width: '100%',
                height: '100%',
              }
            }}
          />
        </div>
      )}
    </div>
  );
}