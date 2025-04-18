"use client";

import { FC, useState, useEffect, ReactNode, useMemo } from "react";
import { FaSync } from "react-icons/fa";
import { FaEarthAfrica } from "react-icons/fa6";
import {
  Table,
  TextInput,
  Select,
  Spinner,
  Badge,
  Button,
  Alert,
} from "flowbite-react";
import { useAuth } from "@/context/AuthContext";
import DatePicker from "./DatePicker";
import PreviewModal from "./PreviewModal";
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

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

interface SharedPostListProps {
  title: string | ReactNode;
  clientId?: string;
  businessId?: string;
  competitorId?: string;
  additionalFilters?: ReactNode;
  postCardComponent: FC<any>;
  initialData?: PostData[];
  isLoading?: boolean;
  error?: string | null;
  appliedFilters?: AppliedFilters | null;
  pagination?: PaginationProps;
  onFilterChange?: (filters: any) => void;
  onRefresh?: () => void;
  openModal?: (item: any) => void;
}

const SharedPostList: FC<SharedPostListProps> = ({
  title,
  clientId,
  businessId,
  competitorId,
  additionalFilters,
  postCardComponent: PostCardComponent,
  initialData = [],
  isLoading = false,
  error = null,
  appliedFilters = null,
  pagination,
  onFilterChange,
  onRefresh,
  openModal,
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

  // Use external pagination if provided, or local state
  const currentPage = pagination?.currentPage || 1;
  const totalPages = pagination?.totalPages || 1;

  // List Data
  const [listData, setListData] = useState<PostData[]>(initialData);

  // State for controlling the PreviewModal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRowData, setPreviewRowData] = useState<PostData | null>(null);
  // Update list data when initialData changes
  useEffect(() => {
    setListData(initialData);
  }, [initialData]);

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
  const relevanceData = ["50%", "60%", "70%", "80%", "90%", "100%"];

  const handleRelevance = (data: string) => {
    setRelevance(data);
    if (onFilterChange) {
      onFilterChange({ relevance: data });
    }
  };

  // Select criticism Data
  const criticismData = ["Has Criticism", "No Criticism"];

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

  const handlePageChange = (page: number) => {
    if (pagination?.onPageChange) {
      pagination.onPageChange(page);
    }
  };

  const sortPostsByDate = (data: string) => {
    // If we're using server-side sorting, inform the parent
    if (onFilterChange) {
      onFilterChange({ sortOrder: data });
      setSortOrder(data);
      return;
    }

    // Otherwise, sort locally
    const sortedPosts = [...listData].sort((a, b) =>
      data === "asc"
        ? new Date(a.date as string).getTime() -
          new Date(b.date as string).getTime()
        : new Date(b.date as string).getTime() -
          new Date(a.date as string).getTime()
    );
    setListData(sortedPosts);
    setSortOrder(data);
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
  const openPreviewModal = (row: PostData) => {
    setPreviewRowData(row);
    setIsPreviewOpen(true);
  };

  const closePreviewModal = () => {
    setIsPreviewOpen(false);
    setPreviewRowData(null);
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
          <option value="">All Platforms</option>
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
          <option value="">All Sentiments</option>
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
          <option value="">All Relevance</option>
          {relevanceData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
        <Select
          id="criticism"
          value={criticism}
          onChange={(e) => handleCriticism(e.target.value)}
          disabled={isLoading}
        >
          <option value="">All Criticism</option>
          {criticismData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
        <div className="relative flex-grow">
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

      {/* Table */}
      <div className="mt-6 bg-white rounded shadow">
        <Table hoverable className="w-full table-fixed">
          <Table.Head>
            <Table.HeadCell className="flex items-center w-24">
              Date
              <div className="pl-2 flex flex-col">
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 6 4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => sortPostsByDate("asc")}
                  className="cursor-pointer mb-1"
                >
                  <path
                    d="M1.08711 4L4.91289 4C5.34007 4 5.57052 3.49894 5.29252 3.1746L3.37963 0.942899C3.18008 0.710094 2.81992 0.710094 2.62037 0.942899L0.707482 3.1746C0.429479 3.49894 0.659934 4 1.08711 4Z"
                    fill={sortOrder === "asc" ? "#5D5FEF" : "#A5A6F6"}
                  />
                </svg>
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 6 4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => sortPostsByDate("desc")}
                  className="cursor-pointer"
                >
                  <path
                    d="M4.91289 0H1.08711C0.659934 0 0.429479 0.501059 0.707482 0.825396L2.62037 3.0571C2.81992 3.28991 3.18008 3.28991 3.37963 3.0571L5.29252 0.825396C5.57052 0.501059 5.34007 0 4.91289 0Z"
                    fill={sortOrder === "desc" ? "#5D5FEF" : "#A5A6F6"}
                  />
                </svg>
              </div>
            </Table.HeadCell>
            <Table.HeadCell className="w-24">Platform</Table.HeadCell>
            <Table.HeadCell className="w-24">Nickname</Table.HeadCell>
            <Table.HeadCell className="w-64">Post</Table.HeadCell>
            <Table.HeadCell className="w-48">Taglist</Table.HeadCell>
            <Table.HeadCell className="w-24">View Original</Table.HeadCell>
            <Table.HeadCell className="w-24">Relevance</Table.HeadCell>
            <Table.HeadCell className="w-24">Sentiment</Table.HeadCell>
            {/* <Table.HeadCell className="w-24">Criticism</Table.HeadCell>
            <Table.HeadCell className="w-16">URL</Table.HeadCell> */}
          </Table.Head>
          <Table.Body className="divide-y">
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={10} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center">
                    <Spinner size="xl" color="purple" />
                    <p className="mt-2 text-gray-500">Loading posts...</p>
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : listData.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={10} className="text-center py-10">
                  <p className="text-gray-500">
                    No posts found. Try adjusting your filters.
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              listData.map((item, index) => {
                return (
                  <Table.Row
                    key={item.id || index}
                    onClick={() => openPreviewModal(item)}
                    className="cursor-pointer"
                  >
                    <Table.Cell className="text-[#DD9A19]">
                      {item.showDate}
                    </Table.Cell>
                    <Table.Cell>{item.platform}</Table.Cell>
                    <Table.Cell>{item.nickname}</Table.Cell>

                    {/* Updated Post Cell with Multi-line Support */}
                    <Table.Cell className="max-w-64 w-64">
                      <div className="line-clamp-3 text-sm break-words">
                        {item.post}
                      </div>
                    </Table.Cell>

                    {/* Updated Taglist Cell with Multi-line Support */}
                    <Table.Cell className="max-w-48 w-48">
                      <div className="line-clamp-2 text-sm break-words">
                        {item.taglist}
                      </div>
                    </Table.Cell>

                    <Table.Cell className="flex justify-center items-center">
                      <button
                        className="text-white text-xs bg-[#5D5FEF] shadow-sm w-[69px] h-[32px] justify-center items-center border rounded"
                        onClick={() => (openModal ? openModal(item) : null)}
                      >
                        Original
                      </button>
                    </Table.Cell>
                    <Table.Cell>{item.relvance}%</Table.Cell>
                    <Table.Cell>{item.sentiment}</Table.Cell>
                    <Table.Cell>
                      {item.hasCriticism ? (
                        <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-red-900 dark:text-red-300">
                          Criticism
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-green-900 dark:text-green-300">
                          All Well
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="flex justify-center items-center">
                      {item.url && item.url !== "#" ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaEarthAfrica className="cursor-pointer w-6 h-6 text-[#5D5FEF]"></FaEarthAfrica>
                        </a>
                      ) : (
                        <FaEarthAfrica className="w-6 h-6 text-gray-300"></FaEarthAfrica>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex justify-center w-full h-auto mt-3">
          <div className="flex items-center space-x-4">
            <span className="py-2">Page</span>
            {/* Left Arrow */}
            <button
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlePageChange(currentPage - 1)}
              className={`bg-transparent text-white p-2 ${
                currentPage <= 1 || isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <svg
                width="18"
                height="20"
                viewBox="0 0 4 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.5 4.91289L3.5 1.08711C3.5 0.659934 2.99894 0.429479 2.6746 0.707482L0.4429 2.62037C0.210094 2.81992 0.210094 3.18008 0.4429 3.37963L2.6746 5.29252C2.99894 5.57052 3.5 5.34007 3.5 4.91289Z"
                  fill={currentPage <= 1 || isLoading ? "#A5A6F6" : "#5D5FEF"}
                />
              </svg>
            </button>

            {/* Current Page */}
            <div className="bg-[#5D5FEF] text-white rounded-full w-10 h-10 text-[20px] text-center py-1">
              {currentPage}
            </div>

            {/* Right Arrow */}
            <button
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => handlePageChange(currentPage + 1)}
              className={`bg-transparent text-white p-2 ${
                currentPage >= totalPages || isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <svg
                width="18"
                height="20"
                viewBox="0 0 4 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.5 1.08711L0.5 4.91289C0.5 5.34007 1.00106 5.57052 1.3254 5.29252L3.5571 3.37963C3.78991 3.18008 3.78991 2.81992 3.5571 2.62037L1.3254 0.707482C1.00106 0.429479 0.5 0.659934 0.5 1.08711Z"
                  fill={
                    currentPage >= totalPages || isLoading
                      ? "#A5A6F6"
                      : "#5D5FEF"
                  }
                />
              </svg>
            </button>

            {/* Page Select */}
            {totalPages > 1 && (
              <Select
                id="pageSelect"
                onChange={(e) => handlePageChange(parseInt(e.target.value))}
                value={currentPage.toString()}
                disabled={isLoading}
                className="w-16"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i} value={(i + 1).toString()}>
                    {i + 1}
                  </option>
                ))}
              </Select>
            )}

            {/* Page info */}
            <span className="text-sm text-gray-500">
              of {totalPages} {totalPages === 1 ? "page" : "pages"}
            </span>
          </div>
        </div>
      )}
      {/* Render the PreviewModal when a row is clicked */}
      {isPreviewOpen && previewRowData && (
        <PreviewModal
          isOpen={isPreviewOpen}
          onClose={closePreviewModal}
          rowData={previewRowData}
          headerTitle={previewRowData.englishTitle || "English Post Preview"}
        />
      )}
    </div>
  );
};

export default SharedPostList;
