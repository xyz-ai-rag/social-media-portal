"use client";

import React, { ReactNode, useRef, useEffect } from "react";
import { Modal } from "flowbite-react";
import { PostData } from "./SharedPostList";

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
}

const PreviewModal = ({
  isOpen,
  onClose,
  rowData,
  headerTitle,
  additionalContent,
}: PreviewModalProps) => {
  // Handle case where rowData might be empty
  if (!rowData) return null;

  // Use the provided headerTitle or default to platform or fallback
  const title = headerTitle || rowData.platform || "Post Preview";

  // Modal content ref for detecting clicks outside the modal
  const modalContentRef = useRef<HTMLDivElement>(null);

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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
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
              inner: "relative rounded-lg bg-white shadow dark:bg-gray-700 flex flex-col max-h-[90vh]",
            },
            body: {
              base: "p-6 flex-1 overflow-auto",
            },
          }}
        >
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
              {additionalContent && (
                <div className="mb-4">{additionalContent}</div>
              )}

              {/* English Post Preview Content */}
              <p className="whitespace-pre-wrap text-gray-700 mb-4">
                {rowData.englishDesc || "No English post available."}
              </p>
            </Modal.Body>

            {/* Modal.Footer */}
            <Modal.Footer className="flex justify-end">
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

export default PreviewModal;
