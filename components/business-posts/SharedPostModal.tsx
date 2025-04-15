"use client";

import React, { ReactNode } from "react";
import { Modal } from "flowbite-react";
import { PostData } from "./SharedPostList";

// Base interface for shared post data
export interface BasePostModalProps {
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
}

const SharedPostModal = ({
  isOpen,
  onClose,
  rowData,
  headerTitle,
  additionalContent,
  showCompetitiveInsights = false,
}: BasePostModalProps) => {
  // Handle case where rowData might be empty or undefined
  if (!rowData) return null;

  // Use platform name as default header if none provided
  const title = headerTitle || rowData.platform || "Post Details";

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
              inner: "relative rounded-lg bg-white shadow dark:bg-gray-700 flex flex-col max-h-[90vh]"
            },
            body: {
              base: "p-6 flex-1 overflow-auto"
            }
          }}
        >
          {/* Modal */}
          <div
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
              {rowData.title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{rowData.title}</h3>
              )}

              {/* Post Content */}
              <p className="text-gray-700 mb-4">{rowData.description || "No content available"}</p>

              {/* TagList */}
              {rowData.taglist && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {rowData.taglist.split(",").map((tag, index) => (
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
                <span>{rowData.showDate || rowData.date || "Unknown date"}</span>
              </div>
              
              {/* Additional Information */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sentiment</p>
                    <p className="text-sm text-gray-900">{rowData.sentiment || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Relevance</p>
                    <p className="text-sm text-gray-900">{rowData.relvance ? `${rowData.relvance}%` : "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Criticism</p>
                    <p className="text-sm text-gray-900">
                      {rowData.hasCriticism !== undefined ? 
                        (rowData.hasCriticism ? "Has criticism" : "No criticism") : 
                        "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Competitive Analysis Section - Only for competitor posts */}
              {showCompetitiveInsights && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-md font-medium text-gray-700 mb-2">Competitive Insights</h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600">
                      Compare this competitor post against your business's social media strategy. 
                      Look for differences in approach, messaging, and engagement.
                    </p>
                  </div>
                </div>
              )}
            </Modal.Body>

            {/* Modal.Footer */}
            <Modal.Footer>
              {rowData.url && rowData.url !== "#" && (
                <a 
                  href={rowData.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#5D5FEF] hover:underline mr-auto"
                >
                  View Original
                </a>
              )}
              <button
                className="bg-[#5D5FEF] text-white px-4 py-2 rounded"
                onClick={onClose}
              >
                Close
              </button>
            </Modal.Footer>
          </div>
        </Modal>
      )}
    </>
  );
};

export default SharedPostModal;