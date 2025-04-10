'use client';

import { format, parse, differenceInDays, subDays, eachDayOfInterval } from 'date-fns';

export interface ChartDataPoint {
  day: string;
  label: string;
  currentValue: number;
  previousValue: number;
}

export interface ChartResult {
  chartData: ChartDataPoint[];
  totalPosts: number;
  changePercentage: {
    value: string;
    isPositive: boolean;
  };
}

/**
 * Calculates comparison period dates based on the current period dates
 */
export function calculateComparisonPeriod(
    currentStartDate: string,
    currentEndDate: string
  ): { startDate: string; endDate: string } {
    const start = new Date(currentStartDate);
    const end = new Date(currentEndDate);
    
    // Calculate the length of the current period (inclusive)
    const daysDiff = differenceInDays(end, start) + 1;
    
    // Calculate previous period: subtract the same number of days from the current start date
    const comparisonStartDate = subDays(start, daysDiff);
    
    return {
      startDate: format(comparisonStartDate, "yyyy-MM-dd '00:00:00'"),
      // Note: the current end date is simply reformatted, not recalculated.
      endDate: format(end, "yyyy-MM-dd '23:59:59'")
    };
  }
/**
 * Fetches grouped bar chart data from the API
 */
export async function fetchGroupedBarChartData(
  clientId: string,
  businessId: string,
  currentStartDate: string,
  currentEndDate: string,
  comparisonStartDate: string,
  comparisonEndDate: string,
  aggregationType: string
): Promise<ChartResult> {
  try {
    // In a real app, you'd make an API call here
    // For example:
    // const response = await fetch(`/api/charts/grouped-bar?clientId=${clientId}&businessId=${businessId}&currentStartDate=${currentStartDate}&currentEndDate=${currentEndDate}&comparisonStartDate=${comparisonStartDate}&comparisonEndDate=${comparisonEndDate}&aggregationType=${aggregationType}`);
    // const data = await response.json();
    // return data;
    
    // For now, we'll simulate the API response with mock data
    return await simulateApiResponse(
      currentStartDate,
      currentEndDate,
      comparisonStartDate,
      comparisonEndDate,
      aggregationType
    );
  } catch (error) {
    console.error('Error fetching grouped bar chart data:', error);
    throw error;
  }
}

/**
 * Simulates an API response with mock data
 * (Replace this with actual API call in production)
 */
async function simulateApiResponse(
  currentStartDate: string,
  currentEndDate: string,
  comparisonStartDate: string,
  comparisonEndDate: string,
  aggregationType: string
): Promise<ChartResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const currentStart = new Date(currentStartDate);
  const currentEnd = new Date(currentEndDate);
  const comparisonStart = new Date(comparisonStartDate);
  const comparisonEnd = new Date(comparisonEndDate);
  
  // Generate days or periods based on aggregation type
  let chartData: ChartDataPoint[] = [];
  let currentTotal = 0;
  let previousTotal = 0;
  
  if (aggregationType === 'daily') {
    // Get all days in the current period
    const daysInCurrentPeriod = eachDayOfInterval({ 
      start: currentStart, 
      end: currentEnd 
    });
    
    // Get all days in the comparison period
    const daysInComparisonPeriod = eachDayOfInterval({ 
      start: comparisonStart, 
      end: comparisonEnd 
    });
    
    // Generate data for each day
    chartData = daysInCurrentPeriod.map((date, index) => {
      // Generate random value for current period (between 5-20)
      const currentValue = Math.floor(Math.random() * 15) + 5;
      currentTotal += currentValue;
      
      // Generate random value for comparison period (between 3-18)
      let previousValue = 0;
      if (index < daysInComparisonPeriod.length) {
        previousValue = Math.floor(Math.random() * 15) + 3;
        previousTotal += previousValue;
      }
      
      // Format label based on date
      const day = format(date, 'dd');
      const label = format(date, 'dd MMM');
      
      return {
        day,
        label,
        currentValue,
        previousValue
      };
    });
  } else if (aggregationType === 'weekly') {
    // Mock weekly data with 4 weeks
    for (let i = 0; i < 4; i++) {
      const currentValue = Math.floor(Math.random() * 60) + 20;
      const previousValue = Math.floor(Math.random() * 60) + 15;
      
      currentTotal += currentValue;
      previousTotal += previousValue;
      
      chartData.push({
        day: `W${i + 1}`,
        label: `Week ${i + 1}`,
        currentValue,
        previousValue
      });
    }
  } else if (aggregationType === 'monthly') {
    // Mock monthly data with months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    for (let i = 0; i < 3; i++) {
      const currentValue = Math.floor(Math.random() * 200) + 50;
      const previousValue = Math.floor(Math.random() * 200) + 40;
      
      currentTotal += currentValue;
      previousTotal += previousValue;
      
      chartData.push({
        day: months[i],
        label: months[i],
        currentValue,
        previousValue
      });
    }
  }
  
  // Calculate percent change
  const percentChange = previousTotal > 0 
    ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)
    : '0.0';
  
  const isPositive = currentTotal >= previousTotal;
  
  return {
    chartData,
    totalPosts: currentTotal,
    changePercentage: {
      value: `${Math.abs(parseFloat(percentChange))}%`,
      isPositive
    }
  };
}