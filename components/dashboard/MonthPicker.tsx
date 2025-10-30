"use client";
import React, { useState, useEffect } from "react";
import { constructVercelURL } from "@/utils/generateURL";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthPickerProps {
  businessId: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

interface AvailableMonth {
  month: string;
  post_count: number;
}

const MonthPicker: React.FC<MonthPickerProps> = ({
  businessId,
  selectedMonth,
  onMonthChange,
}) => {
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch available months
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      if (!businessId) return;

      setIsLoading(true);
      try {
        const response = await fetch(
          constructVercelURL(
            `/api/businesses/credit-cards/getMonthlySummary?businessId=${businessId}`
          )
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.available_months) {
            setAvailableMonths(result.data.available_months);
            
            // Check if there's a saved month in localStorage first
            const savedMonth = localStorage.getItem(`selected_month_${businessId}`);
            
            if (savedMonth && result.data.available_months.some((m: AvailableMonth) => m.month === savedMonth)) {
              // If saved month exists and is valid, use it
              if (selectedMonth !== savedMonth) {
                onMonthChange(savedMonth);
              }
            } else if (!selectedMonth && result.data.available_months.length > 0) {
              // If no month is selected and no saved month, select the most recent
              onMonthChange(result.data.available_months[0].month);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching available months:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableMonths();
  }, [businessId]);

  // Format month for display
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  // Navigate to previous month
  const handlePrevMonth = () => {
    const currentIndex = availableMonths.findIndex((m) => m.month === selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      const newMonth = availableMonths[currentIndex + 1].month;
      onMonthChange(newMonth);
      // Save to localStorage
      localStorage.setItem(`selected_month_${businessId}`, newMonth);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const currentIndex = availableMonths.findIndex((m) => m.month === selectedMonth);
    if (currentIndex > 0) {
      const newMonth = availableMonths[currentIndex - 1].month;
      onMonthChange(newMonth);
      // Save to localStorage
      localStorage.setItem(`selected_month_${businessId}`, newMonth);
    }
  };

  // Handle month selection from dropdown
  const handleMonthSelect = (month: string) => {
    onMonthChange(month);
    setIsOpen(false);
    // Save to localStorage
    localStorage.setItem(`selected_month_${businessId}`, month);
  };

  // Check if we can navigate
  const canGoPrev = () => {
    const currentIndex = availableMonths.findIndex((m) => m.month === selectedMonth);
    return currentIndex < availableMonths.length - 1;
  };

  const canGoNext = () => {
    const currentIndex = availableMonths.findIndex((m) => m.month === selectedMonth);
    return currentIndex > 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border rounded-md p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading months...</span>
      </div>
    );
  }

  if (availableMonths.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No monthly summaries available
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Month Navigation */}
      <div className="flex items-center gap-2 border rounded-md bg-white">
        {/* Previous Month Button */}
        <button
          onClick={handlePrevMonth}
          disabled={!canGoPrev()}
          className={`p-2 rounded-l-md transition-colors ${
            canGoPrev()
              ? "hover:bg-gray-100 text-gray-700"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Current Month Display (Dropdown Trigger) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 min-w-[200px] justify-center hover:bg-gray-50 transition-colors"
        >
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">
            {formatMonth(selectedMonth)}
          </span>
        </button>

        {/* Next Month Button */}
        <button
          onClick={handleNextMonth}
          disabled={!canGoNext()}
          className={`p-2 rounded-r-md transition-colors ${
            canGoNext()
              ? "hover:bg-gray-100 text-gray-700"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown List */}
          <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                Available Months
              </div>
              {availableMonths.map((month) => (
                <button
                  key={month.month}
                  onClick={() => handleMonthSelect(month.month)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    month.month === selectedMonth
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{formatMonth(month.month)}</span>
                    <span className="text-xs text-gray-500">
                      {month.post_count} posts
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthPicker;