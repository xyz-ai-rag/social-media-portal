import React, { useEffect, useState } from "react";
import { useDateRange } from "@/context/DateRangeContext";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";

interface CityData {
  city: string;
  count: number;
  percentage: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface TopCitiesChartProps {
  clientId: string;
  businessId: string;
}

const TopCitiesChart = ({ clientId, businessId }: TopCitiesChartProps) => {
  const [cities, setCities] = useState<CityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  // Get the date range from context
  const { dateRange } = useDateRange();

  // Process the start and end dates using helper functions
  const startDateProcessed = setStartOfDay(dateRange.startDate);
  const endDateProcessed = setEndOfDay(dateRange.endDate);

  // Format date manually
  const formatDate = (date: string) => {
    const d = new Date(date);
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  };

  useEffect(() => {
    async function fetchCityData() {
      try {
        setIsLoading(true);
        const url = `/api/charts/top-cities?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`API request failed with status ${res.status}`);
        }
        const data = await res.json();
        
        setCities(data);
      } catch (error) {
        console.error("Error fetching city data:", error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCityData();
  }, [businessId, startDateProcessed, endDateProcessed]);

  // Generate bubble size based on percentage
  const getBubbleSize = (percentage: number) => {
    return Math.max(40, Math.min(90, 40 + percentage * 2.5));
  };

  // Generate shades of blue based on index
  const getColor = (index: number) => {
    const baseColors = [
      'rgba(66, 133, 244, 0.9)',   // Primary blue
      'rgba(52, 168, 235, 0.9)',   // Light blue
      'rgba(30, 144, 255, 0.9)',   // Dodger blue
      'rgba(0, 119, 182, 0.9)',    // Strong blue
      'rgba(65, 105, 225, 0.9)',   // Royal blue
      'rgba(100, 149, 237, 0.9)',  // Cornflower blue
      'rgba(70, 130, 180, 0.9)',   // Steel blue
      'rgba(106, 90, 205, 0.9)',   // Slate blue with purple tint
      'rgba(72, 61, 139, 0.9)',    // Dark slate blue
      'rgba(25, 25, 112, 0.9)',    // Midnight blue
    ];
    
    return index < baseColors.length ? baseColors[index] : baseColors[index % baseColors.length];
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center h-64">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full overflow-hidden">
      <h2 className="text-base font-medium text-gray-800 mb-2">
        Top Cities
      </h2>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formatDate(dateRange.startDate)} to{" "}
        {formatDate(dateRange.endDate)}
      </div>

      {cities.length === 0 ? (
        <div className="flex justify-center items-center h-64">No city data found.</div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Circular Bubble Chart */}
          <div className="relative h-64 w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
            <div className="relative w-full h-full p-2">
              {cities.slice(0, 10).map((city, index) => {
                // Calculate position in a circular arrangement
                const totalItems = Math.min(cities.length, 10);
                const angle = (index / totalItems) * 2 * Math.PI;
                
                // Radius of the circular arrangement - smaller for more items
                const radius = totalItems <= 6 ? 35 : 30;
                
                // Calculate position, with central offset
                const x = 50 + radius * Math.cos(angle);
                const y = 50 + radius * Math.sin(angle);
                
                const size = getBubbleSize(city.percentage);
                const fontSize = Math.max(10, Math.min(14, 10 + city.percentage * 0.2));
                
                return (
                  <div
                    key={index}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-lg"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: getColor(index),
                      zIndex: 10 - index,
                    }}
                    onClick={() => setSelectedCity(city)}
                  >
                    <div className="text-center text-white">
                      <div 
                        className="font-bold leading-tight"
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {index + 1}
                      </div>
                      <div 
                        className="text-white text-opacity-90 leading-tight"
                        style={{ fontSize: `${Math.max(8, fontSize - 4)}px` }}
                      >
                        {city.city}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Decorative center circle */}
              <div 
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-white bg-opacity-20"
                style={{ width: '25%', height: '25%', zIndex: 1 }}
              />
              
              {/* Decorative rings */}
              <div 
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-200 border-opacity-40"
                style={{ width: '50%', height: '50%', zIndex: 1 }}
              />
              <div 
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200 border-opacity-30"
                style={{ width: '75%', height: '75%', zIndex: 1 }}
              />
            </div>
            
            {/* Selected city info popup */}
            {selectedCity && (
              <div className="absolute bottom-2 right-2 bg-white p-3 rounded-lg shadow-lg z-20 max-w-xs">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">{selectedCity.city}</h3>
                  <button 
                    className="text-gray-500 hover:text-gray-700 ml-2"
                    onClick={() => setSelectedCity(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="text-sm mt-1 text-gray-600">
                  <div>Posts: <span className="font-medium text-gray-900">{selectedCity.count}</span></div>
                  <div>Percentage: <span className="font-medium text-gray-900">{selectedCity.percentage}%</span></div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default TopCitiesChart;