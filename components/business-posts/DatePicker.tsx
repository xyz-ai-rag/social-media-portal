import React, { useState, useEffect } from 'react';
import { TextInput, Button } from 'flowbite-react';

interface DatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (date: string) => void;
  max?: string;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  max,
  disabled = false
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    return value ? new Date(value) : new Date();
  });
  const [inputValue, setInputValue] = useState(value || '');
  
  // Update internal state when external value changes
  useEffect(() => {
    setInputValue(value || '');
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  // Generate days for the current month view
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay() || 7; // Convert Sunday from 0 to 7
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek - 1; // For Monday start
    
    // Calculate total days to show
    const totalDays = 42; // 6 rows of 7 days
    
    // Generate calendar array
    const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    
    // Add days from previous month
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    
    for (let i = prevMonthDays - daysFromPrevMonth + 1; i <= prevMonthDays; i++) {
      calendarDays.push({
        date: new Date(year, month - 1, i),
        isCurrentMonth: false
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      calendarDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Add days from next month
    const remainingDays = totalDays - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return calendarDays;
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Format date for input display (dd/mm/yyyy)
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };
  
  // Parse display date (dd/mm/yyyy) to ISO format (yyyy-mm-dd)
  const parseDisplayDate = (displayDate: string): string => {
    if (!displayDate) return '';
    
    // Check if it's already in ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
      return displayDate;
    }
    
    // Parse dd/mm/yyyy format
    const parts = displayDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return formatDate(date);
      }
    }
    
    return '';
  };
  
  // Handle clicking on a day in the calendar
  const handleDayClick = (day: { date: Date; isCurrentMonth: boolean }) => {
    const newDate = formatDate(day.date);
    
    // Check if the selected date is beyond the max date
    if (max && newDate > max) {
      onChange(max);
      setInputValue(formatDateForDisplay(max));
    } else {
      onChange(newDate);
      setInputValue(formatDateForDisplay(newDate));
    }
    
    setShowCalendar(false);
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };
  
  // Handle input blur - convert to proper date format
  const handleInputBlur = () => {
    const parsedDate = parseDisplayDate(inputValue);
    if (parsedDate) {
      // Check if the parsed date is beyond max
      if (max && parsedDate > max) {
        onChange(max);
        setInputValue(formatDateForDisplay(max));
      } else {
        onChange(parsedDate);
        setInputValue(formatDateForDisplay(parsedDate));
      }
    } else {
      // Invalid date, revert to previous value
      setInputValue(formatDateForDisplay(value));
    }
  };
  
  // Handle keydown to submit on enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };
  
  // Get the localized month name
  const getMonthName = (date: Date): string => {
    return date.toLocaleString('default', { month: 'long' });
  };
  
  // Clear the date
  const handleClear = () => {
    onChange('');
    setInputValue('');
    setShowCalendar(false);
  };
  
  // Set to today
  const handleToday = () => {
    const today = formatDate(new Date());
    if (max && today > max) {
      onChange(max);
      setInputValue(formatDateForDisplay(max));
    } else {
      onChange(today);
      setInputValue(formatDateForDisplay(today));
    }
    setShowCalendar(false);
  };
  
  // Calculate if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  
  // Calculate if a date is the selected date
  const isSelected = (date: Date): boolean => {
    if (!value) return false;
    
    const selectedDate = new Date(value);
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };
  
  // Calculate if a date is beyond the max date
  const isDisabled = (date: Date): boolean => {
    if (!max) return false;
    
    const maxDate = new Date(max);
    return date > maxDate;
  };

  return (
    <div className="flex items-center relative">
      <span className="text-sm text-gray-500 mr-2">{label}</span>
      <div className="relative">
        <TextInput
          type="text"
          id={id}
          placeholder="dd/mm/yyyy"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          onFocus={() => setShowCalendar(true)}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 flex items-center bg-transparent border-0 text-gray-500"
          onClick={() => setShowCalendar(!showCalendar)}
          disabled={disabled}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </button>
        
        {showCalendar && (
          <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg p-4 w-64">
            {/* Month and year selector */}
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold">
                {getMonthName(currentMonth)} {currentMonth.getFullYear()}
              </div>
              <div className="flex space-x-2">
                <button 
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={goToPreviousMonth}
                >
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={goToNextMonth}
                >
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Days of the week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, index) => (
                <button
                  key={index}
                  className={`
                    h-8 w-8 text-center text-sm rounded-full
                    ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                    ${isToday(day.date) ? 'border border-blue-300' : ''}
                    ${isSelected(day.date) ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'}
                    ${isDisabled(day.date) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  onClick={() => !isDisabled(day.date) && handleDayClick(day)}
                  disabled={isDisabled(day.date)}
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
            
            {/* Footer actions */}
            <div className="flex justify-between mt-4">
              <button
                className="text-blue-500 text-sm hover:underline"
                onClick={handleClear}
              >
                Clear
              </button>
              
              <button
                className="text-gray-500 text-sm hover:underline"
                onClick={handleToday}
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatePicker;