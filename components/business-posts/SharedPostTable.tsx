"use client";

import { FC, useState, useEffect } from "react";
import { Table, Spinner, Select, Tooltip } from "flowbite-react";
import { PostData } from "./SharedFilter";
import { FaThumbsUp, FaThumbsDown, FaHandPaper } from "react-icons/fa"
import { FaCommentAlt } from "react-icons/fa"

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface SharedPostTableProps {
  listData: PostData[];
  isLoading?: boolean;
  postCardComponent: FC<any>;
  pagination?: PaginationProps;
  sortOrder?: string;
  onSortOrderChange?: (sortOrder: string) => void;
  openModal?: (item: any) => void;
  openPreviewModal?: (item: any) => void;
}

const SharedPostTable: FC<SharedPostTableProps> = ({
  listData = [],
  isLoading = false,
  postCardComponent: PostCardComponent,
  pagination,
  sortOrder = "desc",
  onSortOrderChange,
  openModal,
  openPreviewModal,
}) => {
  // Use external pagination if provided, or local state
  const currentPage = pagination?.currentPage || 1;
  const totalPages = pagination?.totalPages || 1;

  // Handle sort order change
  const handleSortOrderChange = (order: string) => {
    if (onSortOrderChange) {
      onSortOrderChange(order);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (pagination?.onPageChange) {
      pagination.onPageChange(page);
    }
  };
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="mt-6 bg-white rounded shadow overflow-hidden">
      {/* Table */}
      <div className="w-full max-w-[1396px] mx-auto">
        <div className=" overflow-x-auto">
          <Table hoverable className="min-w-[1500px]">
            <Table.Head>
              <Table.HeadCell className="w-32">
                Date
                <div className="pl-2 flex flex-col">
                  {isClient && (
                    <>
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 6 4"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        onClick={() => handleSortOrderChange("asc")}
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
                        onClick={() => handleSortOrderChange("desc")}
                        className="cursor-pointer"
                      >
                        <path
                          d="M4.91289 0H1.08711C0.659934 0 0.429479 0.501059 0.707482 0.825396L2.62037 3.0571C2.81992 3.28991 3.18008 3.28991 3.37963 3.0571L5.29252 0.825396C5.57052 0.501059 5.34007 0 4.91289 0Z"
                          fill={sortOrder === "desc" ? "#5D5FEF" : "#A5A6F6"}
                        />
                      </svg>
                    </>
                  )}
                </div>
              </Table.HeadCell>

              <Table.HeadCell className="w-24 text-center">
                Platform
              </Table.HeadCell>
              <Table.HeadCell className="w-32 text-center">User</Table.HeadCell>
              <Table.HeadCell className="min-w-[450px] max-w-[600px]">
                Post
              </Table.HeadCell>
              <Table.HeadCell className="w-32 text-center">
                Original Language
              </Table.HeadCell>
              <Table.HeadCell className="w-28 text-center">
                Relevance Score
              </Table.HeadCell>
              <Table.HeadCell className="w-12 text-center">
              </Table.HeadCell>
              <Table.HeadCell className="w-12 text-center">
              </Table.HeadCell>
              <Table.HeadCell className="w-12 text-center"></Table.HeadCell>
            </Table.Head>

            <Table.Body className="divide-y">
              {isLoading ? (
                <Table.Row>
                  <Table.Cell colSpan={9} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <Spinner size="xl" color="purple" />
                      <p className="mt-2 text-gray-500">Loading posts...</p>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : listData.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={9} className="text-center py-10">
                    <p className="text-gray-500">
                      No posts found. Try adjusting your filters.
                    </p>
                  </Table.Cell>
                </Table.Row>
              ) : (
                listData.map((item, index) => (
                  <Table.Row
                    key={item.id || index}
                    onClick={() => openPreviewModal?.(item)}
                    className="cursor-pointer"
                  >
                    <Table.Cell className="text-[#DD9A19] align-middle whitespace-nowrap">
                      {item.showDate}
                    </Table.Cell>
                    <Table.Cell className="text-center align-middle">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-black-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.platform}
                      </a>
                    </Table.Cell>
                    <Table.Cell className="text-center align-middle">
                      <div className="line-clamp-2 text-sm break-words">
                        {item.nickname}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="align-middle min-w-[450px] max-w-[600px]">
                      <div className="line-clamp-5 text-sm break-words">
                        {item.post}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-center align-middle">
                      <button
                        className="text-white text-xs bg-[#5D5FEF] shadow-sm w-[69px] h-[32px] justify-center items-center border rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal?.(item);
                        }}
                      >
                        Original
                      </button>
                    </Table.Cell>
                    <Table.Cell className="text-center align-middle">
                      {item.relvance}
                    </Table.Cell>
                    <Table.Cell className="text-center align-middle">
                      <Tooltip content={item.postCategory || "Null"} placement="top">
                          {item.postCategory
                            ? item.postCategory.charAt(0).toUpperCase()
                            : "Null"}
                      </Tooltip>
                    </Table.Cell>
                    <Table.Cell className="text-center align-middle">
                      <Tooltip content={item.sentiment} placement="top">
                        {item.sentiment === "Positive" ? (
                          <FaThumbsUp />
                        ) : item.sentiment === "Negative" ? (
                          <FaThumbsDown />
                        ) : (
                          <FaHandPaper />
                        )}
                      </Tooltip>
                    </Table.Cell>
                    <Table.Cell className="text-center align-middle whitespace-nowrap">
                      {item.hasCriticism && (
                        <Tooltip content="Has negative feedback" placement="top">
                          <span className="flex justify-center items-center cursor-pointer">
                            <FaCommentAlt />
                          </span>
                        </Tooltip>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>
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
              className={`bg-transparent text-white p-2 ${currentPage <= 1 || isLoading
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
              className={`bg-transparent text-white p-2 ${currentPage >= totalPages || isLoading
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
    </div>
  );
};

export default SharedPostTable;
