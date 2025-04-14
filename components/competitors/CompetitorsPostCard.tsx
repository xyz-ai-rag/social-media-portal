"use client";

import React from "react";
import { Modal } from "flowbite-react";

interface ModelDataProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: {
    showDate?: string;
    date?: string;
    platform?: string;
    nickname?: string;
    post?: string;
    taglist?: string;
    relvance?: number;
    sentiment?: string;
    hasCriticism?: boolean;
    url?: string;
    [key: string]: any; // Allow for additional properties
  };
}

const PostCard = ({ isOpen, onClose, rowData }: ModelDataProps) => {
  // Handle case where rowData might be empty or undefined
  if (!rowData) return null;

  return (
    <>
      {isOpen && (
        <Modal
          show={isOpen}
          size="lg"
          onClose={onClose}
          theme={{
            root: {
              base: "fixed top-0 right-0 left-0 z-50 h-modal h-screen overflow-y-auto overflow-x-hidden md:inset-0 md:h-full",
              show: {
                on: "flex bg-opacity-50 backdrop-blur-sm dark:bg-opacity-80",
              },
            },
            header: {
              title:
                "text-[#5A6ACF] dark:text-white text-2xl font-bold text-center",
            },
          }}
        >
          {/* Modal */}
          <div
            className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal.Header */}
            <Modal.Header>{rowData.platform || "Post Details"}</Modal.Header>

            {/* Modal.Body */}
            <Modal.Body>
              {/* Post Content */}
              <p className="text-gray-700 mb-4">{rowData.post || "No content available"}</p>

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
            </Modal.Body>

            {/* Modal.Footer */}
            <Modal.Footer>
              {rowData.url && (
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

export default PostCard;