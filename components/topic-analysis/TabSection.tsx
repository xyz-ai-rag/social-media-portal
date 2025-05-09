import { FC } from 'react';
interface TabSectionProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  competitorId?: string;
  competitorName?: string;
  businessId: string;
  isLoading: boolean;
}

const TabSection: FC<TabSectionProps> = ({
  activeTab,
  setActiveTab,
  businessId,
  isLoading,
}) => {
  const tabs = [
    { id: 0, label: 'Overview' },
    { id: 1, label: 'Popular Topics' },
    { id: 2, label: 'Critical Feedback' },
    { id: 3, label: 'Competitors & Similar Business' },
    { id: 4, label: 'Sentiment Analysis' },
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

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 0 && (
          <>
            1
              <div className="mb-6">
                {/* <CompetitorStatsCard
                  businessId={businessId}
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                /> */}
              </div>
            
          </>
        )}

        {activeTab === 1 && (
          <div>
            2
              {/* <SharedPostTable
                listData={posts}
                isLoading={isLoading}
                postCardComponent={CompetitorPostCard}
                pagination={pagination}
                sortOrder={filters.sortOrder}
                onSortOrderChange={onSortOrderChange}
                openModal={openModal}
                openPreviewModal={openPreviewModal}
              /> */}
          </div>
        )}

        {/* Add other tab contents here */}
      </div>
    </div>
  );
};

export default TabSection; 