"use client"
import { FC } from 'react';
interface TabSectionProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

const TabSection: FC<TabSectionProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const tabs = [
    { id: 0, label: 'City Overview' },
    { id: 1, label: 'City Analysis' },
    { id: 2, label: 'Criticisms' },
    { id: 3, label: 'Compliments' },
    { id: 4, label: 'Other Cities' },
  ];

  return (
    <div className="mt-6">
      {/* Tab Navigation */}
      <div className="mb-4 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center" role="tablist">
          {tabs.map((tab) => (
            <li key={tab.id} className="mr-2" role="presentation">
              <button
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
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
    </div>
  );
};

export default TabSection; 