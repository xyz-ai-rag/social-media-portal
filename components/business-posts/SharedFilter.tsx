"use client";

import { FC, useState, useEffect, ReactNode, useMemo } from "react";
import { FaSync } from "react-icons/fa";
import {
  TextInput,
  Select,
  Badge,
  Button,
  Alert,
} from "flowbite-react";
import DatePicker from "./DatePicker";

// Base post data structure shared between components
export interface PostData {
  id?: string;
  businessId?: string;
  description?: string; // Original description
  englishDesc?: string; // English description
  post?: string; // Combined (for backward compatibility)
  title?: string; // Original title
  englishTitle?: string; // English title
  displayTitle?: string; // Combined (for display purposes)
  tagList?: string; // Original taglist
  englishTagList?: string; // English taglist
  taglist?: string; // Combined (for backward compatibility)
  date?: string;
  showDate?: string;
  sentiment?: string;
  nickname?: string;
  relvance?: number;
  platform?: string;
  hasCriticism?: boolean;
  url?: string;
  [key: string]: any; // For additional properties
}

interface AppliedFilters {
  startDate: string;
  endDate: string;
  platform: string;
  sentiment: string;
  relevance: string;
  hasCriticism: string;
  search: string;
  sortOrder: string;
}

interface SharedFilterProps {
  title: string | ReactNode;
  clientId?: string;
  businessId?: string;
  competitorId?: string;
  additionalFilters?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  appliedFilters?: AppliedFilters | null;
  onFilterChange?: (filters: any) => void;
  onRefresh?: () => void;
  onSortOrderChange?: (sortOrder: string) => void;
}

const SharedFilter: FC<SharedFilterProps> = ({
  title,
  clientId,
  businessId,
  competitorId,
  additionalFilters,
  isLoading = false,
  error = null,
  appliedFilters = null,
  onFilterChange,
  onRefresh,
  onSortOrderChange,
}) => {
  // Search Value
  const [searchQuery, setSearchQuery] = useState("");
  // Sort Order - default to desc (newest first)
  const [sortOrder, setSortOrder] = useState("desc");

  // Date filters for UI
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Other filters for UI
  const [platform, setPlatform] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [relevance, setRelevance] = useState("");
  const [criticism, setCriticism] = useState("");

  // Calculate yesterday's date for max date restriction
  const yesterday = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }, []);

  // Update UI filter states when appliedFilters changes
  useEffect(() => {
    if (appliedFilters) {
      setStartDate(appliedFilters.startDate || "");
      setEndDate(appliedFilters.endDate || "");
      setPlatform(appliedFilters.platform || "");
      setSentiment(appliedFilters.sentiment || "");
      setRelevance(appliedFilters.relevance || "");
      setCriticism(appliedFilters.hasCriticism || "");
      setSearchQuery(appliedFilters.search || "");
      setSortOrder(appliedFilters.sortOrder || "desc");
    }
  }, [appliedFilters]);

  // Select Platform Data
  const platformData = ["Douyin", "Rednote", "Weibo"];

  const handlePlatform = (data: string) => {
    setPlatform(data);
    if (onFilterChange) {
      onFilterChange({ platform: data });
    }
  };

  // Handle Start Date Change
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (onFilterChange) {
      onFilterChange({ startDate: date });
    }
  };

  // Handle End Date Change
  const handleEndDateChange = (date: string) => {
    // Prevent dates after yesterday
    if (date > yesterday) {
      date = yesterday;
    }

    setEndDate(date);
    if (onFilterChange) {
      onFilterChange({ endDate: date });
    }
  };

  // Select sentiment Data
  const sentimentData = ["Positive", "Negative", "Neutral"];

  const handleSentiment = (data: string) => {
    setSentiment(data);
    if (onFilterChange) {
      onFilterChange({ sentiment: data });
    }
  };

  // Select relevance Data
  const relevanceData = [
    { value: "25%", label: "≥ 25%" },
    { value: "50%", label: "≥ 50%" },
    { value: "75%", label: "≥ 75%" },
  ];

  const handleRelevance = (data: string) => {
    setRelevance(data);
    if (onFilterChange) {
      onFilterChange({ relevance: data });
    }
  };

  // Select criticism Data
  const criticismData = [
    { value: "Has Criticism", label: "Has negative feedback" },
    { value: "No Criticism", label: "No negative feedback" },
  ];

  const handleCriticism = (data: string) => {
    setCriticism(data);
    if (onFilterChange) {
      onFilterChange({ hasCriticism: data });
    }
  };

  const handleSearch = () => {
    if (onFilterChange) {
      onFilterChange({ search: searchQuery });
    }
  };

  const handleSortChange = (data: string) => {
    setSortOrder(data);
    if (onSortOrderChange) {
      onSortOrderChange(data);
    } else if (onFilterChange) {
      onFilterChange({ sortOrder: data });
    }
  };

  // Format date range for display
  const getDateRangeText = () => {
    if (!appliedFilters) return "Recent posts";

    const start = new Date(appliedFilters.startDate);
    const end = new Date(appliedFilters.endDate);

    const formatDate = (date: Date) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${
        months[date.getMonth()]
      } ${date.getDate()}, ${date.getFullYear()}`;
    };

    return `${formatDate(start)} to ${formatDate(end)}`;
  };

  // Handle refresh button click
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // Clear all filters
  const clearFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        platform: "",
        sentiment: "",
        relevance: "",
        hasCriticism: "",
        search: "",
      });
    }
  };

  return (
    <div className="bg-white relative">
      {/* Head */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[34px] font-bold text-[#5D5FEF]">{title}</h1>

        {/* Refresh button */}
        <Button
          color="light"
          pill
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh data"
        >
          <FaSync className={`${isLoading ? "animate-spin" : ""} mr-2`} />
          Refresh
        </Button>
      </div>

      {/* Date Range Display */}
      <div className="mb-4">
        <div className="text-gray-500 text-sm">{getDateRangeText()}</div>
      </div>

      {/* Error message display */}
      {error && (
        <Alert color="failure" className="mb-4">
          <div className="font-medium">Error loading data:</div>
          <div>{error}</div>
          <div className="mt-2">
            <Button size="xs" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        </Alert>
      )}

      {/* First Row Components */}
      <div className="flex flex-wrap gap-4">
        {/* Additional Filters (like Competitor dropdown) */}
        {additionalFilters && (
          <div className="min-w-40">{additionalFilters}</div>
        )}

        <DatePicker
          id="start-date"
          label="Start Date"
          value={startDate}
          onChange={handleStartDateChange}
          max={yesterday}
          disabled={isLoading}
        />

        <DatePicker
          id="end-date"
          label="End Date"
          value={endDate}
          onChange={handleEndDateChange}
          max={yesterday}
          disabled={isLoading}
        />
        <Select
          id="platform"
          value={platform}
          onChange={(e) => handlePlatform(e.target.value)}
          disabled={isLoading}
        >
          <option value="">Platform</option>
          {platformData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
      </div>

      {/* Second Row Components */}
      <div className="flex flex-wrap mt-4 gap-4">
        <Select
          id="sentiment"
          value={sentiment}
          onChange={(e) => handleSentiment(e.target.value)}
          disabled={isLoading}
        >
          <option value="">Sentiment</option>
          {sentimentData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
        <Select
          id="relevance"
          value={relevance}
          onChange={(e) => handleRelevance(e.target.value)}
          disabled={isLoading}
        >
          <option value="">Relevance</option>
          {relevanceData.map((item, index) => {
            return (
              <option key={index} value={item.value}>
                {item.label}
              </option>
            );
          })}
        </Select>
        <Select
          id="criticism"
          value={criticism}
          onChange={(e) => handleCriticism(e.target.value)}
          disabled={isLoading}
        >
          <option value="">Feedback</option>
          {criticismData.map((item, index) => {
            return (
              <option key={index} value={item.value}>
                {item.label}
              </option>
            );
          })}
        </Select>
        {/* Search */}
        <div className="relative w-1/2 max-w-sm">
          <TextInput
            type="text"
            id="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full"
            disabled={isLoading}
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={isLoading}
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {appliedFilters && (
        <div className="flex flex-wrap gap-2 mt-4 items-center">
          {appliedFilters.platform && (
            <Badge color="info" className="text-xs">
              Platform: {appliedFilters.platform}
            </Badge>
          )}
          {appliedFilters.sentiment && (
            <Badge color="info" className="text-xs">
              Sentiment: {appliedFilters.sentiment}
            </Badge>
          )}
          {appliedFilters.relevance && (
            <Badge color="info" className="text-xs">
              Relevance: ≥{appliedFilters.relevance}
            </Badge>
          )}
          {appliedFilters.hasCriticism && (
            <Badge color="info" className="text-xs">
              {appliedFilters.hasCriticism === "true" ||
              appliedFilters.hasCriticism === "Has Criticism"
                ? "Has Criticism"
                : "No Criticism"}
            </Badge>
          )}
          {appliedFilters.search && (
            <Badge color="info" className="text-xs">
              Search: "{appliedFilters.search}"
            </Badge>
          )}
          {(appliedFilters.platform ||
            appliedFilters.sentiment ||
            appliedFilters.relevance ||
            appliedFilters.hasCriticism ||
            appliedFilters.search) && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:underline"
              disabled={isLoading}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SharedFilter;