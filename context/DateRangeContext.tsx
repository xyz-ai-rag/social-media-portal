'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo
} from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type AggregationType = 'daily' | 'weekly' | 'monthly';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
  aggregationType: AggregationType;
}

interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  updateDateRange: (preset: string, customStartDate?: string, customEndDate?: string) => void;
}

// Helper functions to format dates with proper time
function setStartOfDay(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "yyyy-MM-dd'T'00:00:00.000XXX");
}

function setEndOfDay(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "yyyy-MM-dd'T'23:59:59.999XXX");
}

// Create the context
const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const DATE_PRESETS = {
  yesterday: {
    label: 'Yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      return {
        startDate: setStartOfDay(yesterdayStr),
        endDate: setEndOfDay(yesterdayStr),
        label: 'Yesterday',
        aggregationType: 'daily' as AggregationType
      };
    }
  },
  last7Days: {
    label: 'Last 7 days',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      const start = subDays(yesterday, 6); // 7 days ending with yesterday
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(yesterday, 'yyyy-MM-dd');
      return {
        startDate: setStartOfDay(startStr),
        endDate: setEndOfDay(endStr),
        label: 'Last 7 days',
        aggregationType: 'daily' as AggregationType
      };
    }
  },
  last30Days: {
    label: 'Last 30 days',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      const start = subDays(yesterday, 29); // 30 days ending with yesterday
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(yesterday, 'yyyy-MM-dd');
      return {
        startDate: setStartOfDay(startStr),
        endDate: setEndOfDay(endStr),
        label: 'Last 30 days',
        aggregationType: 'daily' as AggregationType
      };
    }
  },
  thisMonth: {
    label: 'This month',
    getRange: () => {
      const today = new Date();
      const monthStart = startOfMonth(today);
      const yesterday = subDays(today, 1);
      const startStr = format(monthStart, 'yyyy-MM-dd');
      const endStr = format(yesterday, 'yyyy-MM-dd');
      return {
        startDate: setStartOfDay(startStr),
        endDate: setEndOfDay(endStr),
        label: 'This month',
        aggregationType: 'daily' as AggregationType
      };
    }
  },
  lastMonth: {
    label: 'Last month',
    getRange: () => {
      const today = new Date();
      const lastMonth = subMonths(today, 1);
      const lastMonthStart = startOfMonth(lastMonth);
      const lastMonthEnd = endOfMonth(lastMonth);
      const startStr = format(lastMonthStart, 'yyyy-MM-dd');
      const endStr = format(lastMonthEnd, 'yyyy-MM-dd');
      return {
        startDate: setStartOfDay(startStr),
        endDate: setEndOfDay(endStr),
        label: 'Last month',
        aggregationType: 'daily' as AggregationType
      };
    }
  },
  custom: {
    label: 'Custom range',
    getRange: (startDate?: string, endDate?: string) => {
      // If no dates provided, default to last 7 days.
      if (!startDate || !endDate) {
        return DATE_PRESETS.last7Days.getRange();
      }
      
      let aggregationType: AggregationType = 'daily';
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 60) {
        aggregationType = 'daily';
      } else if (diffDays <= 180) {
        aggregationType = 'weekly';
      } else {
        aggregationType = 'monthly';
      }
      
      return {
        startDate: setStartOfDay(startDate),
        endDate: setEndOfDay(endDate),
        label: 'Custom range',
        aggregationType
      };
    }
  }
};

interface DateRangeProviderProps {
  children: ReactNode;
}

export function DateRangeProvider({ children }: DateRangeProviderProps) {
  // Initialize with Last 7 Days as default (computed only once on mount)
  const initialRange = useMemo(() => DATE_PRESETS.last7Days.getRange(), []);
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  // Wrap updateDateRange with useCallback and only update if values change.
  const updateDateRange = useCallback((preset: string, customStartDate?: string, customEndDate?: string) => {
    let newRange: DateRange;
    if (preset === 'custom' && customStartDate && customEndDate) {
      newRange = DATE_PRESETS.custom.getRange(customStartDate, customEndDate);
    } else if (preset in DATE_PRESETS) {
      const presetKey = preset as keyof typeof DATE_PRESETS;
      newRange = DATE_PRESETS[presetKey].getRange();
    } else {
      return;
    }
    // Update only if the range values are actually different from current state
    setDateRange(prev => {
      if (
        prev.startDate === newRange.startDate &&
        prev.endDate === newRange.endDate &&
        prev.aggregationType === newRange.aggregationType &&
        prev.label === newRange.label
      ) {
        return prev;
      }
      return newRange;
    });
  }, []);

  // Memoize the context value to avoid unnecessary re-renders.
  const value = useMemo(() => ({
    dateRange,
    setDateRange,
    updateDateRange
  }), [dateRange, updateDateRange]);

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
