"use client";

import React, { ReactNode, useRef, useEffect } from "react";
import { Modal, Spinner } from "flowbite-react";
import { PostData } from "./SharedPostList";

// Base interface for shared post data
export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: PostData & {
    clientId?: string;
    businessId?: string;
    competitorId?: string;
  };
  headerTitle?: string;
  additionalContent?: ReactNode;
  showCompetitiveInsights?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  isNavigating?: boolean; // NEW: Flag to show loading state during navigation
}

const PreviewModalNew = ({
  isOpen,
  onClose,
  rowData,
  headerTitle,
  additionalContent,
  showCompetitiveInsights = false,
  onPrevious,
  onNext,
  hasPrevious = true,
  hasNext = true,
  isNavigating = false, // NEW: Default to false
}: PreviewModalProps) => {
  // Handle case where rowData might be empty or undefined
  if (!rowData) return null;

  // Use platform name as default header if none provided
  const title = headerTitle || rowData.platform || "Post Preview";

  // Ref for the modal content
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Listen for clicks outside the modal to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalContentRef.current &&
        !modalContentRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onClose();
      }
    };

    // Add event listener when modal is open
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <Modal
          show={isOpen}
          size="2lg"
          onClose={onClose}
          position="center"
          theme={{
            root: {
              base: "fixed top-0 right-0 left-0 z-50 h-modal h-screen overflow-y-auto overflow-x-hidden md:inset-0 md:h-full flex justify-center items-center",
              show: {
                on: "flex bg-opacity-50 backdrop-blur-sm dark:bg-opacity-80",
              },
            },
            header: {
              title:
                "text-[#5A6ACF] dark:text-white text-2xl font-bold text-center",
            },
            content: {
              base: "relative w-full max-w-2xl p-4 mx-auto",
              inner:
                "relative rounded-lg bg-white shadow dark:bg-gray-700 flex flex-col max-h-[90vh]",
            },
            body: {
              base: "p-6 flex-1 overflow-auto",
            },
          }}
        >
          {/* Modal */}
          <div
            ref={modalContentRef}
            className="bg-white w-full rounded-lg shadow-lg flex flex-col relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh" }}
          >
            {/* Modal.Header */}
            <Modal.Header>{title}</Modal.Header>

            {/* Modal.Body */}
            <Modal.Body className="overflow-auto">
              {/* Optional leading content */}
              {additionalContent && (
                <div className="mb-4">{additionalContent}</div>
              )}

              {/* Post Title (if available) */}
              {rowData.englishTitle && (
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {rowData.englishTitle}
                </h3>
              )}

              {/* Post Content */}
              <p className="whitespace-pre-wrap text-gray-700 mb-4">
                {rowData.englishDesc || "No content available"}
              </p>

              {/* TagList */}
              {rowData.englishTagList && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {rowData.englishTagList.split(",").map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="flex justify-between text-sm text-gray-400 mt-6">
                <span>{rowData.nickname || "Anonymous"}</span>
                <span>
                  {rowData.showDate || rowData.date || "Unknown date"}
                </span>
              </div>

              {/* Negative Feedback Summary !!!!! Need Test */}
              {rowData.hasCriticism && rowData.criticismSummary && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-md font-medium text-red-700 mb-2">
                    Negative feedback or criticism:
                  </h3>
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {rowData.criticismSummary}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Sentiment
                    </p>
                    <p className="text-sm text-gray-900">
                      {rowData.sentiment || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Relevance Score
                    </p>
                    <p className="text-sm text-gray-900">
                      {rowData.relvance
                        ? `${rowData.relvance}%`
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Feedback
                    </p>
                    <p className="text-sm text-gray-900">
                      {rowData.hasCriticism !== undefined
                        ? rowData.hasCriticism
                          ? "Has negative feedback"
                          : "No negative feedback"
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Competitive Analysis Section - Only for competitor posts */}
              {showCompetitiveInsights && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-md font-medium text-gray-700 mb-2">
                    Competitive Insights
                  </h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600">
                      Compare this competitor post against your business's
                      social media strategy. Look for differences in approach,
                      messaging, and engagement.
                    </p>
                  </div>
                </div>
              )}
            </Modal.Body>

            {/* Modal.Footer with Navigation */}
            <Modal.Footer className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {rowData.url && rowData.url !== "#" && (
                  <a
                    href={rowData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5D5FEF] hover:underline"
                  >
                    View Original
                  </a>
                )}
              </div>

              <div className="flex items-center space-x-6">
                {/* Previous button */}
                <button
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    hasPrevious
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                  onClick={onPrevious}
                  disabled={!hasPrevious || isNavigating}
                  title="Previous post"
                >
                  {isNavigating ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Navigation status indicator */}
                <div className="text-xs text-gray-500 flex items-center min-w-20 justify-center">
                  {isNavigating ? "Loading..." : "Browse Posts"}
                </div>

                {/* Next button */}
                <button
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    hasNext
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                  onClick={onNext}
                  disabled={!hasNext || isNavigating}
                  title="Next post"
                >
                  {isNavigating ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </Modal.Footer>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PreviewModalNew;
