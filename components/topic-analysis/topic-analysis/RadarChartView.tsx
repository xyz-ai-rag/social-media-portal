"use client"
import { FC, useEffect, useState } from 'react';
import { 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis, 
    ResponsiveContainer, 
    Legend, 
    Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';

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
  const [data, setData] = useState<RadarChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisonBusinessId, setComparisonBusinessId] = useState<string | null>(null);

  useEffect(() => {
    fetchRadarData();
  }, [businessId, comparisonBusinessId, startDate, endDate, language, platform]);

  const fetchRadarData = async () => {
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
      setData(result);
    } catch (err: any) {
      console.error('Error fetching radar chart data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = (primaryData: RadarChartData[], comparisonData?: RadarChartData[]) => {
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
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">No data available</p>
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
      {/* Comparison Selector */}
      {similarBusinesses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Compare with:
            </label>
            <select
              value={comparisonBusinessId || ''}
              onChange={(e) => setComparisonBusinessId(e.target.value || null)}
              className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No comparison</option>
              {similarBusinesses.map((business) => (
                <option key={business.business_id} value={business.business_id}>
                  {business.business_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Overall Topics Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Topics</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={overallTopicsData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle = {90}tick={{ fontSize: 10 }} />
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
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Card Attributes Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Attribute Topics</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={cardAttributesData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle = {90}tick={{ fontSize: 10 }} />
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
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending Scenarios Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Scenarios</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={spendingScenariosData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle = {90}tick={{ fontSize: 10 }} />
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
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RadarChartView;