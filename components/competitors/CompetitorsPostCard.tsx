"use client";

import React, { useEffect } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";

interface ModelDataProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: {
    showDate: string;
    date: string;
    platform: string;
    nickname: string;
    post: string;
    taglist: string;
    relvance: number;
    sentiment: string;
    hasCriticism: boolean;
    title:string;
  };
}

const MyModal = ({ isOpen, onClose, rowData }: ModelDataProps) => {
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
            className="bg-white w-[648px] h-[845px] rounded-lg shadow-lg p-6 relative"
            onClick={(e) => e.stopPropagation()} // 防止点击内容区域关闭Modal
          >
            {/* Modal.Header */}
            <ModalHeader>{rowData.platform}</ModalHeader>

            {/* Modal.Body */}
            <ModalBody>
              {/* Title */}
              <p className="text-lg font-semibold mb-2">{rowData.title}</p>

              {/* Desc */}
              <p className="text-gray-500">{rowData.post}</p>

              {/* 空行 */}
              <div className="my-4"></div>

              {/* TagList */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  {rowData.taglist}
                </span>
              </div>

              {/* Nickname & Date */}
              <div className="flex justify-between text-sm text-gray-400 my-4">
                <span>{rowData.nickname}</span>
                <span>{rowData.date}</span>
              </div>
            </ModalBody>

            {/* Modal.Footer */}
            <Modal.Footer>
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

export default MyModal;
