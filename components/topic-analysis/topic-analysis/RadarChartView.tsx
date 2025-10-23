"use client"
import { FC, useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis, 
    ResponsiveContainer, 
    Legend, 
    Tooltip } from 'recharts';
import { Loader2, ChevronDown } from 'lucide-react';

interface RadarChartData {
  category: string;
  count: number;
}

interface BusinessRadarData {
  business_id: string;
  overallTopics: RadarChartData[];
  cardAttributes: RadarChartData[];
  spendingScenarios: RadarChartData[];
}

interface RadarChartResponse {
  primary: BusinessRadarData;
  comparison?: BusinessRadarData;
}

interface RadarChartViewProps {
  businessId: string;
  businessName: string;
  similarBusinesses?: Array<{ business_id: string; business_name: string }>;
  startDate: string;
  endDate: string;
  language: 'en' | 'zh';
  platform?: string;
}

const RadarChartView: FC<RadarChartViewProps> = ({
  businessId,
  businessName,
  similarBusinesses = [],
  startDate,
  endDate,
  language,
  platform
}) => {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;

  const [data, setData] = useState<RadarChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisonBusinessId, setComparisonBusinessId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const isMountedRef = useRef(true);
  const lastFetchParamsRef = useRef<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Category to topics mapping
  const getCategoryTopics = (categoryName: string, chartType: 'overall' | 'attributes' | 'scenarios'): string[] => {
    const mappings: Record<string, Record<string, string[]>> = {
      overall: {
        'Overall Brand Image': ['Overall Brand and Card Image'],
        'Rewards and Benefits': ['Benefits', 'Rewards Structure', 'Welcome Offer'],
        'User Experience': ['User Experience', 'Customer Service'],
        'Competitor Benchmarking': ['Competitor Benchmarking'],
        'Technology & Security': ['Mobile App and Online Banking Website', 'Security and Fraud', 'Digital Wallet Integration'],
        'Others': ['Student Use', 'Card Cancellation', 'Annual Fee', 'Value Depreciation', 'Hidden Complexity', 'Bait-and-Switch']
      },
      attributes: {
        'Rewards Structure': ['Rewards Structure'],
        'Benefits': ['Benefits'],
        'Welcome Offer': ['Welcome Offer']
      },
      scenarios: {
        'Online': ['Spending Scenario: Online Shopping'],
        'Overseas and Travel': ['Spending Scenario: Travel and Overseas Spending'],
        'Dining': ['Spending Scenario: Local Dining'],
        'Entertainment': ['Spending Scenario: Entertainment & Leisure'],
        'Others': [
          'Spending Scenario: Groceries and Supermarkets',
          'Spending Scenario: Transportation & Fuel',
          'Spending Scenario: Bills & Recurring Payments',
          'Spending Scenario: Health & Wellness',
          'Spending Scenario: Education'
        ]
      }
    };
    
    return mappings[chartType]?.[categoryName] || [];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const handleRadarClick = (categoryName: string, chartType: 'overall' | 'attributes' | 'scenarios') => {
    if (!categoryName) return;
    
    const topics = getCategoryTopics(categoryName, chartType);
    if (topics.length === 0) return;
    
    const topicsString = topics.join(',');
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    router.push(
      `/${clientId}/${businessId}/topic-analysis/${encodeURIComponent(topicsString)}?topic_type=General&category=${encodeURIComponent(categoryName)}${formattedStartDate ? `&startDate=${formattedStartDate}` : ''}${formattedEndDate ? `&endDate=${formattedEndDate}` : ''}${platform ? `&platform=${platform}` : ''}`
    );
  };

  const fetchRadarData = async () => {
    if (!businessId || !startDate || !endDate) {
      console.log('Missing required parameters for radar data fetch');
      return;
    }

    const fetchKey = `${businessId}-${comparisonBusinessId || 'none'}-${startDate}-${endDate}-${language}-${platform || 'none'}`;
    
    if (lastFetchParamsRef.current === fetchKey) {
      console.log('Skipping duplicate fetch');
      return;
    }

    lastFetchParamsRef.current = fetchKey;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        business_id: businessId,
        start_date: startDate,
        end_date: endDate,
        language: language
      });

      if (comparisonBusinessId) {
        params.append('comparison_business_id', comparisonBusinessId);
      }

      if (platform) {
        params.append('platform', platform);
      }

      const response = await fetch(`/api/businesses/credit-cards/getRadarChartData?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch radar chart data');
      }

      const result = await response.json();
      
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err: any) {
      console.error('Error fetching radar chart data:', err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, [businessId, comparisonBusinessId, startDate, endDate, language, platform]);

  const formatChartData = (primaryData: RadarChartData[], comparisonData?: RadarChartData[]) => {
    if (!primaryData || primaryData.length === 0) return [];
    
    return primaryData.map((item, index) => {
      const chartItem: any = {
        category: item.category,
        [businessName]: item.count
      };

      if (comparisonData && comparisonData[index]) {
        const compBusiness = similarBusinesses.find(b => b.business_id === comparisonBusinessId);
        chartItem[compBusiness?.business_name || 'Comparison'] = comparisonData[index].count;
      }

      return chartItem;
    });
  };

  const getComparisonBusinessName = () => {
    const business = similarBusinesses.find(b => b.business_id === comparisonBusinessId);
    return business?.business_name || 'Comparison';
  };

  const sortedBusinesses = similarBusinesses
    .filter(business => business && business.business_id && business.business_name)
    .sort((a, b) => a.business_name.localeCompare(b.business_name));

  const selectedBusiness = sortedBusinesses.find(b => b.business_id === comparisonBusinessId);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading radar charts</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button 
            onClick={() => {
              lastFetchParamsRef.current = '';
              fetchRadarData();
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.primary || !data.primary.overallTopics || data.primary.overallTopics.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No data available</p>
          <button 
            onClick={() => {
              lastFetchParamsRef.current = '';
              fetchRadarData();
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const overallTopicsData = formatChartData(
    data.primary.overallTopics,
    data.comparison?.overallTopics
  );

  const cardAttributesData = formatChartData(
    data.primary.cardAttributes,
    data.comparison?.cardAttributes
  );

  const spendingScenariosData = formatChartData(
    data.primary.spendingScenarios,
    data.comparison?.spendingScenarios
  );

  return (
    <div className="space-y-8">
      {/* Custom Comparison Selector Dropdown */}
      {similarBusinesses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Compare with:
            </label>
            <div className="relative flex-1 max-w-xs" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedBusiness ? selectedBusiness.business_name : 'No comparison'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setComparisonBusinessId(null);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 ${!comparisonBusinessId ? 'bg-blue-100 text-blue-700' : 'text-gray-900'}`}
                  >
                    No comparison
                  </button>
                  {sortedBusinesses.map((business) => (
                    <button
                      key={business.business_id}
                      onClick={() => {
                        setComparisonBusinessId(business.business_id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-blue-50 ${
                        comparisonBusinessId === business.business_id ? 'bg-blue-100 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      {business.business_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overall Topics Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Topics</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart 
            data={overallTopicsData}
            onClick={(data: any) => {
              if (data && data.activeLabel) {
                handleRadarClick(data.activeLabel, 'overall');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} tick={{ fontSize: 10 }} />
            <Radar
              name={businessName}
              dataKey={businessName}
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.5}
            />
            {data.comparison && (
              <Radar
                name={getComparisonBusinessName()}
                dataKey={getComparisonBusinessName()}
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.5}
              />
            )}
            <Legend />
            <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Card Attributes Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Attribute Topics</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart 
            data={cardAttributesData}
            onClick={(data: any) => {
              if (data && data.activeLabel) {
                handleRadarClick(data.activeLabel, 'attributes');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} tick={{ fontSize: 10 }} />
            <Radar
              name={businessName}
              dataKey={businessName}
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.5}
            />
            {data.comparison && (
              <Radar
                name={getComparisonBusinessName()}
                dataKey={getComparisonBusinessName()}
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.5}
              />
            )}
            <Legend />
            <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending Scenarios Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Scenarios</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart 
            data={spendingScenariosData}
            onClick={(data: any) => {
              if (data && data.activeLabel) {
                handleRadarClick(data.activeLabel, 'scenarios');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} tick={{ fontSize: 10 }} />
            <Radar
              name={businessName}
              dataKey={businessName}
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.5}
            />
            {data.comparison && (
              <Radar
                name={getComparisonBusinessName()}
                dataKey={getComparisonBusinessName()}
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.5}
              />
            )}
            <Legend />
            <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RadarChartView;