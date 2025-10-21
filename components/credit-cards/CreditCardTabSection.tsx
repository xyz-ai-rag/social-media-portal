"use client"
import { FC } from 'react';
import { Languages } from 'lucide-react';

interface CreditCardTabSectionProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  displayLanguage?: 'en' | 'zh';
  setDisplayLanguage?: (lang: 'en' | 'zh') => void;
}

const CreditCardTabSection: FC<CreditCardTabSectionProps> = ({
  activeTab,
  setActiveTab,
  displayLanguage = 'en',
  setDisplayLanguage,
}) => {
  const tabs = [
    { id: 0, label: 'Overview' },
    { id: 1, label: 'Share of Voice' },
    { id: 2, label: 'Sentiment' },
  ];

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

        {/* Language Toggle */}
        {setDisplayLanguage && (
          <div className="flex items-center gap-3 ml-4 mb-4">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-gray-600" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDisplayLanguage('en')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    displayLanguage === 'en'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setDisplayLanguage('zh')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    displayLanguage === 'zh'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  中文
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditCardTabSection;