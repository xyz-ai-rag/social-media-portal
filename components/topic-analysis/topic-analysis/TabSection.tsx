"use client"
import { FC } from 'react';
import { Cloud, Circle } from 'lucide-react';

interface TabSectionProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  businessType: string;
  visualizationMode?: 'bubble' | 'wordcloud';
  setVisualizationMode?: (mode: 'bubble' | 'wordcloud') => void;
}

const TabSection: FC<TabSectionProps> = ({
  activeTab,
  setActiveTab,
  businessType,
  visualizationMode = 'bubble',
  setVisualizationMode,
}) => {
  const allTabs = [
    { id: 0, label: 'Overview' },
    { id: 1, label: 'Popular Topics' },
    { id: 2, label: 'Critical Feedback' },
    { id: 3, label: 'Competitors & Similar Business' },
    { id: 4, label: 'Merchant Partnerships' },
  ];

  // Filter tabs based on business type
  // Show "Merchant Partnership" tab only for Credit card businesses
  const tabs = allTabs.filter(tab => {
    if (tab.id === 4) {
      return businessType === 'Credit card';
    }
    return true;
  });

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex-1">
          <ul className="flex flex-wrap -mb-px text-sm font-medium text-center" role="tablist">
            {tabs.map((tab) => (
              <li key={tab.id} className="mr-2" role="presentation">
                <button
                  className={`inline-block p-4 border-b-2 rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? "text-blue-600 border-blue-600"
                      : "hover:text-gray-600 hover:border-gray-300 border-transparent"
                  }`}
                  type="button"
                  role="tab"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Visualization Mode Toggle */}
        {setVisualizationMode && (
          <div className="flex items-center gap-2 ml-4 mb-4">
            <span className="text-sm text-gray-600 mr-2">View:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVisualizationMode('bubble')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  visualizationMode === 'bubble'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Circle className="w-4 h-4" />
                Bubble Chart
              </button>
              <button
                onClick={() => setVisualizationMode('wordcloud')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  visualizationMode === 'wordcloud'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Cloud className="w-4 h-4" />
                Word Cloud
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabSection;